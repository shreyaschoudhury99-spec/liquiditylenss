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
app.use(express.json({ limit: "1mb" }));
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
    const message = "Too many Google/Microsoft sign-in attempts. Wait a minute, then try again.";
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
const oauthCookieMs = 10 * 60 * 1000;
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
  if (!user.password_hash) return error(res, 409, "This account uses social sign-in. Continue with Google or Microsoft.", "SOCIAL_ACCOUNT");
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
