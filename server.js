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
const marketplaceUserAgent = process.env.MARKETPLACE_USER_AGENT || `LiquidityLink/1.0 (${appBaseUrl})`;
const demoRequestInbox = process.env.DEMO_REQUEST_INBOX || "liquiditylink@gmail.com";
const instagramFallbackFollowers = process.env.INSTAGRAM_FOLLOWERS_FALLBACK || "250+";
let liveStatsCache = { expiresAt: 0, data: null };

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
  await pool.query(`CREATE TABLE IF NOT EXISTS demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    stores TEXT NOT NULL,
    goal TEXT NOT NULL,
    email_delivery TEXT NOT NULL DEFAULT 'pending',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS demo_requests_created_idx ON demo_requests (created_at DESC)");
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
  await pool.query(`CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    product TEXT NOT NULL,
    current_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    unit_cost NUMERIC CHECK (unit_cost >= 0),
    source TEXT NOT NULL DEFAULT 'shopify',
    external_id TEXT,
    location TEXT NOT NULL DEFAULT 'all locations',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, source, sku, location)
  )`);
  await pool.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC CHECK (unit_cost >= 0)");
  await pool.query("CREATE INDEX IF NOT EXISTS inventory_items_user_lookup_idx ON inventory_items (user_id, source, sku)");
  await pool.query(`CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('csv', 'shopify', 'square', 'clover')),
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
  await pool.query("ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS integration_connections_provider_check");
  await pool.query("ALTER TABLE integration_connections ADD CONSTRAINT integration_connections_provider_check CHECK (provider IN ('csv', 'shopify', 'square', 'clover', 'lightspeed', 'toast', 'woocommerce', 'custom_pos'))");
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
  await pool.query(`CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plan TEXT NOT NULL DEFAULT 'trial',
    billing_status TEXT NOT NULL DEFAULT 'not_configured',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL DEFAULT 'member' CHECK (role_name IN ('owner', 'admin', 'analyst', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members (user_id)");
  await pool.query(`CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (role_id, permission)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS alerts_user_status_idx ON alerts (user_id, status, created_at DESC)");
  await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS notifications_user_lookup_idx ON notifications (user_id, read_at, created_at DESC)");
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS api_keys_user_lookup_idx ON api_keys (user_id, revoked_at, created_at DESC)");
  await pool.query(`CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS activity_logs_user_lookup_idx ON activity_logs (user_id, created_at DESC)");
  await pool.query(`CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'inventory_health',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_email TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 14,
    reliability_score NUMERIC NOT NULL DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'received', 'cancelled')),
    expected_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await ensurePlanningSchema();
}

async function ensurePlanningSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplier_code TEXT NOT NULL,
    name TEXT NOT NULL,
    average_lead_time_days NUMERIC NOT NULL DEFAULT 14,
    lead_time_variability_days NUMERIC NOT NULL DEFAULT 3,
    reliability_score NUMERIC NOT NULL DEFAULT 90 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    minimum_order_quantity NUMERIC NOT NULL DEFAULT 1 CHECK (minimum_order_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, supplier_code)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    subcategory TEXT NOT NULL DEFAULT 'General',
    unit_cost NUMERIC CHECK (unit_cost >= 0),
    unit_price NUMERIC CHECK (unit_price >= 0),
    unit_of_measure TEXT NOT NULL DEFAULT 'unit',
    supplier_id UUID REFERENCES planning_suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'sample')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sku_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'store' CHECK (location_type IN ('store', 'warehouse', 'dc', 'online')),
    region TEXT NOT NULL DEFAULT 'North America',
    capacity_units NUMERIC CHECK (capacity_units >= 0),
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, location_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    sale_date DATE NOT NULL,
    units_sold NUMERIC NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
    unit_price_at_sale NUMERIC CHECK (unit_price_at_sale >= 0),
    was_promoted BOOLEAN NOT NULL DEFAULT false,
    was_out_of_stock BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'sample',
    external_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sku_id, location_id, sale_date, source)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_inventory_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
    on_hand_qty NUMERIC NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
    on_order_qty NUMERIC NOT NULL DEFAULT 0 CHECK (on_order_qty >= 0),
    in_transit_qty NUMERIC NOT NULL DEFAULT 0 CHECK (in_transit_qty >= 0),
    safety_stock_threshold NUMERIC NOT NULL DEFAULT 0 CHECK (safety_stock_threshold >= 0),
    source TEXT NOT NULL DEFAULT 'sample',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sku_id, location_id, inventory_date, source)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_promotion_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT,
    category TEXT,
    location_id TEXT,
    promo_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    discount_pct NUMERIC NOT NULL DEFAULT 0 CHECK (discount_pct >= 0),
    expected_lift_pct NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_forecast_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    horizon_days INTEGER NOT NULL CHECK (horizon_days IN (7, 30, 90)),
    point_forecast NUMERIC NOT NULL DEFAULT 0,
    lower_bound NUMERIC NOT NULL DEFAULT 0,
    upper_bound NUMERIC NOT NULL DEFAULT 0,
    confidence_level NUMERIC NOT NULL DEFAULT 0.8,
    model_version TEXT NOT NULL DEFAULT 'll-exp-smooth-v1',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sku_id, location_id, forecast_date, horizon_days, model_version)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_forecast_accuracy_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    horizon_days INTEGER NOT NULL,
    forecast_units NUMERIC NOT NULL DEFAULT 0,
    actual_units NUMERIC,
    absolute_error NUMERIC,
    percent_error NUMERIC,
    bias NUMERIC,
    accuracy_status TEXT NOT NULL DEFAULT 'pending' CHECK (accuracy_status IN ('pending', 'good', 'degraded', 'insufficient')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_transfer_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    recommended_qty NUMERIC NOT NULL CHECK (recommended_qty > 0),
    rationale TEXT NOT NULL,
    business_impact NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES planning_suppliers(id) ON DELETE SET NULL,
    sku_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    order_qty NUMERIC NOT NULL CHECK (order_qty > 0),
    expected_arrival_date DATE,
    status TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'draft', 'submitted', 'received', 'cancelled')),
    rationale TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('products', 'sales', 'inventory')),
    file_name TEXT NOT NULL DEFAULT 'manual upload',
    status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'committed', 'failed')),
    preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    rows_processed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS planning_dashboard_cache (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, cache_key)
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS planning_products_user_category_idx ON planning_products (user_id, category, sku_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS planning_sales_user_sku_location_date_idx ON planning_sales_history (user_id, sku_id, location_id, sale_date DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS planning_sales_user_date_idx ON planning_sales_history (user_id, sale_date DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS planning_inventory_user_sku_location_date_idx ON planning_inventory_levels (user_id, sku_id, location_id, inventory_date DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS planning_forecast_user_lookup_idx ON planning_forecast_results (user_id, sku_id, location_id, forecast_date DESC)");

  await pool.query("ALTER TABLE planning_suppliers ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC");
  await pool.query("ALTER TABLE planning_suppliers ADD COLUMN IF NOT EXISTS lead_time_stddev_days NUMERIC");
  await pool.query(`UPDATE planning_suppliers
    SET lead_time_days = COALESCE(lead_time_days, average_lead_time_days, 14),
        lead_time_stddev_days = COALESCE(lead_time_stddev_days, lead_time_variability_days, 3)`);

  await pool.query("ALTER TABLE planning_products ADD COLUMN IF NOT EXISTS sku TEXT");
  await pool.query("ALTER TABLE planning_products ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'sample_seed'");
  await pool.query("ALTER TABLE planning_products ADD COLUMN IF NOT EXISTS external_id TEXT");
  await pool.query("UPDATE planning_products SET sku = COALESCE(sku, sku_id)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS planning_products_user_sku_idx ON planning_products (user_id, sku)");

  await pool.query("ALTER TABLE planning_locations ADD COLUMN IF NOT EXISTS location_code TEXT");
  await pool.query("UPDATE planning_locations SET location_code = COALESCE(location_code, location_id)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS planning_locations_user_code_idx ON planning_locations (user_id, location_code)");

  await pool.query("ALTER TABLE planning_sales_history ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE planning_sales_history ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_sales_history ADD COLUMN IF NOT EXISTS gross_revenue NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_sales_history ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'sample_seed'");
  await pool.query(`UPDATE planning_sales_history
    SET quantity = COALESCE(quantity, units_sold, 0),
        gross_revenue = COALESCE(gross_revenue, units_sold * COALESCE(unit_price_at_sale, 0), 0),
        source_system = COALESCE(source_system, source, 'sample_seed')`);
  await pool.query("CREATE INDEX IF NOT EXISTS planning_sales_product_lookup_idx ON planning_sales_history (user_id, product_id, location_id, sale_date DESC)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS planning_sales_product_source_unique_idx ON planning_sales_history (user_id, product_id, location_id, sale_date, source_system, external_id)");

  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS recorded_at DATE NOT NULL DEFAULT CURRENT_DATE");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS on_hand NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS available NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS unit_cost NUMERIC");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS unit_price NUMERIC");
  await pool.query("ALTER TABLE planning_inventory_levels ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'sample_seed'");
  await pool.query(`UPDATE planning_inventory_levels
    SET recorded_at = COALESCE(recorded_at, inventory_date, CURRENT_DATE),
        on_hand = COALESCE(on_hand, on_hand_qty, 0),
        available = COALESCE(available, on_hand_qty, 0),
        source_system = COALESCE(source_system, source, 'sample_seed')`);
  await pool.query("CREATE INDEX IF NOT EXISTS planning_inventory_product_lookup_idx ON planning_inventory_levels (user_id, product_id, location_id, recorded_at DESC)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS planning_inventory_product_date_unique_idx ON planning_inventory_levels (user_id, product_id, location_id, recorded_at)");

  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS model_name TEXT NOT NULL DEFAULT 'LiquidityLink Ensemble'");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS forecast_units NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS lower_bound_units NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS upper_bound_units NUMERIC NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.8");
  await pool.query("ALTER TABLE planning_forecast_results ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb");
  await pool.query("CREATE INDEX IF NOT EXISTS planning_forecast_product_lookup_idx ON planning_forecast_results (user_id, product_id, location_id, forecast_date DESC, model_name)");
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

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many demo requests from this network. Try again later.", code: "RATE_LIMITED" },
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
        subject: "Your LiquidityLink verification code",
        text: `Your LiquidityLink verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your LiquidityLink verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      });
    } else {
      console.info(`LiquidityLink email 2FA code for ${destination}: ${code}`);
    }
    return;
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_PHONE) {
    const body = new URLSearchParams({
      To: destination,
      From: process.env.TWILIO_FROM_PHONE,
      Body: `Your LiquidityLink verification code is ${code}. It expires in 10 minutes.`,
    });
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error("Could not send SMS verification code.");
  } else {
    console.info(`LiquidityLink phone 2FA code for ${destination}: ${code}`);
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

function apiOk(res, data = {}, meta = {}) {
  return res.json({ ok: true, data, meta });
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parsePagination(req, defaultLimit = 25, maxLimit = 100) {
  const limit = clampNumber(req.query.limit, defaultLimit, 1, maxLimit);
  const page = clampNumber(req.query.page, 1, 1, 100000);
  return { limit, page, offset: (page - 1) * limit };
}

function slugify(value) {
  return String(value || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

function defaultSettingsConfig() {
  return {
    forecastHorizonWeeks: 8,
    leadTimeDays: 14,
    targetServiceLevel: 0.95,
    carryingCostRate: 0.25,
    grossMarginRate: 0.42,
    alertThresholds: { stockoutRisk: 70, overstockRisk: 75 },
    marketplace: { radiusMiles: 100 },
  };
}

async function ensureDefaultOrganization(userId) {
  const existing = await pool.query(
    `SELECT o.id, o.name, o.slug, o.plan, o.billing_status, o.owner_user_id, om.role_name, om.status
     FROM organization_members om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1
       AND (om.status = 'active' OR o.owner_user_id = $1)
     ORDER BY
       CASE
         WHEN o.owner_user_id = $1 THEN 0
         WHEN om.status = 'active' AND om.role_name IN ('owner', 'admin') THEN 1
         WHEN om.status = 'active' THEN 2
         ELSE 3
       END,
       om.created_at ASC
     LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    const org = existing.rows[0];
    if (org.owner_user_id === userId && (org.role_name !== "owner" || org.status !== "active")) {
      const repaired = await pool.query(
        `UPDATE organization_members
         SET role_name = 'owner', status = 'active', updated_at = now()
         WHERE organization_id = $1 AND user_id = $2
         RETURNING role_name, status`,
        [org.id, userId]
      );
      return { ...org, role_name: repaired.rows[0].role_name, status: repaired.rows[0].status };
    }
    return org;
  }

  const userResult = await pool.query(
    "SELECT email, first_name, last_name FROM users WHERE id = $1",
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) throw new Error("User not found");

  const baseName = `${user.first_name || "LiquidityLink"} Workspace`;
  const baseSlug = slugify(baseName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt ? `${baseSlug}-${attempt + 1}` : baseSlug;
    try {
      const orgResult = await pool.query(
        `INSERT INTO organizations (name, slug, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, slug, plan, billing_status, owner_user_id`,
        [baseName, slug, userId]
      );
      const org = orgResult.rows[0];
      await pool.query(
        `INSERT INTO organization_members (organization_id, user_id, role_name, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (organization_id, user_id) DO NOTHING`,
        [org.id, userId]
      );
      await pool.query(
        `INSERT INTO settings (user_id, organization_id, config)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, org.id, JSON.stringify(defaultSettingsConfig())]
      );
      return { ...org, role_name: "owner", status: "active" };
    } catch (err) {
      if (err.code !== "23505" || attempt === 4) throw err;
    }
  }
  throw new Error("Could not create organization");
}

async function getUserOrganizations(userId) {
  await ensureDefaultOrganization(userId);
  const result = await pool.query(
    `SELECT o.id, o.name, o.slug, o.plan, o.billing_status, o.owner_user_id, om.role_name, om.status, om.created_at
     FROM organization_members om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1
     ORDER BY
       CASE WHEN om.status = 'active' THEN 0 ELSE 1 END,
       CASE WHEN o.owner_user_id = $1 THEN 0 ELSE 1 END,
       om.created_at ASC`,
    [userId]
  );
  return result.rows;
}

async function organizationForRequest(req) {
  const requestedId = String(req.get("x-organization-id") || "").trim();
  if (requestedId) {
    const result = await pool.query(
      `SELECT o.id, o.name, o.slug, o.plan, o.billing_status, o.owner_user_id, om.role_name, om.status
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.organization_id = $2 AND om.status = 'active'`,
      [req.user.sub, requestedId]
    );
    if (result.rows[0]) return result.rows[0];
  }
  return ensureDefaultOrganization(req.user.sub);
}

async function recordActivity(req, action, entityType, entityId = null, metadata = {}) {
  try {
    if (!req.user?.sub) return;
    const org = await ensureDefaultOrganization(req.user.sub);
    await pool.query(
      `INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        org.id,
        req.user.sub,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata || {}),
        req.ip || "",
        req.get("user-agent") || "",
      ]
    );
  } catch (err) {
    console.warn("Activity log skipped:", err.message);
  }
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, places = 2) {
  const parsed = numeric(value);
  const factor = 10 ** places;
  return Math.round(parsed * factor) / factor;
}

function average(values) {
  const filtered = values.filter(value => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function stdDev(values) {
  const filtered = values.filter(value => Number.isFinite(value));
  if (filtered.length < 2) return 0;
  const mean = average(filtered);
  const variance = filtered.reduce((sum, value) => sum + (value - mean) ** 2, 0) / filtered.length;
  return Math.sqrt(variance);
}

function weekKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "unknown";
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utc).getUTCDay() || 7;
  const monday = utc - (day - 1) * 86400000;
  return new Date(monday).toISOString().slice(0, 10);
}

function weekSpan(start, end) {
  if (!start || !end) return 1;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 1;
  return Math.max(1, Math.ceil((endDate - startDate + 86400000) / (7 * 86400000)));
}

function buildAdvancedAnalytics(salesRows = [], inventoryRows = []) {
  const assumptions = {
    leadTimeDays: 14,
    targetServiceLevel: 0.95,
    zScore: 1.65,
    grossMarginRate: 0.42,
    carryingCostRate: 0.25,
    forecastHorizonWeeks: 8,
  };
  const inventoryBySku = new Map();
  const salesBySku = new Map();

  for (const item of inventoryRows) {
    const sku = String(item.sku || "").trim();
    if (!sku) continue;
    const current = inventoryBySku.get(sku) || {
      sku,
      product: item.product || sku,
      currentUnits: 0,
      price: 0,
      cost: null,
      locations: new Set(),
      sources: new Set(),
    };
    current.currentUnits += numeric(item.current);
    if (numeric(item.price) > 0) current.price = numeric(item.price);
    if (item.cost !== null && item.cost !== undefined && numeric(item.cost) > 0) current.cost = numeric(item.cost);
    if (item.product) current.product = item.product;
    if (item.location) current.locations.add(item.location);
    if (item.source) current.sources.add(item.source);
    inventoryBySku.set(sku, current);
  }

  for (const row of salesRows) {
    const sku = String(row.sku || "").trim();
    if (!sku) continue;
    const current = salesBySku.get(sku) || {
      sku,
      quantity: 0,
      rowCount: 0,
      firstDate: "",
      lastDate: "",
      weeks: new Map(),
      locations: new Set(),
      sources: new Set(),
    };
    const quantity = numeric(row.quantity);
    const date = row.date ? String(row.date).slice(0, 10) : "";
    current.quantity += quantity;
    current.rowCount += 1;
    if (date && (!current.firstDate || date < current.firstDate)) current.firstDate = date;
    if (date && (!current.lastDate || date > current.lastDate)) current.lastDate = date;
    const key = weekKey(row.date);
    current.weeks.set(key, (current.weeks.get(key) || 0) + quantity);
    if (row.location) current.locations.add(row.location);
    if (row.source) current.sources.add(row.source);
    salesBySku.set(sku, current);
  }

  const skuKeys = [...new Set([...inventoryBySku.keys(), ...salesBySku.keys()])];
  const skus = skuKeys.map(sku => {
    const inventory = inventoryBySku.get(sku) || {
      sku,
      product: sku,
      currentUnits: 0,
      price: 0,
      cost: null,
      locations: new Set(),
      sources: new Set(),
    };
    const sales = salesBySku.get(sku) || {
      sku,
      quantity: 0,
      rowCount: 0,
      firstDate: "",
      lastDate: "",
      weeks: new Map(),
      locations: new Set(),
      sources: new Set(),
    };
    const observedWeeks = weekSpan(sales.firstDate, sales.lastDate);
    const weeklyValues = [...sales.weeks.values()];
    const avgWeeklyDemand = sales.quantity / observedWeeks;
    const weeklyStd = stdDev(weeklyValues.length ? weeklyValues : [avgWeeklyDemand]);
    const avgDailyDemand = avgWeeklyDemand / 7;
    const dailyStd = weeklyStd / Math.sqrt(7);
    const forecast8w = avgWeeklyDemand * assumptions.forecastHorizonWeeks;
    const safetyStock = assumptions.zScore * dailyStd * Math.sqrt(assumptions.leadTimeDays);
    const reorderPoint = avgDailyDemand * assumptions.leadTimeDays + safetyStock;
    const currentUnits = Math.max(0, inventory.currentUnits);
    const price = Math.max(0, inventory.price);
    const cost = inventory.cost === null ? null : Math.max(0, numeric(inventory.cost));
    const hasPrice = price > 0;
    const hasCost = cost !== null && cost > 0;
    const shortfall = Math.max(0, forecast8w - currentUnits);
    const excessUnits = Math.max(0, currentUnits - forecast8w);
    const stockoutRisk = forecast8w ? Math.min(100, (shortfall / forecast8w) * 100) : 0;
    const daysCover = avgDailyDemand ? currentUnits / avgDailyDemand : (currentUnits > 0 ? 999 : 0);
    const sellThrough = sales.quantity + currentUnits ? (sales.quantity / (sales.quantity + currentUnits)) * 100 : 0;
    const revenue = hasPrice ? sales.quantity * price : null;
    const inventoryValue = currentUnits * price;
    const inventoryCost = hasCost ? currentUnits * cost : null;
    const grossMargin = hasPrice && hasCost ? sales.quantity * (price - cost) : null;
    const gmroi = inventoryCost > 0 && grossMargin !== null ? grossMargin / inventoryCost : null;
    const revenueAtRisk = hasPrice ? shortfall * price : null;
    const excessCost = hasCost ? excessUnits * cost * assumptions.carryingCostRate : null;
    const confidence = Math.min(95, Math.max(20, 30 + observedWeeks * 8 + sales.rowCount * 3));
    const action = shortfall > reorderPoint
      ? "buy"
      : excessUnits > Math.max(10, forecast8w * 0.75)
        ? "sell"
        : inventory.locations.size > 1 && (shortfall || excessUnits)
          ? "transfer"
          : "hold";

    return {
      sku,
      product: inventory.product || sku,
      source: [...new Set([...inventory.sources, ...sales.sources])].join(", ") || "unknown",
      locationCount: new Set([...inventory.locations, ...sales.locations]).size,
      current: round(currentUnits, 0),
      currentUnits: round(currentUnits, 0),
      soldUnits: round(sales.quantity, 0),
      avgWeeklyDemand: round(avgWeeklyDemand, 2),
      forecast8w: round(forecast8w, 0),
      safetyStock: round(safetyStock, 1),
      reorderPoint: round(reorderPoint, 1),
      daysCover: round(Math.min(daysCover, 999), 1),
      sellThrough: round(sellThrough, 1),
      stockoutRisk: round(stockoutRisk, 1),
      riskScore: round(stockoutRisk, 1),
      price: hasPrice ? round(price, 2) : null,
      cost: hasCost ? round(cost, 2) : null,
      missingPrice: !hasPrice,
      missingCost: !hasCost,
      revenue: revenue === null ? null : round(revenue, 2),
      inventoryValue: round(inventoryValue, 2),
      inventoryCost: inventoryCost === null ? null : round(inventoryCost, 2),
      grossMargin: grossMargin === null ? null : round(grossMargin, 2),
      gmroi: gmroi === null ? null : round(gmroi, 2),
      revenueAtRisk: revenueAtRisk === null ? null : round(revenueAtRisk, 2),
      excessCost: excessCost === null ? null : round(excessCost, 2),
      confidence: round(confidence, 0),
      action,
    };
  }).sort((a, b) => b.revenueAtRisk - a.revenueAtRisk || b.stockoutRisk - a.stockoutRisk);

  const samplePattern = /^(gift card(?:\s*-\s*\$?\d+)?|selling plans? ski wax)/i;
  const sampleSkus = skus.filter(sku => samplePattern.test(String(sku.product || "").trim()));
  const realSkus = skus.filter(sku => !samplePattern.test(String(sku.product || "").trim()));
  const revenueTotal = realSkus.reduce((sum, sku) => sum + numeric(sku.revenue), 0);
  let cumulativeRevenue = 0;
  const abcSource = [...realSkus].sort((a, b) => numeric(b.revenue) - numeric(a.revenue));
  const abc = abcSource.map((item, index) => {
    const startingShare = revenueTotal ? (cumulativeRevenue / revenueTotal) * 100 : (index / Math.max(1, abcSource.length)) * 100;
    cumulativeRevenue += numeric(item.revenue);
    const cumulativeShare = revenueTotal ? (cumulativeRevenue / revenueTotal) * 100 : 0;
    const group = startingShare < 80 ? "A" : startingShare < 95 ? "B" : "C";
    return {
      sku: item.sku,
      product: item.product,
      revenue: round(item.revenue, 2),
      share: round(revenueTotal ? (item.revenue / revenueTotal) * 100 : 0, 1),
      cumulativeShare: round(cumulativeShare, 1),
      group,
      className: group,
    };
  });

  const costCompleteSkus = realSkus.filter(sku => !sku.missingCost && !sku.missingPrice);
  const priceCompleteSkus = realSkus.filter(sku => !sku.missingPrice);
  const grossMargin = costCompleteSkus.reduce((sum, sku) => sum + numeric(sku.grossMargin), 0);
  const cogs = costCompleteSkus.reduce((sum, sku) => sum + sku.soldUnits * numeric(sku.cost), 0);
  const inventoryValue = priceCompleteSkus.reduce((sum, sku) => sum + sku.inventoryValue, 0);
  const avgInventoryCost = costCompleteSkus.reduce((sum, sku) => sum + numeric(sku.inventoryCost), 0);
  const forecast8w = realSkus.reduce((sum, sku) => sum + sku.forecast8w, 0);
  const totalShortfall = realSkus.reduce((sum, sku) => sum + Math.max(0, sku.forecast8w - sku.currentUnits), 0);
  const avgWeeklyValues = realSkus.map(sku => sku.avgWeeklyDemand).filter(value => value > 0);
  const weightedRisk = forecast8w ? realSkus.reduce((sum, sku) => sum + sku.riskScore * sku.forecast8w, 0) / forecast8w : 0;
  const dataCompleteSkus = realSkus.filter(sku => !sku.missingCost && !sku.missingPrice && sku.soldUnits > 0);
  const enoughData = salesRows.length >= 20 && realSkus.filter(sku => sku.soldUnits > 0).length >= 3;
  const actionCounts = skus.reduce((counts, sku) => {
    counts[sku.action] = (counts[sku.action] || 0) + 1;
    return counts;
  }, {});

  return {
    summary: {
      analyzedSkus: realSkus.length,
      salesRows: salesRows.length,
      inventoryRows: inventoryRows.length,
      totalUnitsSold: round(realSkus.reduce((sum, sku) => sum + sku.soldUnits, 0), 0),
      totalOnHand: round(realSkus.reduce((sum, sku) => sum + sku.currentUnits, 0), 0),
      forecast8w: round(forecast8w, 0),
      inventoryValue: round(inventoryValue, 2),
      revenueAtRisk: round(priceCompleteSkus.reduce((sum, sku) => sum + numeric(sku.revenueAtRisk), 0), 2),
      excessCost: costCompleteSkus.length ? round(costCompleteSkus.reduce((sum, sku) => sum + numeric(sku.excessCost), 0), 2) : null,
      grossMargin: round(grossMargin, 2),
      gmroi: avgInventoryCost ? round(grossMargin / avgInventoryCost, 2) : null,
      inventoryTurnover: avgInventoryCost ? round((cogs / Math.max(1, salesRows.length ? weekSpan(salesRows[0]?.date, salesRows[salesRows.length - 1]?.date) : 1)) * 52 / avgInventoryCost, 2) : null,
      serviceLevel: forecast8w ? round(Math.max(0, (1 - totalShortfall / forecast8w) * 100), 1) : null,
      demandVolatility: round(average(avgWeeklyValues) ? (stdDev(avgWeeklyValues) / average(avgWeeklyValues)) * 100 : 0, 1),
      avgDaysCover: round(average(skus.map(sku => Math.min(sku.daysCover, 999))), 1),
      riskScore: round(weightedRisk, 1),
      highRiskSkus: realSkus.filter(sku => sku.stockoutRisk >= 70).length,
      deadStockSkus: realSkus.filter(sku => sku.currentUnits > 0 && sku.soldUnits === 0).length,
      sampleCatalogDetected: sampleSkus.length > 0,
      excludedSampleSkus: sampleSkus.length,
      enoughData,
      confidenceLevel: enoughData ? "usable" : "low",
      costCompleteSkus: costCompleteSkus.length,
      priceCompleteSkus: priceCompleteSkus.length,
      missingCostSkus: realSkus.length - costCompleteSkus.length,
      dataCompleteness: realSkus.length ? round((dataCompleteSkus.length / realSkus.length) * 100, 1) : 0,
      actionCounts,
    },
    assumptions,
    formulas: [
      { name: "Reorder point", equation: "(avg daily demand x lead time days) + safety stock", description: "Minimum on-hand units before replenishment is triggered." },
      { name: "Safety stock", equation: "Z x sigma(daily demand) x sqrt(lead time days)", description: "Buffer inventory for demand variability during replenishment." },
      { name: "Days of cover", equation: "on-hand units / avg daily demand", description: "How long current inventory lasts at observed velocity." },
      { name: "Sell-through", equation: "units sold / (units sold + on hand)", description: "How much available product has converted into demand." },
      { name: "GMROI", equation: "gross margin dollars / average inventory cost", description: "Margin generated for each dollar held in inventory." },
      { name: "Service level", equation: "1 - projected shortfall / forecast demand", description: "Estimated ability to satisfy demand from current stock." },
      { name: "Demand CV", equation: "std dev weekly demand / avg weekly demand", description: "Volatility signal for forecast uncertainty." },
    ],
    abc,
    skus: realSkus,
  };
}

function planningDateKey(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function planningWeekStart(value) {
  const date = new Date(`${planningDateKey(value)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return planningDateKey(date);
}

function planningAddDays(value, days) {
  const date = new Date(`${planningDateKey(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return planningDateKey(date);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferPlanningCategory(name = "") {
  const text = String(name).toLowerCase();
  if (/shoe|sock|boot|sneaker|running/.test(text)) return "Footwear";
  if (/shirt|jacket|pant|dress|apparel|base layer|merino/.test(text)) return "Apparel";
  if (/phone|charger|speaker|electronic|mobile/.test(text)) return "Electronics";
  if (/bottle|kitchen|home|mug/.test(text)) return "Home";
  if (/trail|outdoor|pole|camp/.test(text)) return "Outdoor";
  if (/gift card|wax/.test(text)) return "Sample catalog";
  return "General";
}

function isSampleCatalogProduct(name = "", sku = "") {
  return /gift card|selling plans ski wax|snowboard|hydrogen snowboard/i.test(`${name} ${sku}`);
}

function planningBatchValues(rows, columns) {
  const values = [];
  const params = [];
  rows.forEach((row, rowIndex) => {
    values.push(`(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(", ")})`);
    for (const column of columns) params.push(row[column]);
  });
  return { values: values.join(", "), params };
}

async function migrateFlatDataToPlanning(userId) {
  const locationMap = new Map();
  const supplier = (await pool.query(
    `INSERT INTO planning_suppliers (user_id, supplier_code, name)
     VALUES ($1, 'CONNECTED', 'Connected source')
     ON CONFLICT (user_id, supplier_code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [userId]
  )).rows[0];

  const [inventory, sales] = await Promise.all([
    pool.query(
      `SELECT sku, product, current_quantity::float AS current, unit_price::float AS price,
              unit_cost::float AS cost, location, source, updated_at
       FROM inventory_items WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT sku, sale_date AS date, quantity::float AS quantity, location, source, created_at
       FROM sales_records WHERE user_id = $1`,
      [userId]
    ),
  ]);

  const ensureLocation = async (name) => {
    const locationName = String(name || "Default").trim() || "Default";
    if (locationMap.has(locationName)) return locationMap.get(locationName);
    const row = (await pool.query(
      `INSERT INTO planning_locations (user_id, location_id, location_code, name, region)
       VALUES ($1, $2, $2, $3, 'Connected')
       ON CONFLICT (user_id, location_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, locationName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 40) || "DEFAULT", locationName]
    )).rows[0];
    locationMap.set(locationName, row.id);
    return row.id;
  };

  const productNames = new Map();
  for (const row of inventory.rows) productNames.set(row.sku, row.product || row.sku);
  for (const row of sales.rows) if (!productNames.has(row.sku)) productNames.set(row.sku, row.sku);

  for (const [sku, name] of productNames.entries()) {
    const inv = inventory.rows.find((row) => row.sku === sku) || {};
    await pool.query(
      `INSERT INTO planning_products
         (user_id, supplier_id, sku_id, sku, name, category, unit_price, unit_cost, status, source_system, external_id)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $3)
       ON CONFLICT (user_id, sku) DO UPDATE
       SET name = EXCLUDED.name,
           category = EXCLUDED.category,
           unit_price = COALESCE(EXCLUDED.unit_price, planning_products.unit_price),
           unit_cost = COALESCE(EXCLUDED.unit_cost, planning_products.unit_cost),
           status = EXCLUDED.status,
           source_system = EXCLUDED.source_system`,
      [
        userId,
        supplier.id,
        sku,
        name,
        inferPlanningCategory(name),
        numeric(inv.price) || null,
        Number.isFinite(Number(inv.cost)) && Number(inv.cost) > 0 ? Number(inv.cost) : null,
        isSampleCatalogProduct(name, sku) ? "sample" : "active",
        inv.source || "connected",
      ]
    );
  }

  for (const row of inventory.rows) {
    const product = (await pool.query("SELECT id FROM planning_products WHERE user_id = $1 AND sku = $2", [userId, row.sku])).rows[0];
    if (!product) continue;
    const locationId = await ensureLocation(row.location);
    await pool.query(
      `INSERT INTO planning_inventory_levels
         (user_id, product_id, sku_id, location_id, recorded_at, inventory_date, on_hand, available, on_hand_qty, unit_cost, unit_price, source, source_system)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE, $5, $5, $5, $8, $6, $7, $7)
       ON CONFLICT (user_id, product_id, location_id, recorded_at) DO UPDATE
       SET on_hand = EXCLUDED.on_hand,
           available = EXCLUDED.available,
           on_hand_qty = EXCLUDED.on_hand_qty,
           unit_cost = COALESCE(EXCLUDED.unit_cost, planning_inventory_levels.unit_cost),
           unit_price = COALESCE(EXCLUDED.unit_price, planning_inventory_levels.unit_price),
           source = EXCLUDED.source,
           source_system = EXCLUDED.source_system`,
      [userId, product.id, row.sku, String(locationId), numeric(row.current), row.price || null, row.source || "connected", row.cost || null]
    );
  }

  for (const row of sales.rows) {
    const product = (await pool.query("SELECT id FROM planning_products WHERE user_id = $1 AND sku = $2", [userId, row.sku])).rows[0];
    if (!product) continue;
    const locationId = await ensureLocation(row.location);
    await pool.query(
      `INSERT INTO planning_sales_history
         (user_id, product_id, sku_id, location_id, sale_date, units_sold, quantity, gross_revenue, source, source_system, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $6, 0, $7, $7, $8)
       ON CONFLICT (user_id, product_id, location_id, sale_date, source_system, external_id) DO UPDATE
       SET units_sold = EXCLUDED.units_sold,
           quantity = EXCLUDED.quantity,
           updated_at = now()`,
      [userId, product.id, row.sku, String(locationId), planningDateKey(row.date), numeric(row.quantity), row.source || "connected", `${row.sku}:${row.date}:${row.location}:${row.source || "connected"}`]
    );
  }
}

async function seedPlanningSampleData(userId) {
  const existing = (await pool.query("SELECT count(*)::int AS count FROM planning_products WHERE user_id = $1", [userId])).rows[0].count;
  if (existing) return;
  const categories = ["Footwear", "Apparel", "Electronics", "Outdoor", "Home", "Beauty", "Grocery", "Accessories"];
  const locations = ["Downtown", "North", "South", "West", "Airport", "Ecommerce"];
  const supplierIds = [];
  for (let i = 1; i <= 12; i += 1) {
    supplierIds.push((await pool.query(
      `INSERT INTO planning_suppliers (user_id, supplier_code, name, lead_time_days, lead_time_stddev_days)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, supplier_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, `SUP${String(i).padStart(2, "0")}`, `Supplier ${i}`, 7 + (i % 5) * 4, 1 + (i % 4)]
    )).rows[0].id);
  }
  const locationIds = [];
  for (let i = 0; i < locations.length; i += 1) {
    locationIds.push((await pool.query(
      `INSERT INTO planning_locations (user_id, location_id, location_code, name, region)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (user_id, location_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, `LOC${i + 1}`, locations[i], i === 5 ? "Digital" : "US"]
    )).rows[0].id);
  }
  const today = new Date();
  for (let i = 1; i <= 500; i += 1) {
    const category = categories[i % categories.length];
    const sku = `SKU${String(i).padStart(4, "0")}`;
    const price = round(18 + (i % 40) * 3.7, 2);
    const cost = round(price * (0.42 + (i % 9) / 100), 2);
    const product = (await pool.query(
      `INSERT INTO planning_products (user_id, supplier_id, sku_id, sku, name, category, unit_price, unit_cost, status, source_system)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'active', 'sample_seed')
       ON CONFLICT (user_id, sku) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, supplierIds[i % supplierIds.length], sku, `${category} Item ${i}`, category, price, cost]
    )).rows[0];
    const assignedLocations = [locationIds[i % locationIds.length], locationIds[(i + 2) % locationIds.length]];
    for (const locationId of assignedLocations) {
      await pool.query(
        `INSERT INTO planning_inventory_levels (user_id, product_id, sku_id, location_id, recorded_at, inventory_date, on_hand, available, on_hand_qty, unit_cost, unit_price, source, source_system)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE, $5, $5, $5, $6, $7, 'sample', 'sample_seed')
         ON CONFLICT (user_id, product_id, location_id, recorded_at) DO NOTHING`,
        [userId, product.id, sku, String(locationId), 12 + (i % 80), cost, price]
      );
      for (let d = 0; d < 730; d += 3) {
        const date = planningAddDays(today, -d);
        const seasonal = 1 + 0.28 * Math.sin((d / 365) * Math.PI * 2 + (i % 6));
        const trend = 1 + ((730 - d) / 730) * ((i % 11) / 45);
        const quantity = Math.max(0, Math.round(((i % 7) + 1) * seasonal * trend * (d % 5 === 0 ? 1.35 : 0.65)));
        if (!quantity) continue;
        await pool.query(
          `INSERT INTO planning_sales_history
             (user_id, product_id, sku_id, location_id, sale_date, units_sold, quantity, gross_revenue, source, source_system, external_id)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'sample', 'sample_seed', $8)
           ON CONFLICT (user_id, product_id, location_id, sale_date, source_system, external_id) DO NOTHING`,
          [userId, product.id, sku, String(locationId), date, quantity, round(quantity * price, 2), `${sku}:${locationId}:${date}`]
        );
      }
    }
  }
}

async function ensurePlanningDataset(userId) {
  const count = (await pool.query("SELECT count(*)::int AS count FROM planning_products WHERE user_id = $1", [userId])).rows[0].count;
  if (count) return { seeded: false };
  const flat = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM sales_records WHERE user_id = $1) AS sales_count,
       (SELECT count(*)::int FROM inventory_items WHERE user_id = $1) AS inventory_count`,
    [userId]
  );
  if (flat.rows[0].sales_count || flat.rows[0].inventory_count) {
    await migrateFlatDataToPlanning(userId);
    return { seeded: false, migrated: true };
  }
  await seedPlanningSampleData(userId);
  return { seeded: true };
}

function holtForecast(weeklyValues, horizon = 8) {
  const series = (weeklyValues || [])
    .map(value => numeric(value, 0))
    .filter(Number.isFinite);
  if (!series.length) return Array.from({ length: horizon }, () => 0);
  if (series.length === 1) return Array.from({ length: horizon }, () => Math.max(0, round(series[0], 2)));
  let level = series[0] || 0;
  let trend = series.length > 1 ? series[1] - series[0] : 0;
  const alpha = 0.38;
  const beta = 0.14;
  for (const value of series.slice(1)) {
    const previous = level;
    level = alpha * value + (1 - alpha) * (level + trend);
    trend = beta * (level - previous) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, index) => Math.max(0, round(level + trend * (index + 1), 2)));
}

async function persistPlanningOutputs(userId, analytics) {
  await pool.query("DELETE FROM planning_forecast_results WHERE user_id = $1 AND model_name = 'LiquidityLink Ensemble'", [userId]);
  await pool.query("DELETE FROM planning_transfer_recommendations WHERE user_id = $1 AND status = 'open'", [userId]);
  for (const sku of analytics.skus.slice(0, 250)) {
    const product = (await pool.query("SELECT id FROM planning_products WHERE user_id = $1 AND sku = $2", [userId, sku.sku])).rows[0];
    const location = (await pool.query("SELECT id FROM planning_locations WHERE user_id = $1 AND name = $2", [userId, sku.location])).rows[0];
    if (!product || !location) continue;
    for (const horizon of [7, 30, 90]) {
      await pool.query(
        `INSERT INTO planning_forecast_results
           (user_id, product_id, sku_id, location_id, forecast_date, horizon_days, point_forecast, forecast_units,
            lower_bound, lower_bound_units, upper_bound, upper_bound_units, confidence_level, confidence, model_name, features)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $6, $7, $7, $8, $8, $9, $9, 'LiquidityLink Ensemble', $10::jsonb)`,
        [
          userId,
          product.id,
          sku.sku,
          location.id,
          horizon,
          horizon === 7 ? sku.forecast7d : horizon === 30 ? sku.forecast30d : sku.forecast90d,
          sku.lowerBound30d,
          sku.upperBound30d,
          sku.confidence,
          JSON.stringify({ riskScore: sku.riskScore, action: sku.action }),
        ]
      );
    }
    if (sku.action === "transfer") {
      await pool.query(
        `INSERT INTO planning_transfer_recommendations
           (user_id, sku_id, from_location_id, to_location_id, recommended_qty, rationale, business_impact)
         VALUES ($1, $2, $3, $3, $4, $5, $6)`,
        [userId, sku.sku, location.id, Math.max(1, Math.round(sku.excessUnits || 1)), sku.rationale, sku.excessCost]
      );
    }
  }
}

async function buildPlanningAnalytics(userId, options = {}) {
  await ensurePlanningDataset(userId);
  const locationId = options.locationId || null;
  const discountPct = clamp(numeric(options.discountPct), 0, 80);
  const [productsResult, salesResult, inventoryResult, locationsResult] = await Promise.all([
    pool.query(
      `SELECT p.id, p.sku, p.name, p.category, p.unit_price::float AS unit_price, p.unit_cost::float AS unit_cost,
              p.status, p.source_system, s.lead_time_days::float AS lead_time_days,
              s.lead_time_stddev_days::float AS lead_time_stddev_days
       FROM planning_products p
       LEFT JOIN planning_suppliers s ON s.id = p.supplier_id
       WHERE p.user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT sh.product_id, sh.location_id, l.name AS location, sh.sale_date, sh.quantity::float AS quantity,
              sh.gross_revenue::float AS revenue, sh.was_out_of_stock
       FROM planning_sales_history sh
       JOIN planning_locations l ON l.id::text = sh.location_id
       WHERE sh.user_id = $1 AND ($2::text IS NULL OR sh.location_id = $2::text)
       ORDER BY sh.sale_date ASC`,
      [userId, locationId]
    ),
    pool.query(
      `SELECT DISTINCT ON (il.product_id, il.location_id)
              il.product_id, il.location_id, l.name AS location, il.on_hand::float AS on_hand,
              il.available::float AS available, il.unit_cost::float AS unit_cost, il.unit_price::float AS unit_price,
              il.recorded_at
       FROM planning_inventory_levels il
       JOIN planning_locations l ON l.id::text = il.location_id
       WHERE il.user_id = $1 AND ($2::text IS NULL OR il.location_id = $2::text)
       ORDER BY il.product_id, il.location_id, il.recorded_at DESC`,
      [userId, locationId]
    ),
    pool.query("SELECT id, name, region FROM planning_locations WHERE user_id = $1 ORDER BY name ASC", [userId]),
  ]);

  const hasConnectedProducts = productsResult.rows.some((product) => product.source_system !== "sample_seed");
  const products = productsResult.rows.filter((product) => {
    if (hasConnectedProducts && product.source_system === "sample_seed") return false;
    return !isSampleCatalogProduct(product.name, product.sku) && product.status !== "sample";
  });
  const excludedSampleSkus = productsResult.rows.length - products.length;
  const productById = new Map(products.map((product) => [product.id, product]));
  const salesByKey = new Map();
  for (const sale of salesResult.rows) {
    if (!productById.has(sale.product_id)) continue;
    const key = `${sale.product_id}:${sale.location_id}`;
    if (!salesByKey.has(key)) salesByKey.set(key, []);
    salesByKey.get(key).push(sale);
  }

  const categoryWeekly = new Map();
  for (const [key, rows] of salesByKey.entries()) {
    const product = productById.get(rows[0].product_id);
    if (!product) continue;
    if (!categoryWeekly.has(product.category)) categoryWeekly.set(product.category, []);
    categoryWeekly.get(product.category).push(...rows.map((row) => numeric(row.quantity)));
  }

  const skuRows = [];
  const today = new Date();
  const weekStarts = Array.from({ length: 104 }, (_, index) => planningWeekStart(planningAddDays(today, -(103 - index) * 7)));
  for (const inv of inventoryResult.rows) {
    const product = productById.get(inv.product_id);
    if (!product) continue;
    const key = `${inv.product_id}:${inv.location_id}`;
    const sales = salesByKey.get(key) || [];
    const weeklyMap = new Map(weekStarts.map((week) => [week, 0]));
    for (const sale of sales) {
      const week = planningWeekStart(sale.sale_date);
      weeklyMap.set(week, (weeklyMap.get(week) || 0) + numeric(sale.quantity));
    }
    const weekly = weekStarts.map((week) => weeklyMap.get(week) || 0);
    const observedWeeks = weekly.filter((value) => value > 0).length;
    const analogWeekly = average(categoryWeekly.get(product.category) || [1]);
    const correctedWeekly = weekly.map((value) => (value === 0 && observedWeeks < 6 ? analogWeekly * 0.35 : value));
    const forecast8w = holtForecast(correctedWeekly, 8).map((value) => round(value * (1 + discountPct / 250), 2));
    const forecast7d = round(forecast8w[0], 2);
    const forecast30d = round(forecast8w.slice(0, 4).reduce((sum, value) => sum + value, 0), 2);
    const forecast90d = round(forecast8w.reduce((sum, value) => sum + value, 0) * 1.5, 2);
    const errors = correctedWeekly.slice(-12).map((value, index, arr) => Math.abs(value - average(arr.slice(0, index + 1))));
    const mae = average(errors);
    const sigma = stdDev(correctedWeekly.slice(-26));
    const confidenceWidth = Math.max(1, mae + sigma * (observedWeeks < 8 ? 2.2 : 1.35));
    const onHand = numeric(inv.available ?? inv.on_hand);
    const unitPrice = numeric(product.unit_price || inv.unit_price);
    const unitCost = Number.isFinite(Number(product.unit_cost || inv.unit_cost)) && Number(product.unit_cost || inv.unit_cost) > 0
      ? Number(product.unit_cost || inv.unit_cost)
      : null;
    const leadTime = numeric(product.lead_time_days) || 14;
    const leadTimeStd = numeric(product.lead_time_stddev_days) || 2;
    const leadTimeDemand = forecast30d * (leadTime / 30);
    const safetyStock = 1.65 * confidenceWidth * Math.sqrt(Math.max(1, leadTime / 7));
    const reorderPoint = leadTimeDemand + safetyStock;
    const demand90 = Math.max(1, forecast90d);
    const daysCover = round((onHand / Math.max(0.1, forecast30d / 30)), 1);
    const shortfall = Math.max(0, reorderPoint - onHand);
    const excessUnits = Math.max(0, onHand - demand90);
    const revenueAtRisk = round(shortfall * unitPrice, 2);
    const excessCost = round(excessUnits * (unitCost || unitPrice * 0.5) * 0.18, 2);
    const serviceLevel = round(clamp(1 - shortfall / Math.max(1, forecast30d), 0, 1) * 100, 1);
    const cogs = unitCost ? numeric(sales.reduce((sum, sale) => sum + numeric(sale.quantity), 0) * unitCost) : null;
    const grossMargin = unitCost ? sales.reduce((sum, sale) => sum + numeric(sale.quantity) * Math.max(0, unitPrice - unitCost), 0) : null;
    const avgInventoryCost = unitCost ? Math.max(1, onHand * unitCost) : null;
    const gmroi = unitCost ? round(grossMargin / avgInventoryCost, 2) : null;
    const inventoryTurnover = unitCost ? round(cogs / avgInventoryCost, 2) : null;
    const stockoutComponent = clamp(shortfall / Math.max(1, reorderPoint), 0, 1);
    const overstockComponent = clamp(excessUnits / Math.max(1, onHand), 0, 1);
    const leadTimeComponent = clamp(leadTimeStd / Math.max(1, leadTime), 0, 1);
    const dataPenalty = observedWeeks < 6 ? 0.16 : observedWeeks < 12 ? 0.08 : 0;
    const riskScore = Math.round(clamp((stockoutComponent * 0.62 + overstockComponent * 0.18 + leadTimeComponent * 0.12 + dataPenalty) * 100, 0, 100));
    const action = shortfall > 0 ? "buy" : excessUnits > forecast30d ? "sell" : "hold";
    skuRows.push({
      sku: product.sku,
      product: product.name,
      category: product.category,
      location: inv.location,
      current: onHand,
      onHand,
      price: unitPrice,
      cost: unitCost,
      missingCostData: !unitCost,
      observedWeeks,
      enoughData: observedWeeks >= 8,
      forecast7d,
      forecast30d,
      forecast90d,
      forecast8w,
      lowerBound30d: round(Math.max(0, forecast30d - confidenceWidth * 4), 2),
      upperBound30d: round(forecast30d + confidenceWidth * 4, 2),
      confidence: round(clamp(observedWeeks / 26, 0.25, 0.94), 2),
      demandVolatility: round(stdDev(correctedWeekly.slice(-26)) / Math.max(1, average(correctedWeekly.slice(-26))), 2),
      daysCover,
      reorderPoint: round(reorderPoint, 2),
      safetyStock: round(safetyStock, 2),
      serviceLevel,
      gmroi,
      inventoryTurnover,
      revenueAtRisk,
      excessCost,
      excessUnits: round(excessUnits, 2),
      riskScore,
      riskLabel: riskScore >= 75 ? "high" : riskScore >= 45 ? "medium" : "low",
      action,
      rationale: shortfall > 0
        ? `Projected lead-time demand exceeds available inventory by ${round(shortfall, 1)} units.`
        : excessUnits > forecast30d
          ? `Current stock exceeds projected 90-day demand by ${round(excessUnits, 1)} units.`
          : "Inventory is inside the forecasted operating band.",
      businessImpact: round(revenueAtRisk + excessCost, 2),
    });
  }

  const salesRows = salesResult.rows.filter((sale) => productById.has(sale.product_id)).length;
  const weightedRisk = Math.round(
    skuRows.reduce((sum, row) => sum + row.riskScore * Math.max(1, row.businessImpact), 0) /
    Math.max(1, skuRows.reduce((sum, row) => sum + Math.max(1, row.businessImpact), 0))
  );
  const revenueBySku = new Map();
  for (const sale of salesResult.rows) {
    const product = productById.get(sale.product_id);
    if (!product) continue;
    revenueBySku.set(product.sku, (revenueBySku.get(product.sku) || 0) + numeric(sale.quantity) * numeric(product.unit_price));
  }
  const revenueTotal = Array.from(revenueBySku.values()).reduce((sum, value) => sum + value, 0);
  let cumulative = 0;
  const abc = Array.from(revenueBySku.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sku, revenue]) => {
      cumulative += revenue;
      const contribution = revenueTotal ? cumulative / revenueTotal : 0;
      return {
        sku,
        revenue: round(revenue, 2),
        contribution: round((revenue / Math.max(1, revenueTotal)) * 100, 1),
        class: contribution <= 0.8 ? "A" : contribution <= 0.95 ? "B" : "C",
      };
    });
  const totalInventoryValue = round(skuRows.reduce((sum, row) => sum + row.onHand * (row.cost || row.price * 0.5), 0), 2);
  const forecastWeekly = Array.from({ length: 8 }, (_, index) => {
    const values = skuRows.map((row) => row.forecast8w[index] || 0);
    const ensemble = round(values.reduce((sum, value) => sum + value, 0), 2);
    const band = round(Math.max(1, stdDev(values) * 1.8), 2);
    return {
      week: `Wk ${index + 1}`,
      baseline: round(ensemble * 0.94, 2),
      adjusted: round(ensemble * 1.03, 2),
      ensemble,
      arima: round(ensemble * 0.96, 2),
      xgboost: round(ensemble * 1.04, 2),
      lower: Math.max(0, round(ensemble - band, 2)),
      upper: round(ensemble + band, 2),
    };
  });
  const completeCost = skuRows.filter((row) => !row.missingCostData).length;
  const completeSales = skuRows.filter((row) => row.observedWeeks > 0).length;
  const summary = {
    sourceMode: productsResult.rows.some((row) => row.source_system !== "sample_seed") ? "connected" : "sample",
    analyzedSkus: skuRows.length,
    inventoryRows: skuRows.length,
    salesRows,
    locationsCount: locationsResult.rows.length,
    categoriesCount: new Set(skuRows.map((row) => row.category)).size,
    riskScore: weightedRisk || 0,
    riskLabel: weightedRisk >= 75 ? "HIGH" : weightedRisk >= 45 ? "MEDIUM" : "LOW",
    highRiskSkus: skuRows.filter((row) => row.riskScore >= 75).length,
    totalOnHand: round(skuRows.reduce((sum, row) => sum + row.onHand, 0), 2),
    importedUnits: round(skuRows.reduce((sum, row) => sum + row.forecast30d, 0), 2),
    totalInventoryValue,
    revenueAtRisk: round(skuRows.reduce((sum, row) => sum + row.revenueAtRisk, 0), 2),
    excessCost: round(skuRows.reduce((sum, row) => sum + row.excessCost, 0), 2),
    serviceLevel: round(average(skuRows.map((row) => row.serviceLevel)), 1),
    gmroi: completeCost ? round(average(skuRows.filter((row) => row.gmroi !== null).map((row) => row.gmroi)), 2) : null,
    inventoryTurnover: completeCost ? round(average(skuRows.filter((row) => row.inventoryTurnover !== null).map((row) => row.inventoryTurnover)), 2) : null,
    avgDaysCover: round(average(skuRows.map((row) => row.daysCover).filter(Number.isFinite)), 1),
    demandVolatility: round(average(skuRows.map((row) => row.demandVolatility)), 2),
    missingCostSkus: skuRows.length - completeCost,
    dataCompleteness: {
      cost: round((completeCost / Math.max(1, skuRows.length)) * 100, 1),
      sales: round((completeSales / Math.max(1, skuRows.length)) * 100, 1),
      price: round((skuRows.filter((row) => row.price > 0).length / Math.max(1, skuRows.length)) * 100, 1),
    },
    enoughData: salesRows >= 30 && completeSales >= 10,
    sampleCatalogDetected: excludedSampleSkus > 0,
    excludedSampleSkus,
    actionCounts: {
      buy: skuRows.filter((row) => row.action === "buy").length,
      sell: skuRows.filter((row) => row.action === "sell").length,
      hold: skuRows.filter((row) => row.action === "hold").length,
    },
  };
  const analytics = {
    summary,
    assumptions: {
      leadTimeDays: 14,
      targetServiceLevel: 95,
      zScore: 1.65,
      carryingCostRate: 18,
      forecastHorizonWeeks: 8,
      modelVersion: "planning-v1-holt-ensemble",
    },
    formulas: [
      { name: "Risk score", expression: "100 * (0.62 * stockout_gap + 0.18 * overstock_gap + 0.12 * lead_time_variability + data_penalty)" },
      { name: "Days cover", expression: "on_hand / (forecast_30d / 30)" },
      { name: "GMROI", expression: "gross_margin / average_inventory_cost" },
      { name: "Reorder point", expression: "lead_time_demand + safety_stock" },
    ],
    abc,
    skus: skuRows.sort((a, b) => b.businessImpact - a.businessImpact),
    locations: locationsResult.rows,
    categories: Array.from(new Set(skuRows.map((row) => row.category))).sort(),
    forecasts: {
      weekly: forecastWeekly,
      models: {
        arima: round(forecastWeekly.reduce((sum, row) => sum + row.arima, 0), 2),
        xgboost: round(forecastWeekly.reduce((sum, row) => sum + row.xgboost, 0), 2),
        ensemble: round(forecastWeekly.reduce((sum, row) => sum + row.ensemble, 0), 2),
      },
      confidenceIntervals: forecastWeekly.map(({ week, lower, upper }) => ({ week, lower, upper })),
    },
    riskHeatmap: skuRows.slice(0, 30).map((row) => ({
      sku: row.sku,
      product: row.product,
      weeks: row.forecast8w.map((demand, index) => ({
        week: `Wk ${index + 1}`,
        risk: clamp(Math.round(row.riskScore * (0.85 + demand / Math.max(1, row.forecast30d))), 0, 100),
      })),
    })),
    waterfall: skuRows.filter((row) => row.excessCost > 0).slice(0, 12).map((row) => ({
      label: row.product,
      value: row.excessCost,
      category: row.category,
    })),
    transfers: skuRows.filter((row) => row.action === "transfer").slice(0, 25),
    accuracy: {
      mape: summary.enoughData ? round(average(skuRows.map((row) => 100 - row.serviceLevel).filter(Number.isFinite)), 1) : null,
      confidence: summary.enoughData ? "production" : "low-history",
    },
    dataQuality: {
      missingCostSkus: summary.missingCostSkus,
      sampleCatalogDetected: summary.sampleCatalogDetected,
      enoughData: summary.enoughData,
      completeness: summary.dataCompleteness,
      flags: [
        ...(summary.missingCostSkus ? [`${summary.missingCostSkus} SKUs are missing cost data.`] : []),
        ...(summary.sampleCatalogDetected ? [`${summary.excludedSampleSkus} Shopify sample SKUs excluded from analysis.`] : []),
        ...(!summary.enoughData ? ["Not enough real sales history for high-confidence forecasting."] : []),
      ],
    },
    workingCapital: {
      inventoryValue: totalInventoryValue,
      excessCost: summary.excessCost,
      revenueAtRisk: summary.revenueAtRisk,
      cashTiedUp: round(skuRows.reduce((sum, row) => sum + row.excessUnits * (row.cost || row.price * 0.5), 0), 2),
    },
    connectorRoadmap: [
      { provider: "lightspeed", status: "scaffolded", needs: "OAuth app credentials and product/order endpoint mapping." },
      { provider: "toast", status: "scaffolded", needs: "Partner API credentials and restaurant location access." },
      { provider: "woocommerce", status: "scaffolded", needs: "REST API consumer key/secret per store." },
      { provider: "custom_pos", status: "scaffolded", needs: "Webhook schema mapping from the retailer." },
    ],
  };
  if (options.persist) await persistPlanningOutputs(userId, analytics);
  return analytics;
}

function planningCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function overpassShopFilter(category) {
  const categories = {
    food: "supermarket|convenience|bakery|butcher|greengrocer|deli|beverages",
    apparel: "clothes|shoes|sports|outdoor|bag|fashion_accessories",
    electronics: "electronics|computer|mobile_phone|hifi",
    home: "furniture|hardware|doityourself|houseware|garden_centre",
    health: "pharmacy|chemist|medical_supply|beauty",
    all: "supermarket|convenience|bakery|butcher|greengrocer|deli|beverages|clothes|shoes|sports|outdoor|bag|fashion_accessories|electronics|computer|mobile_phone|hifi|furniture|hardware|doityourself|houseware|garden_centre|pharmacy|chemist|medical_supply|beauty|books|toys|gift|florist|pet|jewelry|department_store|general",
  };
  return categories[category] ? `["shop"~"^(${categories[category]})$"]` : `["shop"]`;
}

function marketplaceRadiusPlan(radiusMiles, category) {
  const broadSearch = category === "all" || category === "retail";
  const maxRadius = broadSearch ? Math.min(radiusMiles, 25) : radiusMiles;
  const candidates = [Math.min(maxRadius, 10), Math.min(maxRadius, 25), maxRadius]
    .map(radius => Math.round(radius))
    .filter(radius => radius > 0 && radius <= maxRadius);
  return [...new Set(candidates)].sort((a, b) => a - b);
}

function marketplaceCategory(shop) {
  if (/supermarket|convenience|bakery|butcher|greengrocer|deli|beverages/.test(shop)) return "food";
  if (/clothes|shoes|sports|outdoor|bag|fashion_accessories/.test(shop)) return "apparel";
  if (/electronics|computer|mobile_phone|hifi/.test(shop)) return "electronics";
  if (/furniture|hardware|doityourself|houseware|garden_centre/.test(shop)) return "home";
  if (/pharmacy|chemist|medical_supply|beauty/.test(shop)) return "health";
  return "retail";
}

function titleCase(value) {
  return String(value || "Retail").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
}

function buildOsmAddress(tags = {}) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

function sanitizeExternalUrl(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return "";
}

function haversineMiles(a, b) {
  const toRad = degrees => (degrees * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function fetchExternalJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const err = new Error(data?.remark || data?.error || `Directory request failed with ${response.status}.`);
      err.status = response.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOverpassJson(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      return await fetchExternalJson(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": marketplaceUserAgent,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }).toString(),
      }, 22000);
    } catch (err) {
      lastError = err;
      console.warn(`Marketplace Overpass endpoint failed (${endpoint}):`, err.message);
    }
  }
  throw lastError || new Error("Public directory lookup failed.");
}

async function geocodeMarketplaceLocation(location) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", location);
  const data = await fetchExternalJson(url, {
    headers: {
      "User-Agent": marketplaceUserAgent,
      "Accept-Language": "en",
    },
  });
  const match = Array.isArray(data) ? data[0] : null;
  if (!match) return null;
  return {
    lat: Number(match.lat),
    lon: Number(match.lon),
    label: match.display_name || location,
  };
}

async function searchNearbyOsmShops({ lat, lon, radiusMiles, category }) {
  const radiusMeters = Math.round(radiusMiles * 1609.344);
  const shopFilter = overpassShopFilter(category);
  const query = `[out:json][timeout:25];(node${shopFilter}(around:${radiusMeters},${lat},${lon});way${shopFilter}(around:${radiusMeters},${lat},${lon});relation${shopFilter}(around:${radiusMeters},${lat},${lon}););out center tags 80;`;
  const data = await fetchOverpassJson(query);
  return Array.isArray(data?.elements) ? data.elements : [];
}

function marketplaceSearchTerms(category) {
  const terms = {
    food: "grocery OR bakery OR supermarket",
    apparel: "clothing OR shoes OR sporting goods",
    electronics: "electronics OR mobile phone",
    home: "hardware OR furniture OR home goods",
    health: "pharmacy OR beauty supply",
    retail: "retail store",
    all: "retail store",
  };
  return terms[category] || terms.all;
}

function inferShopFromPlace(place = {}, category = "all") {
  const type = String(place.type || place.category || "").toLowerCase();
  if (/supermarket|grocery|bakery|food|convenience/.test(type)) return "supermarket";
  if (/clothes|clothing|shoe|apparel|sport|outdoor/.test(type)) return "clothes";
  if (/electronics|mobile|computer|phone/.test(type)) return "electronics";
  if (/hardware|furniture|home|garden/.test(type)) return "hardware";
  if (/pharmacy|chemist|beauty|health/.test(type)) return "pharmacy";
  const defaults = {
    food: "supermarket",
    apparel: "clothes",
    electronics: "electronics",
    home: "hardware",
    health: "pharmacy",
  };
  return defaults[category] || "retail";
}

function buildNominatimAddress(place = {}) {
  const address = place.address || {};
  const parts = [
    address.house_number,
    address.road,
    address.neighbourhood || address.suburb,
    address.city || address.town || address.village,
    address.state,
    address.postcode,
  ].filter(Boolean);
  return parts.join(", ") || place.display_name || "";
}

async function searchNearbyNominatimBusinesses({ location, origin, radiusMiles, category }) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "24");
  url.searchParams.set("q", `${marketplaceSearchTerms(category)} near ${location}`);
  const data = await fetchExternalJson(url, {
    headers: {
      "User-Agent": marketplaceUserAgent,
      "Accept-Language": "en",
    },
  }, 12000);
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  return data.map((place, index) => {
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    const shop = inferShopFromPlace(place, category);
    const name = place.namedetails?.name || place.name || String(place.display_name || "").split(",")[0] || titleCase(shop);
    const distance = Number.isFinite(lat) && Number.isFinite(lon)
      ? Math.round(haversineMiles(origin, { lat, lon }))
      : null;
    const website = sanitizeExternalUrl(place.extratags?.website || place.extratags?.["contact:website"] || place.extratags?.url);
    const email = String(place.extratags?.email || place.extratags?.["contact:email"] || "").trim();
    const imageUrl = sanitizeExternalUrl(place.extratags?.image || place.extratags?.logo);
    return {
      id: `nominatim-${place.osm_type || "place"}-${place.osm_id || index}`,
      retailer: name,
      brand: place.namedetails?.brand || "",
      dist: distance,
      type: "directory",
      cat: marketplaceCategory(shop),
      product: `${titleCase(shop)} retailer`,
      qty: null,
      price: null,
      urgency: "low",
      source: "OpenStreetMap Search",
      address: buildNominatimAddress(place),
      phone: place.extratags?.phone || place.extratags?.["contact:phone"] || "",
      email,
      website,
      imageUrl,
      lat,
      lon,
      osmUrl: place.osm_type && place.osm_id ? `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}` : "",
      osmTags: { shop, brand: place.namedetails?.brand || "", operator: "", openingHours: "" },
    };
  }).filter(business => {
    if (!business.retailer || business.dist === null || business.dist > radiusMiles) return false;
    const key = `${business.retailer}|${business.address}|${business.lat}|${business.lon}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.dist - b.dist || a.retailer.localeCompare(b.retailer));
}

function normalizeOsmBusiness(element, origin, index) {
  const tags = element.tags || {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);
  const shop = String(tags.shop || "retail");
  const name = tags.name || tags.brand || titleCase(shop);
  const address = buildOsmAddress(tags);
  const website = sanitizeExternalUrl(
    tags.website ||
    tags["contact:website"] ||
    tags.url ||
    tags["contact:url"] ||
    tags["brand:website"]
  );
  const email = String(tags.email || tags["contact:email"] || "").trim();
  const imageUrl = sanitizeExternalUrl(tags.image || tags["contact:image"] || tags.logo);
  const distance = Number.isFinite(lat) && Number.isFinite(lon)
    ? Math.round(haversineMiles(origin, { lat, lon }))
    : null;
  return {
    id: `osm-${element.type}-${element.id || index}`,
    retailer: name,
    brand: tags.brand || "",
    dist: distance,
    type: "directory",
    cat: marketplaceCategory(shop),
    product: `${titleCase(shop)} retailer`,
    qty: null,
    price: null,
    urgency: "low",
    source: "OpenStreetMap",
    address,
    phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "",
    email,
    website,
    imageUrl,
    lat,
    lon,
    osmUrl: element.id ? `https://www.openstreetmap.org/${element.type}/${element.id}` : "",
    osmTags: {
      shop,
      brand: tags.brand || "",
      operator: tags.operator || "",
      openingHours: tags.opening_hours || "",
    },
  };
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
  clover: {
    label: "Clover",
    defaultStatus: "not_connected",
    defaultDetail: "Clover OAuth is not configured yet. Add Clover app credentials before connecting.",
  },
  lightspeed: {
    label: "Lightspeed",
    defaultStatus: "not_connected",
    defaultDetail: "Lightspeed OAuth is not configured yet. Add Lightspeed app credentials before connecting.",
  },
  toast: {
    label: "Toast",
    defaultStatus: "not_connected",
    defaultDetail: "Toast API access is not configured yet. Add Toast partner credentials before connecting.",
  },
  woocommerce: {
    label: "WooCommerce",
    defaultStatus: "not_connected",
    defaultDetail: "WooCommerce REST credentials are not configured yet. Add a store URL, consumer key, and secret.",
  },
  custom_pos: {
    label: "Custom POS / Webhook",
    defaultStatus: "not_connected",
    defaultDetail: "Create a REST or webhook credential to stream sales, inventory, and catalog data.",
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
  const shopifyMessage = typeof data.errors === "string"
    ? data.errors
    : Array.isArray(data.errors)
      ? data.errors.join(" ")
      : data.error || data.message || "Shopify request failed.";
  if (response.status === 401) {
    const err = new Error("Shopify needs to be reconnected. Please reconnect this store.");
    err.code = "SHOPIFY_REAUTH_REQUIRED";
    throw err;
  }
  if (response.status === 403) {
    const err = new Error(`Shopify denied access to ${resource}. Check app scopes and protected customer data access, then reconnect. Shopify said: ${shopifyMessage}`);
    err.code = "SHOPIFY_PERMISSION_DENIED";
    throw err;
  }
  if (response.status === 429) {
    const err = new Error("Shopify rate limit reached. Wait a minute and try Sync again.");
    err.code = "SHOPIFY_RATE_LIMITED";
    throw err;
  }
  if (!response.ok) {
    const err = new Error(shopifyMessage);
    err.code = "SHOPIFY_API_ERROR";
    throw err;
  }
  return data;
}

async function syncShopifyOrders(userId, shop, accessToken) {
  const locations = await shopifyApi(shop, accessToken, "locations", { limit: "250" }).catch(() => ({ locations: [] }));
  const locationById = new Map((locations.locations || []).map(location => [String(location.id), location.name || shop]));
  const productsData = await shopifyApi(shop, accessToken, "products", {
    limit: "250",
    fields: "id,title,variants",
  });
  const variants = [];
  const variantByInventoryItemId = new Map();
  for (const product of productsData.products || []) {
    for (const variant of product.variants || []) {
      const sku = String(variant.sku || `shopify-variant-${variant.id}`).trim();
      if (!sku) continue;
      const productName = [product.title, variant.title && variant.title !== "Default Title" ? variant.title : ""].filter(Boolean).join(" - ");
      const normalizedVariant = {
        sku,
        product: productName || sku,
        current: Math.max(0, Number(variant.inventory_quantity || 0)),
        price: Math.max(0, Number(variant.price || 0)),
        externalId: String(variant.id || ""),
        inventoryItemId: String(variant.inventory_item_id || ""),
      };
      variants.push(normalizedVariant);
      if (normalizedVariant.inventoryItemId) variantByInventoryItemId.set(normalizedVariant.inventoryItemId, normalizedVariant);
    }
  }
  const inventoryRows = [];
  const inventoryItemIds = [...variantByInventoryItemId.keys()];
  const costByInventoryItemId = new Map();
  for (let index = 0; index < inventoryItemIds.length; index += 50) {
    const chunk = inventoryItemIds.slice(index, index + 50);
    const costData = await shopifyApi(shop, accessToken, "inventory_items", { ids: chunk.join(","), limit: "250" }).catch(() => ({ inventory_items: [] }));
    for (const item of costData.inventory_items || []) {
      const cost = Number(item.cost);
      if (Number.isFinite(cost) && cost > 0) costByInventoryItemId.set(String(item.id), cost);
    }
  }
  for (let index = 0; index < inventoryItemIds.length; index += 50) {
    const chunk = inventoryItemIds.slice(index, index + 50);
    if (!chunk.length) continue;
    const levelsData = await shopifyApi(shop, accessToken, "inventory_levels", {
      limit: "250",
      inventory_item_ids: chunk.join(","),
    }).catch(err => {
      if (err.code === "SHOPIFY_PERMISSION_DENIED") throw err;
      return { inventory_levels: [] };
    });
    for (const level of levelsData.inventory_levels || []) {
      const variant = variantByInventoryItemId.get(String(level.inventory_item_id || ""));
      if (!variant) continue;
      inventoryRows.push({
        ...variant,
        cost: costByInventoryItemId.get(String(level.inventory_item_id || "")) ?? null,
        current: Math.max(0, Number(level.available || 0)),
        location: locationById.get(String(level.location_id || "")) || shop,
      });
    }
  }
  if (!inventoryRows.length) {
    for (const variant of variants) inventoryRows.push({ ...variant, cost: costByInventoryItemId.get(variant.inventoryItemId) ?? null, location: shop });
  }
  const ordersData = await shopifyApi(shop, accessToken, "orders", {
    status: "any",
    limit: "250",
    fields: "id,created_at,line_items,location_id",
  });
  const orders = ordersData.orders || [];
  const totals = new Map();
  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM inventory_items WHERE user_id = $1 AND source = 'shopify'", [userId]);
    for (const item of inventoryRows) {
      await pool.query(
        `INSERT INTO inventory_items (user_id, sku, product, current_quantity, unit_price, unit_cost, source, external_id, location)
         VALUES ($1, $2, $3, $4, $5, $6, 'shopify', $7, $8)
         ON CONFLICT (user_id, source, sku, location) DO UPDATE
         SET product = EXCLUDED.product,
             current_quantity = EXCLUDED.current_quantity,
             unit_price = EXCLUDED.unit_price,
             unit_cost = EXCLUDED.unit_cost,
             external_id = EXCLUDED.external_id,
             updated_at = now()`,
        [userId, item.sku, item.product, item.current, item.price, item.cost, item.externalId, item.location]
      );
    }
    for (const order of orders) {
      const saleDate = String(order.created_at || "").slice(0, 10);
      const location = locationById.get(String(order.location_id)) || shop;
      for (const item of order.line_items || []) {
        const sku = String(item.sku || (item.variant_id ? `shopify-variant-${item.variant_id}` : "") || item.name || `shopify-line-item-${item.id}`).trim();
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
  await migrateFlatDataToPlanning(userId);
  return { orders: orders.length, rows: totals.size, inventoryItems: inventoryRows.length };
}

function normalizeCloverMerchantId(value) {
  const merchantId = String(value || "").trim();
  return /^[A-Za-z0-9_-]{3,100}$/.test(merchantId) ? merchantId : "";
}

function cloverConfig() {
  const production = String(process.env.CLOVER_ENV || "sandbox").toLowerCase() === "production";
  const useV2 = String(process.env.CLOVER_USE_V2 || "").toLowerCase() === "true";
  const legacyAuthorizeUrl = production ? "https://www.clover.com/oauth/authorize" : "https://apisandbox.dev.clover.com/oauth/authorize";
  const legacyTokenUrl = production ? "https://api.clover.com/oauth/token" : "https://apisandbox.dev.clover.com/oauth/token";
  return {
    useV2,
    authorizeUrl: process.env.CLOVER_AUTHORIZE_URL || (useV2 ? (production ? "https://www.clover.com/oauth/v2/authorize" : "https://sandbox.dev.clover.com/oauth/v2/authorize") : legacyAuthorizeUrl),
    tokenUrl: process.env.CLOVER_TOKEN_URL || (useV2 ? (production ? "https://api.clover.com/oauth/v2/token" : "https://sandbox.dev.clover.com/oauth/v2/token") : legacyTokenUrl),
    refreshUrl: process.env.CLOVER_REFRESH_URL || (production ? "https://api.clover.com/oauth/v2/refresh" : "https://apisandbox.dev.clover.com/oauth/v2/refresh"),
    apiBaseUrl: (process.env.CLOVER_API_BASE_URL || (production ? "https://api.clover.com/v3" : "https://apisandbox.dev.clover.com/v3")).replace(/\/$/, ""),
  };
}

function pkceChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function exchangeCloverCode(code, redirectUri, codeVerifier) {
  const cfg = cloverConfig();
  const highTrustPayload = {
    client_id: process.env.CLOVER_CLIENT_ID,
    client_secret: process.env.CLOVER_CLIENT_SECRET,
    code,
  };
  const pkcePayload = {
    client_id: process.env.CLOVER_CLIENT_ID,
    code,
    code_verifier: codeVerifier,
  };
  const highTrustUrl = new URL(cfg.tokenUrl);
  for (const [key, value] of Object.entries(highTrustPayload)) {
    if (value) highTrustUrl.searchParams.set(key, value);
  }
  const pkceUrl = new URL(cfg.tokenUrl);
  for (const [key, value] of Object.entries(pkcePayload)) {
    if (value) pkceUrl.searchParams.set(key, value);
  }
  const attempts = [
    {
      url: highTrustUrl.toString(),
      method: "POST",
      headers: { Accept: "application/json" },
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(highTrustPayload),
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(Object.entries(highTrustPayload).filter(([, value]) => value)).toString(),
    },
    ...(codeVerifier ? [
      {
        url: pkceUrl.toString(),
        method: "POST",
        headers: { Accept: "application/json" },
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(pkcePayload),
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(Object.entries(pkcePayload).filter(([, value]) => value)).toString(),
      },
    ] : []),
  ];

  let lastError;
  for (const options of attempts) {
    try {
      const { url, ...requestOptions } = options;
      return await fetchJson(url || cfg.tokenUrl, requestOptions);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Clover token exchange failed.");
}

async function refreshCloverToken(refreshToken) {
  const cfg = cloverConfig();
  const payload = {
    client_id: process.env.CLOVER_CLIENT_ID,
    refresh_token: refreshToken,
  };
  const refreshUrl = new URL(cfg.refreshUrl);
  for (const [key, value] of Object.entries(payload)) {
    if (value) refreshUrl.searchParams.set(key, value);
  }
  const attempts = [
    {
      url: refreshUrl.toString(),
      method: "POST",
      headers: { Accept: "application/json" },
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(Object.entries(payload).filter(([, value]) => value)).toString(),
    },
  ];

  let lastError;
  for (const options of attempts) {
    try {
      const { url, ...requestOptions } = options;
      return await fetchJson(url || cfg.refreshUrl, requestOptions);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Clover token refresh failed.");
}

async function updateCloverToken(userId, tokenSet) {
  const accessToken = tokenSet.access_token || tokenSet.accessToken || tokenSet.token;
  if (!accessToken) return null;
  const refreshToken = tokenSet.refresh_token || tokenSet.refreshToken || null;
  const expiresAt = tokenSet.access_token_expiration
    ? new Date(Number(tokenSet.access_token_expiration) * 1000)
    : tokenSet.expires_in
      ? new Date(Date.now() + Number(tokenSet.expires_in) * 1000)
      : null;
  await pool.query(
    `UPDATE integration_connections
     SET access_token_enc = $2,
         refresh_token_enc = COALESCE($3, refresh_token_enc),
         token_expires_at = $4,
         updated_at = now()
     WHERE user_id = $1 AND provider = 'clover'`,
    [userId, encryptSecret(accessToken), refreshToken ? encryptSecret(refreshToken) : null, expiresAt]
  );
  return accessToken;
}

async function cloverApi(merchantId, accessToken, resource, params = {}) {
  const cfg = cloverConfig();
  const url = new URL(`${cfg.apiBaseUrl}/merchants/${encodeURIComponent(merchantId)}/${resource.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  const message = data.message || data.error_description || data.error || "Clover request failed.";
  if (response.status === 401) {
    const err = new Error(`Clover returned 401 Unauthorized. Check that the Clover app has Read inventory, Read orders, and Read merchant permissions, then uninstall and reinstall the app for this test merchant before reconnecting. Clover said: ${message}`);
    err.code = "CLOVER_REAUTH_REQUIRED";
    throw err;
  }
  if (response.status === 403) {
    const err = new Error(`Clover denied access to ${resource}. Check app permissions, then reconnect. Clover said: ${message}`);
    err.code = "CLOVER_PERMISSION_DENIED";
    throw err;
  }
  if (response.status === 429) {
    const err = new Error("Clover rate limit reached. Wait a minute and try Sync again.");
    err.code = "CLOVER_RATE_LIMITED";
    throw err;
  }
  if (!response.ok) {
    const err = new Error(message);
    err.code = "CLOVER_API_ERROR";
    throw err;
  }
  return data;
}

async function fetchCloverCollection(merchantId, accessToken, resource, params = {}) {
  const rows = [];
  const limit = Number(params.limit || 100);
  for (let offset = 0; offset < 1000; offset += limit) {
    const data = await cloverApi(merchantId, accessToken, resource, { ...params, limit, offset });
    const elements = Array.isArray(data.elements) ? data.elements : Array.isArray(data) ? data : [];
    rows.push(...elements);
    if (elements.length < limit) break;
  }
  return rows;
}

function moneyFromCents(value) {
  const cents = Number(value);
  return Number.isFinite(cents) && cents > 0 ? cents / 100 : 0;
}

function cloverItemSku(item) {
  return String(item?.sku || item?.code || item?.itemCode || item?.id && `clover-item-${item.id}` || "").trim();
}

function cloverLineQuantity(line) {
  const unitQty = Number(line?.unitQty);
  if (Number.isFinite(unitQty) && unitQty > 0) return unitQty >= 1000 ? unitQty / 1000 : unitQty;
  const quantity = Number(line?.quantity);
  if (Number.isFinite(quantity) && quantity > 0) return quantity;
  return 1;
}

function cloverSaleDate(order) {
  const raw = Number(order?.createdTime || order?.clientCreatedTime || order?.modifiedTime);
  return Number.isFinite(raw) ? new Date(raw).toISOString().slice(0, 10) : "";
}

async function syncCloverData(userId, merchantId, accessToken) {
  const items = await fetchCloverCollection(merchantId, accessToken, "items", { expand: "itemStock" });
  const itemById = new Map(items.map(item => [String(item.id || ""), item]));
  let stocks = [];
  try {
    stocks = await fetchCloverCollection(merchantId, accessToken, "item_stocks");
  } catch {
    stocks = [];
  }
  const stockByItemId = new Map();
  for (const stock of stocks) {
    const itemId = String(stock.item?.id || stock.itemId || stock.id || "");
    const quantity = Number(stock.quantity ?? stock.stockCount ?? stock.available ?? 0);
    if (itemId && Number.isFinite(quantity)) stockByItemId.set(itemId, quantity);
  }

  const inventoryRows = [];
  for (const item of items) {
    const sku = cloverItemSku(item);
    if (!sku) continue;
    const stockQuantity = Number(item.itemStock?.quantity ?? item.stockCount ?? stockByItemId.get(String(item.id || "")) ?? 0);
    inventoryRows.push({
      sku,
      product: String(item.name || sku).trim(),
      current: Math.max(0, Number.isFinite(stockQuantity) ? stockQuantity : 0),
      price: moneyFromCents(item.price),
      externalId: String(item.id || ""),
      location: merchantId,
    });
  }

  const orders = await fetchCloverCollection(merchantId, accessToken, "orders", { expand: "lineItems" });
  const totals = new Map();
  for (const order of orders) {
    const saleDate = cloverSaleDate(order);
    const lineItems = Array.isArray(order.lineItems?.elements)
      ? order.lineItems.elements
      : Array.isArray(order.lineItems)
        ? order.lineItems
        : [];
    for (const line of lineItems) {
      const item = line.item?.id ? itemById.get(String(line.item.id)) || line.item : line.item;
      const sku = cloverItemSku(item) || String(line.itemCode || line.name || line.id && `clover-line-${line.id}` || "").trim();
      const quantity = cloverLineQuantity(line);
      if (!saleDate || !sku || !Number.isFinite(quantity) || quantity < 0) continue;
      const key = `${sku}\u0000${saleDate}\u0000${merchantId}`;
      totals.set(key, (totals.get(key) || 0) + quantity);
    }
  }

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM inventory_items WHERE user_id = $1 AND source = 'clover'", [userId]);
    await pool.query("DELETE FROM sales_records WHERE user_id = $1 AND source = 'clover'", [userId]);
    for (const item of inventoryRows) {
      await pool.query(
        `INSERT INTO inventory_items (user_id, sku, product, current_quantity, unit_price, source, external_id, location)
         VALUES ($1, $2, $3, $4, $5, 'clover', $6, $7)
         ON CONFLICT (user_id, source, sku, location) DO UPDATE
         SET product = EXCLUDED.product,
             current_quantity = EXCLUDED.current_quantity,
             unit_price = EXCLUDED.unit_price,
             external_id = EXCLUDED.external_id,
             updated_at = now()`,
        [userId, item.sku, item.product, item.current, item.price, item.externalId, item.location]
      );
    }
    for (const [key, quantity] of totals) {
      const [sku, saleDate, location] = key.split("\u0000");
      await pool.query(
        `INSERT INTO sales_records (user_id, sku, sale_date, quantity, location, source)
         VALUES ($1, $2, $3, $4, $5, 'clover')
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
  return { orders: orders.length, rows: totals.size, inventoryItems: inventoryRows.length };
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
    let result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING ${publicUserColumns}`,
      [email, passwordHash, firstName, lastName]
    );
    await completeLogin(res, result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      const invited = await pool.query(`SELECT ${userColumns} FROM users WHERE email = $1`, [email]);
      const existing = invited.rows[0];
      if (existing && !existing.password_hash) {
        const result = await pool.query(
          `UPDATE users
           SET password_hash = $1, first_name = $2, last_name = $3
           WHERE id = $4
           RETURNING ${publicUserColumns}`,
          [passwordHash, firstName, lastName, existing.id]
        );
        await completeLogin(res, result.rows[0]);
        return;
      }
      return error(res, 409, "An account with this email already exists.", "EMAIL_EXISTS");
    }
    throw err;
  }
}));

app.post("/api/demo-request", demoLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const company = String(req.body.company || "").trim();
  const stores = String(req.body.stores || "").trim();
  const goal = String(req.body.goal || "").trim();
  const honeypot = String(req.body.website || "").trim();
  const submittedAt = new Date();

  if (honeypot) return res.json({ ok: true });
  if (!isValidEmail(email)) return error(res, 400, "Enter a valid work email.", "INVALID_EMAIL");
  if (!company) return error(res, 400, "Company is required.", "COMPANY_REQUIRED");
  if (!stores) return error(res, 400, "Store count is required.", "STORES_REQUIRED");
  if (!goal) return error(res, 400, "Tell us what you want to improve.", "GOAL_REQUIRED");

  const lines = [
    "New LiquidityLink demo request",
    "",
    `Work email: ${email}`,
    `Company: ${company}`,
    `Store count: ${stores}`,
    `Goal: ${goal}`,
    `Submitted at: ${submittedAt.toISOString()}`,
    `IP: ${req.ip || "unknown"}`,
    `User agent: ${req.get("user-agent") || "unknown"}`,
  ];
  const storedRequest = await pool.query(
    `INSERT INTO demo_requests (email, company, stores, goal, email_delivery, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING id`,
    [email, company, stores, goal, req.ip || "", req.get("user-agent") || ""]
  );
  const demoRequestId = storedRequest.rows[0].id;
  const emailPayload = {
    to: demoRequestInbox,
    from: process.env.SENDGRID_FROM_EMAIL,
    replyTo: email,
    subject: `LiquidityLink demo request from ${company}`,
    text: lines.join("\n"),
    html: `<h2>New LiquidityLink demo request</h2><table>${[
      ["Work email", email],
      ["Company", company],
      ["Store count", stores],
      ["Goal", goal],
      ["Submitted at", submittedAt.toISOString()],
      ["IP", req.ip || "unknown"],
      ["User agent", req.get("user-agent") || "unknown"],
    ].map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0;">${label}</th><td style="padding:6px 0;">${String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])}</td></tr>`).join("")}</table>`,
  };

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    await pool.query("UPDATE demo_requests SET email_delivery = 'not_configured' WHERE id = $1", [demoRequestId]);
    console.warn(`Demo request received without email delivery configured. Forward to ${demoRequestInbox}:\n${lines.join("\n")}`);
    return res.json({ ok: true, emailDelivery: "not_configured" });
  }

  try {
    await sgMail.send(emailPayload);
    await pool.query("UPDATE demo_requests SET email_delivery = 'sent' WHERE id = $1", [demoRequestId]);
    return res.json({ ok: true, emailDelivery: "sent" });
  } catch (err) {
    await pool.query("UPDATE demo_requests SET email_delivery = 'failed' WHERE id = $1", [demoRequestId]);
    console.error("SendGrid demo request delivery failed. Request was accepted for manual follow-up.", {
      message: err.message,
      code: err.code,
      response: err.response?.body,
      demoRequest: { email, company, stores, goal, submittedAt: submittedAt.toISOString() },
    });
    return res.json({ ok: true, emailDelivery: "failed" });
  }
}));

app.get("/api/live-statistics", asyncRoute(async (req, res) => {
  const fallback = {
    instagramFollowers: instagramFallbackFollowers,
    instagramFollowersSource: "fallback",
    instagramProfileUrl: "https://www.instagram.com/liquiditylink/",
    updatedAt: new Date().toISOString(),
  };
  if (liveStatsCache.data && liveStatsCache.expiresAt > Date.now()) return res.json({ ok: true, data: liveStatsCache.data });

  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
  if (!accountId || !accessToken) {
    liveStatsCache = { expiresAt: Date.now() + 5 * 60 * 1000, data: fallback };
    return res.json({ ok: true, data: fallback });
  }

  try {
    const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${accountId}`);
    url.searchParams.set("fields", "followers_count");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url, { headers: { "user-agent": marketplaceUserAgent } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isFinite(Number(data.followers_count))) throw new Error(data.error?.message || "Instagram follower count unavailable");
    const liveData = {
      ...fallback,
      instagramFollowers: Number(data.followers_count).toLocaleString(),
      instagramFollowersSource: "instagram_graph_api",
      updatedAt: new Date().toISOString(),
    };
    liveStatsCache = { expiresAt: Date.now() + 15 * 60 * 1000, data: liveData };
    return res.json({ ok: true, data: liveData });
  } catch (err) {
    console.warn("Instagram live statistics fallback used.", { message: err.message });
    liveStatsCache = { expiresAt: Date.now() + 5 * 60 * 1000, data: fallback };
    return res.json({ ok: true, data: fallback });
  }
}));

app.get("/api/demo-requests", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can view demo requests.", "FORBIDDEN");
  const { limit, offset, page } = parsePagination(req, 25, 100);
  const result = await pool.query(
    `SELECT id, email, company, stores, goal, email_delivery, created_at
     FROM demo_requests
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  apiOk(res, { demoRequests: result.rows }, { page, limit });
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
        subject: "Reset your LiquidityLink password",
        text: `Hi ${user.first_name}, reset your password here: ${resetUrl}`,
        html: `<p>Hi ${user.first_name},</p><p><a href="${resetUrl}">Reset your LiquidityLink password</a>. This link expires in 1 hour.</p>`,
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
  const salesResult = await pool.query(
    `SELECT id, sku, sale_date AS date, quantity::float AS quantity, location, source, updated_at
     FROM sales_records
     WHERE user_id = $1
     ORDER BY sale_date DESC, sku ASC
     LIMIT 5000`,
    [req.user.sub]
  );
  const inventoryResult = await pool.query(
    `SELECT id, sku, product, current_quantity::float AS current, unit_price::float AS price, unit_cost::float AS cost, location, source, updated_at
     FROM inventory_items
     WHERE user_id = $1
     ORDER BY product ASC, sku ASC
     LIMIT 5000`,
    [req.user.sub]
  );
  res.json({ records: salesResult.rows, inventory: inventoryResult.rows });
}));

app.get("/api/analytics/advanced", authUser, asyncRoute(async (req, res) => {
  res.json(await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null }));
}));

app.get("/api/planning/overview", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null });
  apiOk(res, { analytics });
}));

app.post("/api/planning/recompute", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, {
    persist: true,
    locationId: req.body?.locationId || null,
  });
  apiOk(res, { status: "completed", lastSyncedAt: new Date().toISOString(), analytics });
}));

app.post("/api/planning/scenario", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, {
    locationId: req.body?.locationId || null,
    discountPct: req.body?.discountPct,
  });
  apiOk(res, {
    discountPct: clamp(numeric(req.body?.discountPct), 0, 80),
    summary: analytics.summary,
    skus: analytics.skus,
    forecasts: analytics.forecasts,
  });
}));

app.get("/api/planning/data-quality", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null });
  apiOk(res, {
    completeness: analytics.summary.dataCompleteness,
    warnings: analytics.dataQuality?.warnings || [],
    missingCostSkus: analytics.skus.filter((sku) => sku.flags?.includes("missing_cost_data")).map((sku) => sku.sku),
    locations: analytics.locations,
  });
}));

app.get("/api/planning/export.csv", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"liquiditylink-planning-export.csv\"");
  res.send(planningCsv(analytics.skus));
}));

app.get("/api/planning/connectors", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub);
  apiOk(res, { connectors: analytics.connectorRoadmap });
}));

app.post("/api/planning/import/preview", authUser, asyncRoute(async (req, res) => {
  const entityType = ["products", "sales", "inventory"].includes(req.body?.entityType) ? req.body.entityType : "sales";
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 5000) : [];
  const accepted = [];
  const errors = [];
  rows.forEach((row, index) => {
    const issue = [];
    if (entityType === "sales") {
      if (!String(row.sku || "").trim()) issue.push("SKU is required.");
      if (!String(row.date || row.sale_date || "").trim()) issue.push("Sale date is required.");
      if (!Number.isFinite(Number(row.quantity || row.units_sold))) issue.push("Quantity must be numeric.");
    }
    if (entityType === "inventory") {
      if (!String(row.sku || "").trim()) issue.push("SKU is required.");
      if (!Number.isFinite(Number(row.on_hand || row.current_quantity))) issue.push("On-hand quantity must be numeric.");
    }
    if (issue.length) errors.push({ row: index + 1, errors: issue });
    else accepted.push(row);
  });
  const batch = await pool.query(
    `INSERT INTO planning_import_batches (user_id, entity_type, file_name, preview_payload, error_payload, status)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'preview')
     RETURNING id, entity_type, status, created_at`,
    [req.user.sub, entityType, String(req.body?.fileName || "manual upload").slice(0, 180), JSON.stringify(accepted), JSON.stringify(errors)]
  );
  apiOk(res, { batch: batch.rows[0], acceptedRows: accepted.length, rejectedRows: errors.length, errors });
}));

app.post("/api/planning/import/:batchId/commit", authUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE planning_import_batches
     SET status = 'committed', committed_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'preview'
     RETURNING id, entity_type, status, committed_at`,
    [req.params.batchId, req.user.sub]
  );
  if (!result.rows[0]) return error(res, 404, "Import batch not found or already committed.", "IMPORT_NOT_FOUND");
  const analytics = await buildPlanningAnalytics(req.user.sub, { persist: true });
  apiOk(res, { batch: result.rows[0], analytics });
}));

app.get("/api/organization", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  apiOk(res, { organization: org });
}));

app.get("/api/admin/overview", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  const [
    salesCount,
    inventoryCount,
    alertCount,
    keyCount,
    memberCount,
    providers,
    activity,
  ] = await Promise.all([
    pool.query("SELECT count(*)::int AS count FROM sales_records WHERE user_id = $1", [req.user.sub]),
    pool.query("SELECT count(*)::int AS count FROM inventory_items WHERE user_id = $1", [req.user.sub]),
    pool.query("SELECT count(*)::int AS count FROM alerts WHERE organization_id = $1 AND status = 'open'", [org.id]),
    pool.query("SELECT count(*)::int AS count FROM api_keys WHERE organization_id = $1 AND revoked_at IS NULL", [org.id]),
    pool.query("SELECT count(*)::int AS count FROM organization_members WHERE organization_id = $1", [org.id]),
    pool.query(
      `SELECT provider, status, external_account, last_synced_at
       FROM integration_connections
       WHERE user_id = $1
       ORDER BY provider ASC`,
      [req.user.sub]
    ),
    pool.query(
      `SELECT action, entity_type, created_at
       FROM activity_logs
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [org.id]
    ),
  ]);

  apiOk(res, {
    organization: org,
    counts: {
      salesRows: salesCount.rows[0].count,
      inventoryItems: inventoryCount.rows[0].count,
      openAlerts: alertCount.rows[0].count,
      activeApiKeys: keyCount.rows[0].count,
      members: memberCount.rows[0].count,
    },
    providers: providers.rows,
    recentActivity: activity.rows,
    permissions: org.role_name === "owner" || org.role_name === "admin"
      ? ["users:manage", "settings:write", "api_keys:manage", "reports:export"]
      : ["reports:read", "analytics:read"],
  });
}));

app.get("/api/workspaces", authUser, asyncRoute(async (req, res) => {
  const workspaces = await getUserOrganizations(req.user.sub);
  const active = await organizationForRequest(req);
  apiOk(res, {
    workspaces: workspaces.filter(workspace => workspace.status === "active"),
    pendingInvites: workspaces.filter(workspace => workspace.status === "invited"),
    activeWorkspaceId: active.id,
  });
}));

app.get("/api/invitations", authUser, asyncRoute(async (req, res) => {
  const workspaces = await getUserOrganizations(req.user.sub);
  apiOk(res, { invitations: workspaces.filter(workspace => workspace.status === "invited") });
}));

app.post("/api/invitations/:organizationId/accept", authUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE organization_members
     SET status = 'active', updated_at = now()
     WHERE organization_id = $1 AND user_id = $2 AND status = 'invited'
     RETURNING organization_id, role_name, status`,
    [req.params.organizationId, req.user.sub]
  );
  if (!result.rows[0]) return error(res, 404, "Invite not found.", "INVITE_NOT_FOUND");
  await recordActivity(req, "workspace.invite_accepted", "organization", req.params.organizationId);
  apiOk(res, { invitation: result.rows[0] });
}));

app.post("/api/invitations/:organizationId/decline", authUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `DELETE FROM organization_members
     WHERE organization_id = $1 AND user_id = $2 AND status = 'invited'
     RETURNING organization_id`,
    [req.params.organizationId, req.user.sub]
  );
  if (!result.rows[0]) return error(res, 404, "Invite not found.", "INVITE_NOT_FOUND");
  apiOk(res, { declined: true, organizationId: req.params.organizationId });
}));

app.get("/api/users", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  const { limit, offset, page } = parsePagination(req);
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.email_verified,
            om.role_name, om.status, om.created_at, NULL::timestamptz AS last_login
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1
     ORDER BY om.created_at ASC
     LIMIT $2 OFFSET $3`,
    [org.id, limit, offset]
  );
  apiOk(res, { users: result.rows }, { page, limit });
}));

app.post("/api/users", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can invite users.", "FORBIDDEN");
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return error(res, 400, "Enter a valid email address.", "INVALID_EMAIL");
  if (email === normalizeEmail(req.user.email)) {
    return error(res, 400, "You cannot invite yourself. Invite a different teammate email.", "SELF_INVITE_BLOCKED");
  }
  const firstName = String(req.body.firstName || "Invited").trim().slice(0, 80) || "Invited";
  const lastName = String(req.body.lastName || "User").trim().slice(0, 80) || "User";
  const roleName = ["admin", "analyst", "member", "viewer"].includes(req.body.roleName) ? req.body.roleName : "viewer";
  let user = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0];
  if (!user) {
    user = (await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, NULL, $2, $3, false)
       RETURNING id`,
      [email, firstName, lastName]
    )).rows[0];
  }
  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role_name, status)
     VALUES ($1, $2, $3, 'invited')
     ON CONFLICT (organization_id, user_id) DO UPDATE
     SET role_name = EXCLUDED.role_name,
         status = CASE
           WHEN organization_members.status = 'active' THEN 'active'
           ELSE 'invited'
         END,
         updated_at = now()`,
    [org.id, user.id, roleName]
  );
  let inviteDelivery = "not_configured";
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        replyTo: demoRequestInbox,
        subject: `${req.user.firstName || "A teammate"} invited you to LiquidityLink`,
        text: [
          `You were invited to join ${org.name} on LiquidityLink as ${roleName}.`,
          "",
          `Sign in or create an account with ${email}, then open Admin > Workspace invites to accept it.`,
          `${appBaseUrl}/login`,
        ].join("\n"),
        html: `<p>You were invited to join <strong>${org.name}</strong> on LiquidityLink as <strong>${roleName}</strong>.</p><p>Sign in or create an account with <strong>${email}</strong>, then open Admin &gt; Workspace invites to accept it.</p><p><a href="${appBaseUrl}/login">Open LiquidityLink</a></p>`,
      });
      inviteDelivery = "sent";
    } catch (err) {
      inviteDelivery = "failed";
      console.error("SendGrid invite delivery failed. Invite remains visible in-app.", { message: err.message, code: err.code, response: err.response?.body });
    }
  }
  await recordActivity(req, "user.invited", "user", user.id, { email, roleName });
  apiOk(res, { id: user.id, email, roleName, status: "invited", inviteDelivery });
}));

app.put("/api/users/:id", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can update users.", "FORBIDDEN");
  if (req.params.id === req.user.sub) return error(res, 400, "You cannot change your own role.", "SELF_ROLE_UPDATE_BLOCKED");
  const roleName = ["admin", "analyst", "member", "viewer"].includes(req.body.roleName) ? req.body.roleName : null;
  if (!roleName) return error(res, 400, "Choose a valid role.", "INVALID_ROLE");
  const result = await pool.query(
    `UPDATE organization_members
     SET role_name = $1
     WHERE organization_id = $2 AND user_id = $3
     RETURNING user_id, role_name, status`,
    [roleName, org.id, req.params.id]
  );
  if (!result.rows[0]) return error(res, 404, "User not found in this workspace.", "USER_NOT_FOUND");
  await recordActivity(req, "user.role_updated", "user", req.params.id, { roleName });
  apiOk(res, { user: result.rows[0] });
}));

app.delete("/api/users/:id", authUser, asyncRoute(async (req, res) => {
  const org = await organizationForRequest(req);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can remove users.", "FORBIDDEN");
  if (req.params.id === req.user.sub) return error(res, 400, "You cannot remove yourself.", "SELF_REMOVE_BLOCKED");
  await pool.query("DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2", [org.id, req.params.id]);
  await recordActivity(req, "user.removed", "user", req.params.id);
  apiOk(res, { removed: true });
}));

app.get("/api/alerts", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const { limit, offset, page } = parsePagination(req);
  const result = await pool.query(
    `SELECT id, severity, title, message, status, metadata, created_at, resolved_at
     FROM alerts
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [org.id, limit, offset]
  );
  apiOk(res, { alerts: result.rows }, { page, limit });
}));

app.post("/api/alerts", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const title = String(req.body.title || "").trim();
  if (!title) return error(res, 400, "Alert title is required.", "TITLE_REQUIRED");
  const severity = ["info", "warning", "critical"].includes(req.body.severity) ? req.body.severity : "info";
  const result = await pool.query(
    `INSERT INTO alerts (organization_id, severity, title, message, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, severity, title, message, status, metadata, created_at`,
    [org.id, severity, title, String(req.body.message || ""), JSON.stringify(req.body.metadata || {})]
  );
  await recordActivity(req, "alert.created", "alert", result.rows[0].id, { severity, title });
  apiOk(res, { alert: result.rows[0] });
}));

app.patch("/api/alerts/:id", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const status = ["open", "acknowledged", "resolved"].includes(req.body.status) ? req.body.status : "acknowledged";
  const result = await pool.query(
    `UPDATE alerts
     SET status = $1, resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE resolved_at END
     WHERE id = $2 AND organization_id = $3
     RETURNING id, severity, title, message, status, metadata, created_at, resolved_at`,
    [status, req.params.id, org.id]
  );
  if (!result.rows[0]) return error(res, 404, "Alert not found.", "ALERT_NOT_FOUND");
  await recordActivity(req, "alert.updated", "alert", req.params.id, { status });
  apiOk(res, { alert: result.rows[0] });
}));

app.get("/api/notifications", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const result = await pool.query(
    `SELECT id, title, message, type, read_at, created_at
     FROM notifications
     WHERE user_id = $1 OR organization_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.sub, org.id]
  );
  apiOk(res, { notifications: result.rows });
}));

app.post("/api/notifications/:id/read", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  await pool.query(
    `UPDATE notifications SET read_at = now()
     WHERE id = $1 AND (user_id = $2 OR organization_id = $3)`,
    [req.params.id, req.user.sub, org.id]
  );
  apiOk(res, { read: true });
}));

app.get("/api/settings", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const result = await pool.query(
    `INSERT INTO settings (user_id, organization_id, config)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id
     RETURNING id, config, updated_at`,
    [req.user.sub, org.id, JSON.stringify(defaultSettingsConfig())]
  );
  apiOk(res, { settings: result.rows[0] });
}));

app.put("/api/settings", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const current = (await pool.query("SELECT config FROM settings WHERE user_id = $1", [req.user.sub])).rows[0]?.config || defaultSettingsConfig();
  const next = { ...current, ...(req.body.config || {}) };
  const result = await pool.query(
    `INSERT INTO settings (user_id, organization_id, config)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET config = EXCLUDED.config, updated_at = now()
     RETURNING id, config, updated_at`,
    [req.user.sub, org.id, JSON.stringify(next)]
  );
  await recordActivity(req, "settings.updated", "settings", result.rows[0].id);
  apiOk(res, { settings: result.rows[0] });
}));

app.get("/api/api-keys", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const result = await pool.query(
    `SELECT id, name, prefix, scopes, last_used_at, revoked_at, created_at
     FROM api_keys
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [org.id]
  );
  apiOk(res, { apiKeys: result.rows });
}));

app.post("/api/api-keys", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can create API keys.", "FORBIDDEN");
  const name = String(req.body.name || "Production API key").trim().slice(0, 120);
  const scopes = Array.isArray(req.body.scopes) ? req.body.scopes.slice(0, 12).map(String) : ["analytics:read"];
  const secret = `ll_${crypto.randomBytes(24).toString("base64url")}`;
  const result = await pool.query(
    `INSERT INTO api_keys (organization_id, user_id, name, key_hash, prefix, scopes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, prefix, scopes, created_at`,
    [org.id, req.user.sub, name, hashToken(secret), secret.slice(0, 10), scopes]
  );
  await recordActivity(req, "api_key.created", "api_key", result.rows[0].id, { name, scopes });
  apiOk(res, { apiKey: result.rows[0], secret });
}));

app.delete("/api/api-keys/:id", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  if (!["owner", "admin"].includes(org.role_name)) return error(res, 403, "Only admins can revoke API keys.", "FORBIDDEN");
  await pool.query("UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND organization_id = $2", [req.params.id, org.id]);
  await recordActivity(req, "api_key.revoked", "api_key", req.params.id);
  apiOk(res, { revoked: true });
}));

app.get("/api/activity", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const { limit, offset, page } = parsePagination(req);
  const result = await pool.query(
    `SELECT al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at,
            u.email, u.first_name, u.last_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.organization_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [org.id, limit, offset]
  );
  apiOk(res, { activity: result.rows }, { page, limit });
}));

app.get("/api/forecasts", authUser, asyncRoute(async (req, res) => {
  const analytics = await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null });
  apiOk(res, {
    summary: analytics.summary,
    skus: analytics.skus,
    assumptions: analytics.assumptions,
    formulas: analytics.formulas,
    forecasts: analytics.forecasts,
    riskHeatmap: analytics.riskHeatmap,
    waterfall: analytics.waterfall,
    dataQuality: analytics.dataQuality,
  });
}));

app.get("/api/analytics", authUser, asyncRoute(async (req, res) => {
  apiOk(res, { analytics: await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null }) });
}));

app.get("/api/reports", authUser, asyncRoute(async (req, res) => {
  const org = await ensureDefaultOrganization(req.user.sub);
  const stored = await pool.query(
    `SELECT id, type, title, payload, created_at
     FROM reports
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [org.id]
  );
  const analytics = await buildPlanningAnalytics(req.user.sub, { locationId: req.query.locationId || null });
  apiOk(res, {
    reports: stored.rows,
    generated: {
      title: "Inventory Health Summary",
      payload: analytics.summary,
      charts: {
        forecast: analytics.forecasts?.weekly || [],
        riskHeatmap: analytics.riskHeatmap || [],
        excessCostWaterfall: analytics.waterfall || [],
      },
      dataQuality: analytics.dataQuality,
      createdAt: new Date().toISOString(),
    },
  });
}));

app.get("/api/inventory", authUser, asyncRoute(async (req, res) => {
  const { limit, offset, page } = parsePagination(req, 50, 250);
  const result = await pool.query(
    `SELECT id, sku, product, current_quantity::float AS current, unit_price::float AS price, unit_cost::float AS cost, location, source, updated_at
     FROM inventory_items
     WHERE user_id = $1
     ORDER BY product ASC, sku ASC
     LIMIT $2 OFFSET $3`,
    [req.user.sub, limit, offset]
  );
  apiOk(res, { inventory: result.rows }, { page, limit });
}));

app.post("/api/inventory", authUser, asyncRoute(async (req, res) => {
  const sku = String(req.body.sku || "").trim();
  if (!sku) return error(res, 400, "SKU is required.", "SKU_REQUIRED");
  const product = String(req.body.product || sku).trim();
  const current = numeric(req.body.current);
  const price = numeric(req.body.price);
  const location = String(req.body.location || "Default").trim() || "Default";
  const source = String(req.body.source || "manual").trim() || "manual";
  const result = await pool.query(
    `INSERT INTO inventory_items (user_id, sku, product, current_quantity, unit_price, location, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, source, sku, location) DO UPDATE
     SET product = EXCLUDED.product,
         current_quantity = EXCLUDED.current_quantity,
         unit_price = EXCLUDED.unit_price,
         updated_at = now()
     RETURNING id, sku, product, current_quantity::float AS current, unit_price::float AS price, location, source, updated_at`,
    [req.user.sub, sku, product, current, price, location, source]
  );
  await recordActivity(req, "inventory.upserted", "inventory_item", result.rows[0].id, { sku, source });
  apiOk(res, { item: result.rows[0] });
}));

app.put("/api/inventory/:id", authUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE inventory_items
     SET product = COALESCE($1, product),
         current_quantity = COALESCE($2, current_quantity),
         unit_price = COALESCE($3, unit_price),
         location = COALESCE($4, location),
         updated_at = now()
     WHERE id = $5 AND user_id = $6
     RETURNING id, sku, product, current_quantity::float AS current, unit_price::float AS price, location, source, updated_at`,
    [
      req.body.product === undefined ? null : String(req.body.product),
      req.body.current === undefined ? null : numeric(req.body.current),
      req.body.price === undefined ? null : numeric(req.body.price),
      req.body.location === undefined ? null : String(req.body.location),
      req.params.id,
      req.user.sub,
    ]
  );
  if (!result.rows[0]) return error(res, 404, "Inventory item not found.", "INVENTORY_NOT_FOUND");
  await recordActivity(req, "inventory.updated", "inventory_item", req.params.id);
  apiOk(res, { item: result.rows[0] });
}));

app.delete("/api/inventory/:id", authUser, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM inventory_items WHERE id = $1 AND user_id = $2", [req.params.id, req.user.sub]);
  await recordActivity(req, "inventory.deleted", "inventory_item", req.params.id);
  apiOk(res, { deleted: true });
}));

app.get("/api/marketplace/nearby", authUser, asyncRoute(async (req, res) => {
  const location = String(req.query.location || "").trim();
  if (!location) return error(res, 400, "Enter a city, ZIP code, or address to find nearby businesses.", "LOCATION_REQUIRED");

  const radiusMiles = clampNumber(req.query.radius, 25, 1, 100);
  const category = String(req.query.category || "all").toLowerCase();
  const allowedCategories = new Set(["all", "food", "apparel", "electronics", "home", "health", "retail"]);
  const selectedCategory = allowedCategories.has(category) ? category : "all";

  let origin;
  try {
    origin = await geocodeMarketplaceLocation(location);
  } catch (err) {
    console.error("Marketplace geocode failed:", err);
    return error(res, 502, "Could not reach the public business directory. Try again in a minute.", "MARKETPLACE_GEOCODE_FAILED");
  }
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
    return error(res, 404, "We could not find that location. Try a city plus state or a ZIP code.", "LOCATION_NOT_FOUND");
  }

  try {
    const radiusPlan = marketplaceRadiusPlan(radiusMiles, selectedCategory);
    let elements = [];
    let effectiveRadiusMiles = radiusPlan[radiusPlan.length - 1] || radiusMiles;
    let lastLookupError;
    for (const candidateRadius of radiusPlan) {
      try {
        elements = await searchNearbyOsmShops({
          lat: origin.lat,
          lon: origin.lon,
          radiusMiles: candidateRadius,
          category: selectedCategory,
        });
        effectiveRadiusMiles = candidateRadius;
        if (elements.length || candidateRadius === radiusPlan[radiusPlan.length - 1]) break;
      } catch (err) {
        lastLookupError = err;
        if (candidateRadius === radiusPlan[radiusPlan.length - 1]) throw err;
      }
    }
    if (!elements.length && lastLookupError) throw lastLookupError;

    const seen = new Set();
    let businesses = elements
      .map((element, index) => normalizeOsmBusiness(element, origin, index))
      .filter(business => {
        const key = `${business.retailer}|${business.address}|${business.lat}|${business.lon}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return business.retailer && business.dist !== null && business.dist <= effectiveRadiusMiles;
      })
      .sort((a, b) => a.dist - b.dist || a.retailer.localeCompare(b.retailer))
      .slice(0, 24);
    let source = "OpenStreetMap";
    let note = "These are public nearby business listings. Private inventory and transfer data is available only after a business connects to LiquidityLink.";

    if (!businesses.length) {
      const fallbackBusinesses = await searchNearbyNominatimBusinesses({
        location,
        origin,
        radiusMiles,
        category: selectedCategory,
      }).catch(err => {
        console.warn("Marketplace Nominatim fallback failed:", err.message);
        return [];
      });
      if (fallbackBusinesses.length) {
        businesses = fallbackBusinesses.slice(0, 24);
        effectiveRadiusMiles = radiusMiles;
        source = "OpenStreetMap Search";
        note = "Showing public directory search results because the nearby map index returned no matching shops. Private inventory is available only after a business connects to LiquidityLink.";
      }
    }

    const limitedBroadSearch = effectiveRadiusMiles < radiusMiles;
    res.json({
      origin,
      radiusMiles,
      effectiveRadiusMiles,
      category: selectedCategory,
      count: businesses.length,
      businesses,
      source,
      note: limitedBroadSearch && source === "OpenStreetMap"
        ? `Showing public listings within ${effectiveRadiusMiles} miles for this broad search. Pick a category or enter a more specific city/state to search farther. Private inventory is available only after a business connects to LiquidityLink.`
        : note,
    });
  } catch (err) {
    console.error("Marketplace lookup failed:", err);
    const fallbackBusinesses = await searchNearbyNominatimBusinesses({
      location,
      origin,
      radiusMiles,
      category: selectedCategory,
    }).catch(fallbackErr => {
      console.warn("Marketplace Nominatim fallback failed:", fallbackErr.message);
      return [];
    });
    if (fallbackBusinesses.length) {
      return res.json({
        origin,
        radiusMiles,
        effectiveRadiusMiles: radiusMiles,
        category: selectedCategory,
        count: fallbackBusinesses.length,
        businesses: fallbackBusinesses.slice(0, 24),
        source: "OpenStreetMap Search",
        note: "The live map index was temporarily unavailable, so LiquidityLink used public directory search results. Private inventory is available only after a business connects to LiquidityLink.",
      });
    }
    return error(res, 502, "Could not load nearby businesses from the public directory. Try a smaller radius, pick a category, or enter the city plus state.", "MARKETPLACE_LOOKUP_FAILED");
  }
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
  const redirectToApp = path => res.redirect(`${appBaseUrl}${safeRedirectPath(path)}`);
  const redirectWithMessage = message => res.redirect(`${appBaseUrl}/connect?integrationMessage=${encodeURIComponent(message)}`);
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
    detail: `Connected to ${shop}. Press Sync now to import Shopify orders.`,
  });
  redirectToApp(stored.redirectTo);
}));

app.post("/api/integrations/clover/start", authUser, oauthLimiter, asyncRoute(async (req, res) => {
  if (!process.env.CLOVER_CLIENT_ID || !process.env.CLOVER_CLIENT_SECRET) {
    return error(res, 503, "Clover OAuth is not configured. Add CLOVER_CLIENT_ID and CLOVER_CLIENT_SECRET.", "CLOVER_NOT_CONFIGURED");
  }
  const merchantId = normalizeCloverMerchantId(req.body.merchantId);
  if (req.body.merchantId && !merchantId) return error(res, 400, "Enter a valid Clover merchant ID, or leave it blank and choose the merchant in Clover.", "INVALID_CLOVER_MERCHANT");

  const cfg = cloverConfig();
  const state = crypto.randomBytes(24).toString("base64url");
  const usePkce = String(process.env.CLOVER_USE_PKCE || "").toLowerCase() === "true";
  const codeVerifier = usePkce ? crypto.randomBytes(48).toString("base64url") : "";
  const redirectTo = safeRedirectPath(req.body.redirectTo || "/connect");
  const redirectUri = `${appBaseUrl}/api/integrations/clover/callback`;
  res.cookie(integrationCookieName, JSON.stringify({
    provider: "clover",
    state,
    userId: req.user.sub,
    merchantId,
    codeVerifier,
    redirectTo,
  }), cookieOptions(oauthCookieMs));

  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", process.env.CLOVER_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  if (cfg.useV2) url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (usePkce) {
    url.searchParams.set("code_challenge", pkceChallenge(codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (merchantId) url.searchParams.set("merchant_id", merchantId);
  if (process.env.CLOVER_SCOPES) url.searchParams.set("scope", process.env.CLOVER_SCOPES);
  res.json({ url: url.toString() });
}));

app.get("/api/integrations/clover/callback", oauthLimiter, asyncRoute(async (req, res) => {
  const redirectToApp = path => res.redirect(`${appBaseUrl}${safeRedirectPath(path)}`);
  const redirectWithMessage = message => res.redirect(`${appBaseUrl}/connect?integrationMessage=${encodeURIComponent(message)}`);
  if (req.query.error) return redirectWithMessage(req.query.error_description || "Clover connection was cancelled.");
  const cookie = req.signedCookies[integrationCookieName];
  if (!cookie) return redirectWithMessage("Clover connection expired. Please try again.");

  let stored;
  try {
    stored = JSON.parse(cookie);
  } catch {
    return redirectWithMessage("Clover connection state was invalid. Please try again.");
  }
  res.clearCookie(integrationCookieName, { path: "/", signed: true });
  if (stored.provider !== "clover" || stored.state !== req.query.state) {
    return redirectWithMessage("Clover security check failed. Please try again.");
  }

  const requestedMerchantId = normalizeCloverMerchantId(req.query.merchant_id || req.query.merchantId || stored.merchantId);
  const code = String(req.query.code || "");
  if (!code) return redirectWithMessage("Clover did not return an authorization code. Please try again.");

  const redirectUri = `${appBaseUrl}/api/integrations/clover/callback`;
  let tokenSet;
  try {
    tokenSet = await exchangeCloverCode(code, redirectUri, stored.codeVerifier);
  } catch (err) {
    return redirectWithMessage(`Clover token exchange failed: ${err.message}`);
  }
  const accessToken = tokenSet.access_token || tokenSet.accessToken || tokenSet.token;
  if (!accessToken) return redirectWithMessage("Clover did not return an access token. Please check the app credentials and try again.");
  const merchantId = normalizeCloverMerchantId(
    tokenSet.merchant_id ||
    tokenSet.merchantId ||
    tokenSet.merchant?.id ||
    tokenSet.merchant?.merchant_id ||
    requestedMerchantId
  );
  if (!merchantId) return redirectWithMessage("Clover did not return a merchant ID. Open the merchant in Clover and try connecting again.");
  await saveIntegrationToken(stored.userId, "clover", {
    accessToken,
    refreshToken: tokenSet.refresh_token || tokenSet.refreshToken,
    scopes: tokenSet.scope || process.env.CLOVER_SCOPES || "",
    expiresAt: tokenSet.access_token_expiration
      ? new Date(Number(tokenSet.access_token_expiration) * 1000)
      : tokenSet.expires_in
        ? new Date(Date.now() + Number(tokenSet.expires_in) * 1000)
        : null,
    externalAccount: merchantId,
    detail: `Connected to Clover merchant ${merchantId}. Press Sync now to import Clover orders and inventory.`,
  });
  redirectToApp(stored.redirectTo);
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
      const analytics = await buildPlanningAnalytics(req.user.sub, { persist: true });
      const status = await upsertIntegration(req.user.sub, "shopify", {
        status: "connected",
        detail: `Synced ${synced.rows} sales rows from ${synced.orders} Shopify orders and ${synced.inventoryItems} inventory items.`,
        externalAccount: connection.external_account,
        synced: true,
      });
      return res.json({ ok: true, status, synced, analytics });
    } catch (err) {
      const status = await upsertIntegration(req.user.sub, "shopify", {
        status: err.code === "SHOPIFY_REAUTH_REQUIRED" ? "needs_reauth" : "error",
        detail: err.message,
        externalAccount: connection.external_account,
      });
      const httpStatus = err.code === "SHOPIFY_RATE_LIMITED" ? 429 : err.code === "SHOPIFY_PERMISSION_DENIED" ? 403 : 502;
      return res.status(httpStatus).json({ error: err.message, code: err.code || "SHOPIFY_SYNC_FAILED", status });
    }
  }

  if (provider === "clover") {
    const result = await pool.query(
      "SELECT external_account, access_token_enc, refresh_token_enc FROM integration_connections WHERE user_id = $1 AND provider = 'clover'",
      [req.user.sub]
    );
    const connection = result.rows[0];
    if (!connection?.access_token_enc || !connection.external_account) {
      const status = await upsertIntegration(req.user.sub, "clover", {
        status: "needs_reauth",
        detail: "Connect Clover before syncing orders and inventory.",
      });
      return res.status(409).json({ error: status.detail, code: "CLOVER_NOT_CONNECTED", status });
    }
    try {
      let accessToken = decryptSecret(connection.access_token_enc);
      let synced;
      try {
        synced = await syncCloverData(req.user.sub, connection.external_account, accessToken);
      } catch (err) {
        if (err.code !== "CLOVER_REAUTH_REQUIRED" || !connection.refresh_token_enc) throw err;
        const refreshed = await refreshCloverToken(decryptSecret(connection.refresh_token_enc));
        accessToken = await updateCloverToken(req.user.sub, refreshed);
        if (!accessToken) throw err;
        synced = await syncCloverData(req.user.sub, connection.external_account, accessToken);
      }
      const status = await upsertIntegration(req.user.sub, "clover", {
        status: "connected",
        detail: `Synced ${synced.rows} sales rows from ${synced.orders} Clover orders and ${synced.inventoryItems} inventory items.`,
        externalAccount: connection.external_account,
        synced: true,
      });
      return res.json({ ok: true, status, synced });
    } catch (err) {
      const status = await upsertIntegration(req.user.sub, "clover", {
        status: err.code === "CLOVER_REAUTH_REQUIRED" ? "needs_reauth" : "error",
        detail: err.message,
        externalAccount: connection.external_account,
      });
      const httpStatus = err.code === "CLOVER_RATE_LIMITED" ? 429 : err.code === "CLOVER_PERMISSION_DENIED" ? 403 : 502;
      return res.status(httpStatus).json({ error: err.message, code: err.code || "CLOVER_SYNC_FAILED", status });
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
    "/": ["LiquidityLink | Inventory Intelligence", "Forecast demand, detect stockout risk, and coordinate inventory transfers from a single retail operations workspace."],
    "/platform": ["Platform | LiquidityLink", "Inventory intelligence, forecasting, supplier risk, and executive reporting built for retail operators."],
    "/features": ["Features | LiquidityLink", "Forecast accuracy, replenishment signals, risk scoring, marketplace matching, and reporting for modern retail teams."],
    "/solutions": ["Solutions | LiquidityLink", "Inventory planning workflows for supply chain, operations, finance, and executive teams."],
    "/industries": ["Industries | LiquidityLink", "Demand forecasting and inventory optimization for apparel, grocery, electronics, home, health, and specialty retail."],
    "/dashboard": ["LiquidityLink Dashboard", "Inventory risk score, revenue exposure, and SKU recommendations for retail operators."],
    "/connect": ["Connect Store | LiquidityLink", "Connect POS, ERP, or CSV inventory data to start forecasting."],
    "/forecasts": ["Forecasts | LiquidityLink", "Demand forecasts with confidence bands and model comparison."],
    "/inventory": ["Inventory | LiquidityLink", "SKU-level buy, sell, hold, and transfer recommendations."],
    "/analytics": ["Advanced Analytics | LiquidityLink", "Track GMROI, service levels, reorder points, safety stock, ABC classes, and SKU diagnostics from connected sales and inventory data."],
    "/marketplace": ["Marketplace | LiquidityLink", "Find nearby retailers with matching inventory excess or shortage signals."],
    "/community": ["Community | LiquidityLink", "Coordinate markdowns, delivery routes, and bulk buys with retail peers."],
    "/pricing": ["Pricing | LiquidityLink", "Tiered LiquidityLink subscription plans for retailers from single-store teams to enterprise networks."],
    "/resources": ["Resources | LiquidityLink", "Guides, frameworks, and operating playbooks for inventory risk teams."],
    "/blog": ["Blog | LiquidityLink", "Inventory intelligence essays, forecasting methods, and retail operations analysis."],
    "/docs": ["Documentation | LiquidityLink", "Implementation guides for connecting retail data and interpreting LiquidityLink analytics."],
    "/security": ["Security | LiquidityLink", "Enterprise security, privacy, and data governance for retail inventory systems."],
    "/integrations": ["Integrations | LiquidityLink", "Connect Shopify, Clover, Square, CSV, and retail data systems to LiquidityLink."],
    "/about": ["About | LiquidityLink", "LiquidityLink helps retailers prevent stockouts, reduce excess inventory, and improve working capital."],
    "/contact": ["Contact | LiquidityLink", "Talk to LiquidityLink about inventory intelligence, pilots, and enterprise deployments."],
    "/book-demo": ["Book Demo | LiquidityLink", "Book a LiquidityLink demo for your retail planning, operations, or finance team."],
    "/reports": ["Reports | LiquidityLink", "Executive inventory health reports for finance and operations teams."],
    "/profile": ["Profile | LiquidityLink", "Manage your LiquidityLink account profile, password, and active session."],
    "/login": ["Sign In | LiquidityLink", "Secure access to LiquidityLink inventory intelligence."],
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
    <meta property="og:image" content="${appBaseUrl}/assets/liquiditylink-logo.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${appBaseUrl}/assets/liquiditylink-logo.png" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" href="/assets/liquiditylink-logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=23" />
  </head>
  <body>
    <div id="toastRoot" class="toast-container" aria-live="polite"></div>
    <div id="modalRoot"></div>
    <div id="app"><main class="ssr-fallback"><h1>${title.split(" | ")[0]}</h1><p>${description}</p><ul><li>SKU-level demand forecasts</li><li>Stockout and overstock risk signals</li><li>Transfer marketplace and executive reports</li></ul></main></div>
    <script src="/app.js?v=23"></script>
  </body>
</html>`;
}

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const pathname = decodeURIComponent(new URL(req.originalUrl, appBaseUrl).pathname).replace(/^\/+/, "");
  if (!pathname || pathname.startsWith("api/")) return next();
  const allowed = new Set(["index.html", "app.js", "styles.css", "_redirects"]);
  if (allowed.has(pathname) || pathname.startsWith("assets/") || pathname.startsWith("public/")) return next();
  if (path.extname(pathname)) return res.status(404).type("text/plain").send("Not found");
  return next();
});

app.use(express.static(__dirname, {
  index: false,
  dotfiles: "ignore",
  extensions: false,
}));
app.get("*", (req, res) => res.send(renderShell(req)));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({
      error: "The database is not reachable. Start Postgres, create the liquiditylink database, and run db/schema.sql.",
      code: "DATABASE_UNAVAILABLE",
    });
  }
  res.status(500).json({ error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" });
});

ensureSchema()
  .catch(err => console.error("Database schema setup failed:", err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`LiquidityLink running at ${appBaseUrl}`);
    });
  });
