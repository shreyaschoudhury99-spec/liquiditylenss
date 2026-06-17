import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import sgMail from "@sendgrid/mail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4174);
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-me";
const cookieSecret = process.env.COOKIE_SECRET || "dev-only-cookie-secret";
const accessTokenTtl = "24h";
const refreshTokenMs = 7 * 24 * 60 * 60 * 1000;
const resetTokenMs = 60 * 60 * 1000;
const mfaTokenMs = 10 * 60 * 1000;
const bcryptCost = 12;

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser(cookieSecret));

async function ensureSchema() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    two_factor_method TEXT CHECK (two_factor_method IN ('email', 'phone')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email_verified BOOLEAN NOT NULL DEFAULT false
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email))");
  await pool.query(`CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS password_reset_tokens_lookup_idx
    ON password_reset_tokens (token_hash, expires_at)
    WHERE used_at IS NULL`);
  await pool.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS refresh_tokens_lookup_idx
    ON refresh_tokens (token_hash, expires_at)
    WHERE revoked_at IS NULL`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sales_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    sale_date DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    location TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'csv',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, source, sku, sale_date, location)
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS sales_records_user_lookup_idx ON sales_records (user_id, sale_date DESC)");
  await pool.query(`CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('csv', 'shopify', 'square')),
    status TEXT NOT NULL CHECK (status IN ('connected', 'error', 'needs_reauth', 'not_connected')),
    detail TEXT NOT NULL,
    external_account TEXT,
    access_token_enc TEXT,
    refresh_token_enc TEXT,
    scopes TEXT,
    token_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
  )`);
  await pool.query("ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS access_token_enc TEXT");
  await pool.query("ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS refresh_token_enc TEXT");
  await pool.query("ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS scopes TEXT");
  await pool.query("ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method TEXT");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_two_factor_method_check");
  await pool.query("ALTER TABLE users ADD CONSTRAINT users_two_factor_method_check CHECK (two_factor_method IN ('email', 'phone'))");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS oauth_accounts_user_provider_idx ON oauth_accounts (user_id, provider)");
  await pool.query(`CREATE TABLE IF NOT EXISTS mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('email', 'phone')),
    destination TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('login', 'setup')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS mfa_challenges_lookup_idx
    ON mfa_challenges (id, expires_at)
    WHERE used_at IS NULL`);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later.", code: "RATE_LIMITED" },
});

const oauthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const message = "Too many social sign-in attempts. Wait a minute, then try again.";
    if (req.path.includes("/callback")) return res.redirect(`/login?error=${encodeURIComponent(message)}`);
    return error(res, 429, message, "RATE_LIMITED");
  },
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const normalizeEmail = email => String(email || "").trim().toLowerCase();
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = password => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password || "");
const isValidPhone = phone => /^\+?[1-9]\d{9,14}$/.test(String(phone || "").replace(/[\s().-]/g, ""));
const normalizePhone = phone => {
  const digits = String(phone || "").replace(/[\s().-]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
};
const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");
const oauthCookieName = "ll_oauth";
const integrationCookieName = "ll_integration_oauth";
const oauthCookieMs = 10 * 60 * 1000;
const encryptionKey = crypto.createHash("sha256").update(`${cookieSecret}:${jwtSecret}`).digest();
const safeRedirectPath = value => {
  const pathValue = String(value || "/dashboard");
  if (!pathValue.startsWith("/") || pathValue.startsWith("//") || pathValue.startsWith("/api/")) return "/dashboard";
  return pathValue;
};
const cookieOptions = maxAge => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  signed: true,
  maxAge,
  path: "/",
});

function encryptSecret(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSecret(value) {
  if (!value) return "";
  const [ivRaw, tagRaw, encryptedRaw] = String(value).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorMethod: row.two_factor_method,
    emailVerified: row.email_verified,
  };
}

const userColumns = "id, email, password_hash, first_name, last_name, phone, two_factor_enabled, two_factor_method, email_verified";
const publicUserColumns = "id, email, first_name, last_name, phone, two_factor_enabled, two_factor_method, email_verified";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
    jwtSecret,
    { algorithm: "HS256", expiresIn: accessTokenTtl }
  );
}

async function issueRefreshToken(res, userId) {
  const token = crypto.randomBytes(48).toString("base64url");
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(token), new Date(Date.now() + refreshTokenMs)]
  );
  res.cookie("ll_refresh", token, {
    ...cookieOptions(refreshTokenMs),
  });
}

async function completeLogin(res, user) {
  if (user.two_factor_enabled && user.two_factor_method) {
    const challenge = await createMfaChallenge(user, "login");
    return res.json({ mfaRequired: true, ...challenge });
  }
  await issueRefreshToken(res, user.id);
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}

async function finishMfaLogin(res, user) {
  await issueRefreshToken(res, user.id);
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}

function maskedDestination(value, method) {
  if (!value) return "";
  if (method === "phone") return value.replace(/\d(?=\d{4})/g, "*");
  const [name, domain] = value.split("@");
  return `${name.slice(0, 2)}***@${domain || ""}`;
}

async function sendMfaCode({ method, destination, code }) {
  if (method === "email") {
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: destination,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Your LiquidityLens verification code",
        text: `Your LiquidityLens verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your LiquidityLens verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      });
    } else {
      console.info(`LiquidityLens email 2FA code for ${destination}: ${code}`);
    }
    return;
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_PHONE) {
    const body = new URLSearchParams({
      To: destination,
      From: process.env.TWILIO_FROM_PHONE,
      Body: `Your LiquidityLens verification code is ${code}. It expires in 10 minutes.`,
    });
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error("Could not send SMS verification code.");
  } else {
    console.info(`LiquidityLens phone 2FA code for ${destination}: ${code}`);
  }
}

async function createMfaChallenge(user, purpose, override = {}) {
  const method = override.method || user.two_factor_method;
  const destination = method === "phone" ? (override.phone || user.phone) : user.email;
  if (method === "phone" && !destination) throw new Error("Add a phone number before enabling phone 2FA.");
  const code = String(crypto.randomInt(100000, 1000000));
  const result = await pool.query(
    `INSERT INTO mfa_challenges (user_id, code_hash, method, destination, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, method, destination`,
    [user.id, hashToken(code), method, destination, purpose, new Date(Date.now() + mfaTokenMs)]
  );
  await sendMfaCode({ method, destination, code });
  const challenge = result.rows[0];
  return {
    challengeId: challenge.id,
    method: challenge.method,
    destination: maskedDestination(challenge.destination, challenge.method),
  };
}

async function verifyMfaChallenge({ challengeId, code, userId, purpose }) {
  const result = await pool.query(
    `SELECT mc.id, mc.user_id, mc.code_hash, mc.method, mc.destination, u.${publicUserColumns.replaceAll(", ", ", u.")}
     FROM mfa_challenges mc
     JOIN users u ON u.id = mc.user_id
     WHERE mc.id = $1 AND mc.purpose = $2 AND mc.used_at IS NULL AND mc.expires_at > now()`,
    [challengeId, purpose]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (userId && row.user_id !== userId) return null;
  if (row.code_hash !== hashToken(String(code || "").trim())) return null;
  await pool.query("UPDATE mfa_challenges SET used_at = now() WHERE id = $1", [challengeId]);
  return row;
}

function error(res, status, message, code) {
  return res.status(status).json({ error: message, code });
}

function isDatabaseConnectionError(err) {
  return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(err?.code);
}

function authUser(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return error(res, 401, "Sign in required.", "AUTH_REQUIRED");
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return error(res, 401, "Session expired. Sign in again.", "SESSION_EXPIRED");
  }
}

const integrationProviders = {
  csv: {
    label: "CSV upload",
    defaultStatus: "not_connected",
    defaultDetail: "Upload a sales CSV to populate forecasts.",
  },
  shopify: {
    label: "Shopify",
    defaultStatus: "not_connected",
    defaultDetail: "Shopify OAuth is not configured yet. Add Shopify app credentials before connecting.",
  },
  square: {
    label: "Square",
    defaultStatus: "not_connected",
    defaultDetail: "Square OAuth is not configured yet. Add Square app credentials before connecting.",
  },
};

function normalizedSaleRecord(raw) {
  const sku = String(raw?.sku || "").trim();
  const location = String(raw?.location || "").trim();
  const quantity = Number(raw?.quantity);
  const dateValue = String(raw?.date || "").trim();
  const saleDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : "";
  const errors = [];

  if (!sku) errors.push("SKU is required.");
  if (!saleDate || Number.isNaN(Date.parse(`${saleDate}T00:00:00Z`))) errors.push("Date must be YYYY-MM-DD.");
  if (!Number.isFinite(quantity) || quantity < 0) errors.push("Quantity sold must be a non-negative number.");
  if (!location) errors.push("Location is required.");

  return { sku, date: saleDate, quantity, location, errors };
}

function connectionStatus(provider, row, csvCount = 0) {
  const defaults = integrationProviders[provider];
  if (provider === "csv" && !row && csvCount > 0) {
    return {
      provider,
      label: defaults.label,
      status: "connected",
      detail: `${csvCount} sales rows imported.`,
      lastSyncedAt: null,
      externalAccount: null,
    };
  }
  return {
    provider,
    label: defaults.label,
    status: row?.status || defaults.defaultStatus,
    detail: row?.detail || defaults.defaultDetail,
    lastSyncedAt: row?.last_synced_at || null,
    externalAccount: row?.external_account || null,
  };
}

async function integrationStatuses(userId) {
  const [connections, salesCount] = await Promise.all([
    pool.query("SELECT provider, status, detail, external_account, last_synced_at FROM integration_connections WHERE user_id = $1", [userId]),
    pool.query("SELECT count(*)::int AS count FROM sales_records WHERE user_id = $1", [userId]),
  ]);
  const rows = new Map(connections.rows.map(row => [row.provider, row]));
  const count = salesCount.rows[0]?.count || 0;
  return Object.keys(integrationProviders).map(provider => connectionStatus(provider, rows.get(provider), count));
}

async function upsertIntegration(userId, provider, { status, detail, externalAccount = null, synced = false }) {
  const result = await pool.query(
    `INSERT INTO integration_connections (user_id, provider, status, detail, external_account, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $6 THEN now() ELSE NULL END)
     ON CONFLICT (user_id, provider) DO UPDATE
     SET status = EXCLUDED.status,
         detail = EXCLUDED.detail,
         external_account = COALESCE(EXCLUDED.external_account, integration_connections.external_account),
         last_synced_at = CASE WHEN $6 THEN now() ELSE integration_connections.last_synced_at END,
         updated_at = now()
     RETURNING provider, status, detail, external_account, last_synced_at`,
    [userId, provider, status, detail, externalAccount, synced]
  );
  return connectionStatus(provider, result.rows[0]);
}

async function saveIntegrationToken(userId, provider, { accessToken, refreshToken = null, scopes = "", expiresAt = null, externalAccount, detail }) {
  const result = await pool.query(
    `INSERT INTO integration_connections
       (user_id, provider, status, detail, external_account, access_token_enc, refresh_token_enc, scopes, token_expires_at, last_synced_at)
     VALUES ($1, $2, 'connected', $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (user_id, provider) DO UPDATE
     SET status = 'connected',
         detail = EXCLUDED.detail,
         external_account = EXCLUDED.external_account,
         access_token_enc = EXCLUDED.access_token_enc,
         refresh_token_enc = EXCLUDED.refresh_token_enc,
         scopes = EXCLUDED.scopes,
         token_expires_at = EXCLUDED.token_expires_at,
         last_synced_at = now(),
         updated_at = now()
     RETURNING provider, status, detail, external_account, last_synced_at`,
    [userId, provider, detail, externalAccount, encryptSecret(accessToken), encryptSecret(refreshToken), scopes, expiresAt]
  );
  return connectionStatus(provider, result.rows[0]);
}

function normalizeShopDomain(value) {
  let shop = String(value || "").trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (shop && !shop.endsWith(".myshopify.com")) shop = `${shop}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

function verifyShopifyHmac(query, secret) {
  const hmac = String(query.hmac || "");
  if (!hmac || !secret) return false;
  const pairs = Object.entries(query)
    .filter(([key]) => !["hmac", "signature"].includes(key))
    .flatMap(([key, value]) => Array.isArray(value) ? value.map(v => [key, v]) : [[key, value]])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`);
  const digest = crypto.createHmac("sha256", secret).update(pairs.join("&")).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

async function shopifyApi(shop, accessToken, resource, params = {}) {
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2026-04";
  const url = new URL(`https://${shop}/admin/api/${apiVersion}/${resource}.json`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (response.status === 401 || response.status === 403) {
    const err = new Error("Shopify needs to be reconnected. Please reconnect this store.");
    err.code = "SHOPIFY_REAUTH_REQUIRED";
    throw err;
  }
  if (response.status === 429) {
    const err = new Error("Shopify rate limit reached. Wait a minute and try Sync again.");
    err.code = "SHOPIFY_RATE_LIMITED";
    throw err;
  }
  if (!response.ok) {
    const err = new Error(data.errors || data.error || "Shopify request failed.");
    err.code = "SHOPIFY_API_ERROR";
    throw err;
  }
  return data;
}

async function syncShopifyOrders(userId, shop, accessToken) {
  const locations = await shopifyApi(shop, accessToken, "locations", { limit: "250" }).catch(() => ({ locations: [] }));
  const locationById = new Map((locations.locations || []).map(location => [String(location.id), location.name || shop]));
  const ordersData = await shopifyApi(shop, accessToken, "orders", {
    status: "any",
    limit: "250",
    fields: "id,created_at,line_items,location_id",
  });
  const orders = ordersData.orders || [];
  const totals = new Map();
  await pool.query("BEGIN");
  try {
    for (const order of orders) {
      const saleDate = String(order.created_at || "").slice(0, 10);
      const location = locationById.get(String(order.location_id)) || shop;
      for (const item of order.line_items || []) {
        const sku = String(item.sku || item.name || `shopify-line-item-${item.id}`).trim();
        const quantity = Number(item.quantity || 0);
        if (!saleDate || !sku || !Number.isFinite(quantity) || quantity < 0) continue;
        const key = `${sku}\u0000${saleDate}\u0000${location}`;
        totals.set(key, (totals.get(key) || 0) + quantity);
      }
    }
    for (const [key, quantity] of totals) {
      const [sku, saleDate, location] = key.split("\u0000");
      await pool.query(
        `INSERT INTO sales_records (user_id, sku, sale_date, quantity, location, source)
         VALUES ($1, $2, $3, $4, $5, 'shopify')
         ON CONFLICT (user_id, source, sku, sale_date, location) DO UPDATE
         SET quantity = EXCLUDED.quantity,
             updated_at = now()`,
        [userId, sku, saleDate, quantity, location]
      );
    }
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
  return { orders: orders.length, rows: totals.size };
}

app.post("/api/auth/signup", authLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  const { password, confirmPassword } = req.body;

  if (!firstName || !lastName) return error(res, 400, "First and last name are required.", "NAME_REQUIRED");
  if (!isValidEmail(email)) return error(res, 400, "Enter a valid email address.", "INVALID_EMAIL");
  if (!isStrongPassword(password)) return error(res, 400, "Password must be at least 8 characters with uppercase, number, and special character.", "WEAK_PASSWORD");
  if (password !== confirmPassword) return error(res, 400, "Passwords do not match.", "PASSWORD_MISMATCH");

  const passwordHash = await bcrypt.hash(password, bcryptCost);
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING ${publicUserColumns}`,
      [email, passwordHash, firstName, lastName]
    );
    await completeLogin(res, result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return error(res, 409, "An account with this email already exists.", "EMAIL_EXISTS");
    throw err;
  }
}));

app.post("/api/auth/signin", authLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  if (!isValidEmail(email)) return error(res, 400, "Enter a valid email address.", "INVALID_EMAIL");
  const result = await pool.query(
    `SELECT ${userColumns} FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user) return error(res, 404, "No account exists for that email.", "EMAIL_NOT_FOUND");
  if (!user.password_hash) return error(res, 409, "This account uses social sign-in. Continue with Google.", "SOCIAL_ACCOUNT");
  if (!(await bcrypt.compare(password, user.password_hash))) return error(res, 401, "The password is incorrect.", "WRONG_PASSWORD");
  await completeLogin(res, user);
}));

app.post("/api/auth/refresh", asyncRoute(async (req, res) => {
  const token = req.signedCookies.ll_refresh;
  if (!token) return error(res, 401, "Session expired.", "SESSION_EXPIRED");
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.two_factor_enabled, u.two_factor_method, u.email_verified
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()`,
    [hashToken(token)]
  );
  const user = result.rows[0];
  if (!user) return error(res, 401, "Session expired.", "SESSION_EXPIRED");
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}));

app.post("/api/auth/signout", asyncRoute(async (req, res) => {
  const token = req.signedCookies.ll_refresh;
  if (token) {
    await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [hashToken(token)]);
  }
  res.clearCookie("ll_refresh", { path: "/", signed: true });
  res.json({ ok: true });
}));

app.patch("/api/auth/profile", authUser, asyncRoute(async (req, res) => {
  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  if (!firstName || !lastName) return error(res, 400, "First and last name are required.", "NAME_REQUIRED");

  const result = await pool.query(
    `UPDATE users
     SET first_name = $1, last_name = $2
     WHERE id = $3
     RETURNING ${publicUserColumns}`,
    [firstName, lastName, req.user.sub]
  );
  const user = result.rows[0];
  if (!user) return error(res, 404, "Account not found.", "USER_NOT_FOUND");
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}));

app.post("/api/auth/change-password", authUser, authLimiter, asyncRoute(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const { password, confirmPassword } = req.body;
  if (!isStrongPassword(password)) return error(res, 400, "Password must be at least 8 characters with uppercase, number, and special character.", "WEAK_PASSWORD");
  if (password !== confirmPassword) return error(res, 400, "Passwords do not match.", "PASSWORD_MISMATCH");

  const result = await pool.query("SELECT id, password_hash FROM users WHERE id = $1", [req.user.sub]);
  const user = result.rows[0];
  if (!user) return error(res, 404, "Account not found.", "USER_NOT_FOUND");
  if (!user.password_hash) return error(res, 409, "This account uses social sign-in and does not have a password yet.", "SOCIAL_ACCOUNT");
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) return error(res, 401, "Current password is incorrect.", "WRONG_PASSWORD");

  const passwordHash = await bcrypt.hash(password, bcryptCost);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.user.sub]);
  await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [req.user.sub]);
  res.clearCookie("ll_refresh", { path: "/", signed: true });
  res.json({ ok: true });
}));

app.post("/api/auth/mfa/verify", authLimiter, asyncRoute(async (req, res) => {
  const challengeId = String(req.body.challengeId || "");
  const code = String(req.body.code || "");
  if (!challengeId || !/^\d{6}$/.test(code.trim())) return error(res, 400, "Enter the 6-digit verification code.", "INVALID_MFA_CODE");
  const user = await verifyMfaChallenge({ challengeId, code, purpose: "login" });
  if (!user) return error(res, 401, "Verification code is invalid or expired.", "INVALID_MFA_CODE");
  await finishMfaLogin(res, user);
}));

app.post("/api/auth/mfa/setup/start", authUser, authLimiter, asyncRoute(async (req, res) => {
  const method = String(req.body.method || "");
  const phone = normalizePhone(req.body.phone);
  if (!["email", "phone"].includes(method)) return error(res, 400, "Choose email or phone verification.", "INVALID_MFA_METHOD");
  if (method === "phone" && !isValidPhone(phone)) return error(res, 400, "Enter a valid phone number with country code.", "INVALID_PHONE");

  const result = await pool.query(`SELECT ${publicUserColumns} FROM users WHERE id = $1`, [req.user.sub]);
  const user = result.rows[0];
  if (!user) return error(res, 404, "Account not found.", "USER_NOT_FOUND");
  const challenge = await createMfaChallenge(user, "setup", { method, phone });
  res.json(challenge);
}));

app.post("/api/auth/mfa/setup/confirm", authUser, authLimiter, asyncRoute(async (req, res) => {
  const challengeId = String(req.body.challengeId || "");
  const code = String(req.body.code || "");
  if (!challengeId || !/^\d{6}$/.test(code.trim())) return error(res, 400, "Enter the 6-digit verification code.", "INVALID_MFA_CODE");

  const challenge = await verifyMfaChallenge({ challengeId, code, userId: req.user.sub, purpose: "setup" });
  if (!challenge) return error(res, 401, "Verification code is invalid or expired.", "INVALID_MFA_CODE");

  const result = await pool.query(
    `UPDATE users
     SET phone = CASE WHEN $1 = 'phone' THEN $2 ELSE phone END,
         two_factor_enabled = true,
         two_factor_method = $1
     WHERE id = $3
     RETURNING ${publicUserColumns}`,
    [challenge.method, challenge.destination, req.user.sub]
  );
  const user = result.rows[0];
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}));

app.post("/api/auth/mfa/disable", authUser, authLimiter, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE users
     SET two_factor_enabled = false, two_factor_method = NULL
     WHERE id = $1
     RETURNING ${publicUserColumns}`,
    [req.user.sub]
  );
  const user = result.rows[0];
  if (!user) return error(res, 404, "Account not found.", "USER_NOT_FOUND");
  res.json({ token: signAccessToken(user), user: publicUser(user) });
}));

app.get("/api/auth/status", (_req, res) => {
  res.json({
    ok: true,
    providers: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    },
  });
});

app.post("/api/auth/forgot-password", authLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const result = await pool.query("SELECT id, email, first_name FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, hashToken(token), new Date(Date.now() + resetTokenMs)]
    );
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Reset your LiquidityLens password",
        text: `Hi ${user.first_name}, reset your password here: ${resetUrl}`,
        html: `<p>Hi ${user.first_name},</p><p><a href="${resetUrl}">Reset your LiquidityLens password</a>. This link expires in 1 hour.</p>`,
      });
    } else {
      console.info(`Password reset link for ${user.email}: ${resetUrl}`);
    }
  }
  res.json({ ok: true });
}));

app.post("/api/auth/reset-password", authLimiter, asyncRoute(async (req, res) => {
  const token = String(req.body.token || "");
  const { password, confirmPassword } = req.body;
  if (!token) return error(res, 400, "Reset token is required.", "TOKEN_REQUIRED");
  if (!isStrongPassword(password)) return error(res, 400, "Password must be at least 8 characters with uppercase, number, and special character.", "WEAK_PASSWORD");
  if (password !== confirmPassword) return error(res, 400, "Passwords do not match.", "PASSWORD_MISMATCH");

  const result = await pool.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hashToken(token)]
  );
  const reset = result.rows[0];
  if (!reset) return error(res, 400, "Reset link is invalid or expired.", "INVALID_RESET_TOKEN");

  const passwordHash = await bcrypt.hash(password, bcryptCost);
  await pool.query("BEGIN");
  try {
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.user_id]);
    await pool.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [reset.id]);
    await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [reset.user_id]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
  res.json({ ok: true });
}));

app.get("/api/integrations/status", authUser, asyncRoute(async (req, res) => {
  res.json({ providers: await integrationStatuses(req.user.sub) });
}));

app.get("/api/integrations/sales", authUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, sku, sale_date AS date, quantity::float AS quantity, location, source, updated_at
     FROM sales_records
     WHERE user_id = $1
     ORDER BY sale_date DESC, sku ASC
     LIMIT 5000`,
    [req.user.sub]
  );
  res.json({ records: result.rows });
}));

app.post("/api/integrations/csv", authUser, asyncRoute(async (req, res) => {
  const rawRecords = Array.isArray(req.body.records) ? req.body.records : [];
  if (!rawRecords.length) return error(res, 400, "Upload a CSV with at least one valid sales row.", "NO_RECORDS");
  if (rawRecords.length > 10000) return error(res, 413, "Upload 10,000 rows or fewer at a time.", "CSV_TOO_LARGE");

  const records = rawRecords.map((record, index) => ({ ...normalizedSaleRecord(record), row: index + 2 }));
  const invalid = records.filter(record => record.errors.length);
  if (invalid.length) {
    return res.status(400).json({
      error: "Some CSV rows are malformed. Fix them and upload again.",
      code: "CSV_VALIDATION_FAILED",
      rows: invalid.slice(0, 25).map(({ row, errors }) => ({ row, errors })),
    });
  }

  await pool.query("BEGIN");
  try {
    for (const record of records) {
      await pool.query(
        `INSERT INTO sales_records (user_id, sku, sale_date, quantity, location, source)
         VALUES ($1, $2, $3, $4, $5, 'csv')
         ON CONFLICT (user_id, source, sku, sale_date, location) DO UPDATE
         SET quantity = EXCLUDED.quantity,
             updated_at = now()`,
        [req.user.sub, record.sku, record.date, record.quantity, record.location]
      );
    }
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }

  const countResult = await pool.query("SELECT count(*)::int AS count FROM sales_records WHERE user_id = $1", [req.user.sub]);
  const total = countResult.rows[0]?.count || records.length;
  const status = await upsertIntegration(req.user.sub, "csv", {
    status: "connected",
    detail: `${total} sales rows imported. Last upload processed ${records.length} rows without duplicates.`,
    synced: true,
  });
  res.json({ ok: true, imported: records.length, total, status });
}));

app.post("/api/integrations/shopify/start", authUser, oauthLimiter, asyncRoute(async (req, res) => {
  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    return error(res, 503, "Shopify OAuth is not configured. Add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.", "SHOPIFY_NOT_CONFIGURED");
  }
  const shop = normalizeShopDomain(req.body.shop);
  if (!shop) return error(res, 400, "Enter a valid Shopify store domain, like your-store.myshopify.com.", "INVALID_SHOPIFY_SHOP");

  const state = crypto.randomBytes(24).toString("base64url");
  const redirectTo = safeRedirectPath(req.body.redirectTo || "/connect");
  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,read_products,read_inventory,read_locations";
  const redirectUri = `${appBaseUrl}/api/integrations/shopify/callback`;
  res.cookie(integrationCookieName, JSON.stringify({ provider: "shopify", state, userId: req.user.sub, shop, redirectTo }), cookieOptions(oauthCookieMs));

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  res.json({ url: url.toString() });
}));

app.get("/api/integrations/shopify/callback", oauthLimiter, asyncRoute(async (req, res) => {
  const redirectWithMessage = message => res.redirect(`/connect?integrationMessage=${encodeURIComponent(message)}`);
  if (req.query.error) return redirectWithMessage(req.query.error_description || "Shopify connection was cancelled.");
  const cookie = req.signedCookies[integrationCookieName];
  if (!cookie) return redirectWithMessage("Shopify connection expired. Please try again.");

  let stored;
  try {
    stored = JSON.parse(cookie);
  } catch {
    return redirectWithMessage("Shopify connection state was invalid. Please try again.");
  }
  res.clearCookie(integrationCookieName, { path: "/", signed: true });
  const shop = normalizeShopDomain(req.query.shop);
  if (stored.provider !== "shopify" || stored.state !== req.query.state || stored.shop !== shop) {
    return redirectWithMessage("Shopify security check failed. Please try again.");
  }
  if (!verifyShopifyHmac(req.query, process.env.SHOPIFY_CLIENT_SECRET)) {
    return redirectWithMessage("Shopify could not verify this connection. Please try again.");
  }

  const tokenSet = await fetchJson(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code: String(req.query.code || ""),
    }),
  });
  const scopes = tokenSet.scope || process.env.SHOPIFY_SCOPES || "";
  await saveIntegrationToken(stored.userId, "shopify", {
    accessToken: tokenSet.access_token,
    scopes,
    externalAccount: shop,
    detail: `Connected to ${shop}. Sync orders to populate forecasts.`,
  });
  try {
    const synced = await syncShopifyOrders(stored.userId, shop, tokenSet.access_token);
    await upsertIntegration(stored.userId, "shopify", {
      status: "connected",
      detail: `Connected to ${shop}. Synced ${synced.rows} sales rows from ${synced.orders} orders.`,
      externalAccount: shop,
      synced: true,
    });
  } catch (err) {
    await upsertIntegration(stored.userId, "shopify", {
      status: err.code === "SHOPIFY_REAUTH_REQUIRED" ? "needs_reauth" : "error",
      detail: err.message,
      externalAccount: shop,
    });
  }
  res.redirect(safeRedirectPath(stored.redirectTo));
}));

app.post("/api/integrations/:provider/sync", authUser, asyncRoute(async (req, res) => {
  const provider = String(req.params.provider || "");
  if (!integrationProviders[provider]) return error(res, 404, "Unknown integration provider.", "UNKNOWN_PROVIDER");

  if (provider === "csv") {
    const countResult = await pool.query("SELECT count(*)::int AS count FROM sales_records WHERE user_id = $1", [req.user.sub]);
    const count = countResult.rows[0]?.count || 0;
    if (!count) {
      const status = await upsertIntegration(req.user.sub, "csv", {
        status: "not_connected",
        detail: "Upload a sales CSV before syncing CSV data.",
      });
      return res.status(409).json({ error: status.detail, code: "CSV_NOT_IMPORTED", status });
    }
    const status = await upsertIntegration(req.user.sub, "csv", {
      status: "connected",
      detail: `${count} sales rows are available for forecasting.`,
      synced: true,
    });
    return res.json({ ok: true, status });
  }

  if (provider === "shopify") {
    const result = await pool.query(
      "SELECT external_account, access_token_enc FROM integration_connections WHERE user_id = $1 AND provider = 'shopify'",
      [req.user.sub]
    );
    const connection = result.rows[0];
    if (!connection?.access_token_enc || !connection.external_account) {
      const status = await upsertIntegration(req.user.sub, "shopify", {
        status: "needs_reauth",
        detail: "Connect Shopify before syncing orders.",
      });
      return res.status(409).json({ error: status.detail, code: "SHOPIFY_NOT_CONNECTED", status });
    }
    try {
      const synced = await syncShopifyOrders(req.user.sub, connection.external_account, decryptSecret(connection.access_token_enc));
      const status = await upsertIntegration(req.user.sub, "shopify", {
        status: "connected",
        detail: `Synced ${synced.rows} sales rows from ${synced.orders} Shopify orders.`,
        externalAccount: connection.external_account,
        synced: true,
      });
      return res.json({ ok: true, status, synced });
    } catch (err) {
      const status = await upsertIntegration(req.user.sub, "shopify", {
        status: err.code === "SHOPIFY_REAUTH_REQUIRED" ? "needs_reauth" : "error",
        detail: err.message,
        externalAccount: connection.external_account,
      });
      return res.status(err.code === "SHOPIFY_RATE_LIMITED" ? 429 : 502).json({ error: err.message, code: err.code || "SHOPIFY_SYNC_FAILED", status });
    }
  }

  const envPrefix = provider.toUpperCase();
  const configured = Boolean(process.env[`${envPrefix}_CLIENT_ID`] && process.env[`${envPrefix}_CLIENT_SECRET`]);
  const detail = configured
    ? `${integrationProviders[provider].label} OAuth credentials are present, but the live Admin API sync worker has not been enabled in this build yet.`
    : `${integrationProviders[provider].label} OAuth is not configured yet. Add ${envPrefix}_CLIENT_ID and ${envPrefix}_CLIENT_SECRET, then deploy again.`;
  const status = await upsertIntegration(req.user.sub, provider, {
    status: configured ? "needs_reauth" : "error",
    detail,
  });
  res.status(501).json({ error: detail, code: configured ? "SYNC_NOT_ENABLED" : "PROVIDER_NOT_CONFIGURED", status });
}));

async function upsertOAuthUser({ provider, providerId, email, firstName, lastName, emailVerified }) {
  const linked = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.two_factor_enabled, u.two_factor_method, u.email_verified
     FROM oauth_accounts oa
     JOIN users u ON u.id = oa.user_id
     WHERE oa.provider = $1 AND oa.provider_account_id = $2`,
    [provider, providerId]
  );
  if (linked.rows[0]) return linked.rows[0];

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new Error("OAuth provider did not return a valid email.");

  await pool.query("BEGIN");
  try {
    const userResult = await pool.query(
      `INSERT INTO users (email, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email_verified = users.email_verified OR EXCLUDED.email_verified
       RETURNING ${publicUserColumns}`,
      [normalizedEmail, firstName || "Retail", lastName || "User", Boolean(emailVerified)]
    );
    const user = userResult.rows[0];
    await pool.query(
      "INSERT INTO oauth_accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [user.id, provider, providerId]
    );
    await pool.query("COMMIT");
    return user;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

const oauthProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
    scope: "openid email profile User.Read",
  },
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data.error_description || data.error || "OAuth provider request failed.";
    throw new Error(message);
  }
  return data;
}

async function oauthProfile(provider, tokenSet) {
  const cfg = oauthProviders[provider];
  const claims = tokenSet.id_token?.split(".")[1] ? JSON.parse(Buffer.from(tokenSet.id_token.split(".")[1], "base64url").toString("utf8")) : {};
  let info = {};
  if (tokenSet.access_token) {
    try {
      info = await fetchJson(cfg.userInfoUrl, { headers: { Authorization: `Bearer ${tokenSet.access_token}` } });
    } catch (err) {
      console.warn(`${provider} userinfo failed, falling back to ID token claims:`, err.message);
    }
  }
  const source = { ...claims, ...info };
  const email = source.email || source.preferred_username || source.upn;
  const displayName = source.name || "";
  return {
    providerId: source.sub || source.oid || source.id,
    email,
    firstName: source.given_name || displayName.split(" ")[0],
    lastName: source.family_name || displayName.split(" ").slice(1).join(" "),
    emailVerified: source.email_verified !== false,
  };
}

for (const provider of Object.keys(oauthProviders)) {
  app.get(`/api/auth/oauth/${provider}`, oauthLimiter, (req, res) => {
    const cfg = oauthProviders[provider];
    if (!cfg.clientId || !cfg.clientSecret) return error(res, 503, `${provider} OAuth is not configured.`, "OAUTH_NOT_CONFIGURED");

    const state = crypto.randomBytes(24).toString("base64url");
    const verifier = crypto.randomBytes(64).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const redirectTo = safeRedirectPath(req.query.redirectTo);
    const redirectUri = `${appBaseUrl}/api/auth/oauth/${provider}/callback`;

    res.cookie(oauthCookieName, JSON.stringify({ provider, state, verifier, redirectTo }), cookieOptions(oauthCookieMs));
    const url = new URL(cfg.authUrl);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");
    res.redirect(url.toString());
  });

  app.get(`/api/auth/oauth/${provider}/callback`, oauthLimiter, asyncRoute(async (req, res) => {
    const redirectToLogin = message => res.redirect(`/login?error=${encodeURIComponent(message)}`);
    if (req.query.error) return redirectToLogin(req.query.error_description || "OAuth sign-in was cancelled.");
    const cookie = req.signedCookies[oauthCookieName];
    if (!cookie) return redirectToLogin("OAuth session expired. Please try again.");

    let stored;
    try {
      stored = JSON.parse(cookie);
    } catch {
      return redirectToLogin("OAuth session was invalid. Please try again.");
    }
    res.clearCookie(oauthCookieName, { path: "/", signed: true });

    if (stored.provider !== provider || stored.state !== req.query.state) {
      return redirectToLogin("OAuth security check failed. Please try again.");
    }

    const cfg = oauthProviders[provider];
    const redirectUri = `${appBaseUrl}/api/auth/oauth/${provider}/callback`;
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code: String(req.query.code || ""),
      code_verifier: stored.verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const tokenSet = await fetchJson(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const profile = await oauthProfile(provider, tokenSet);
    if (!profile.providerId) return redirectToLogin("OAuth provider did not return an account ID.");
    const user = await upsertOAuthUser({ provider, ...profile });
    if (user.two_factor_enabled && user.two_factor_method) {
      const challenge = await createMfaChallenge(user, "login");
      const params = new URLSearchParams({
        mfa: challenge.challengeId,
        method: challenge.method,
        destination: challenge.destination,
        redirectTo: safeRedirectPath(stored.redirectTo),
      });
      return res.redirect(`/login?${params.toString()}`);
    }
    await issueRefreshToken(res, user.id);
    res.redirect(safeRedirectPath(stored.redirectTo));
  }));
}

function metaForPath(pathname) {
  const pages = {
    "/": ["LiquidityLens | Inventory Intelligence", "Forecast demand, detect stockout risk, and coordinate inventory transfers from a single retail operations workspace."],
    "/dashboard": ["LiquidityLens Dashboard", "Inventory risk score, revenue exposure, and SKU recommendations for retail operators."],
    "/connect": ["Connect Store | LiquidityLens", "Connect POS, ERP, or CSV inventory data to start forecasting."],
    "/forecasts": ["Forecasts | LiquidityLens", "Demand forecasts with confidence bands and model comparison."],
    "/inventory": ["Inventory | LiquidityLens", "SKU-level buy, sell, hold, and transfer recommendations."],
    "/marketplace": ["Marketplace | LiquidityLens", "Find nearby retailers with matching inventory excess or shortage signals."],
    "/community": ["Community | LiquidityLens", "Coordinate markdowns, delivery routes, and bulk buys with retail peers."],
    "/reports": ["Reports | LiquidityLens", "Executive inventory health reports for finance and operations teams."],
    "/profile": ["Profile | LiquidityLens", "Manage your LiquidityLens account profile, password, and active session."],
    "/login": ["Sign In | LiquidityLens", "Secure access to LiquidityLens inventory intelligence."],
  };
  return pages[pathname] || pages["/"];
}

function renderShell(req) {
  const [title, description] = metaForPath(req.path);
  const canonical = `${appBaseUrl}${req.path === "/" ? "/" : req.path}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${canonical}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=8" />
  </head>
  <body>
    <div id="toastRoot" class="toast-container" aria-live="polite"></div>
    <div id="modalRoot"></div>
    <div id="app"><main class="ssr-fallback"><h1>${title.replace(" | LiquidityLens", "")}</h1><p>${description}</p><ul><li>SKU-level demand forecasts</li><li>Stockout and overstock risk signals</li><li>Transfer marketplace and executive reports</li></ul></main></div>
    <script src="/app.js?v=8"></script>
  </body>
</html>`;
}

app.use(express.static(__dirname));
app.get("*", (req, res) => res.send(renderShell(req)));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({
      error: "The database is not reachable. Start Postgres, create the liquiditylens database, and run db/schema.sql.",
      code: "DATABASE_UNAVAILABLE",
    });
  }
  res.status(500).json({ error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
});

ensureSchema()
  .catch(err => console.error("Database schema setup failed:", err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`LiquidityLens running at ${appBaseUrl}`);
    });
  });
