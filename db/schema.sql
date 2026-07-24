CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
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
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS oauth_accounts_user_provider_idx
  ON oauth_accounts (user_id, provider);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('email', 'phone')),
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'setup')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_challenges_lookup_idx
  ON mfa_challenges (id, expires_at)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_lookup_idx
  ON password_reset_tokens (token_hash, expires_at)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_lookup_idx
  ON refresh_tokens (token_hash, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_records (
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
);

CREATE INDEX IF NOT EXISTS sales_records_user_lookup_idx
  ON sales_records (user_id, sale_date DESC);

CREATE TABLE IF NOT EXISTS inventory_items (
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
);

CREATE INDEX IF NOT EXISTS inventory_items_user_lookup_idx
  ON inventory_items (user_id, source, sku);

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC CHECK (unit_cost >= 0);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('csv', 'shopify', 'square', 'clover', 'lightspeed', 'toast', 'woocommerce', 'custom_pos')),
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
);

ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS integration_connections_provider_check;
ALTER TABLE integration_connections
  ADD CONSTRAINT integration_connections_provider_check
  CHECK (provider IN ('csv', 'shopify', 'square', 'clover', 'lightspeed', 'toast', 'woocommerce', 'custom_pos'));

CREATE TABLE IF NOT EXISTS planning_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_code TEXT NOT NULL,
  name TEXT NOT NULL,
  average_lead_time_days NUMERIC NOT NULL DEFAULT 14,
  lead_time_variability_days NUMERIC NOT NULL DEFAULT 3,
  lead_time_days NUMERIC,
  lead_time_stddev_days NUMERIC,
  reliability_score NUMERIC NOT NULL DEFAULT 90 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  minimum_order_quantity NUMERIC NOT NULL DEFAULT 1 CHECK (minimum_order_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, supplier_code)
);

CREATE TABLE IF NOT EXISTS planning_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  subcategory TEXT NOT NULL DEFAULT 'General',
  unit_cost NUMERIC CHECK (unit_cost >= 0),
  unit_price NUMERIC CHECK (unit_price >= 0),
  unit_of_measure TEXT NOT NULL DEFAULT 'unit',
  supplier_id UUID REFERENCES planning_suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'sample')),
  source_system TEXT NOT NULL DEFAULT 'sample_seed',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sku_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS planning_products_user_sku_idx
  ON planning_products (user_id, sku);

CREATE TABLE IF NOT EXISTS planning_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  location_code TEXT,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'store' CHECK (location_type IN ('store', 'warehouse', 'dc', 'online')),
  region TEXT NOT NULL DEFAULT 'North America',
  capacity_units NUMERIC CHECK (capacity_units >= 0),
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS planning_locations_user_code_idx
  ON planning_locations (user_id, location_code);

CREATE TABLE IF NOT EXISTS planning_sales_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  sale_date DATE NOT NULL,
  units_sold NUMERIC NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
  quantity NUMERIC NOT NULL DEFAULT 0,
  gross_revenue NUMERIC NOT NULL DEFAULT 0,
  unit_price_at_sale NUMERIC CHECK (unit_price_at_sale >= 0),
  was_promoted BOOLEAN NOT NULL DEFAULT false,
  was_out_of_stock BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'sample',
  source_system TEXT NOT NULL DEFAULT 'sample_seed',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sku_id, location_id, sale_date, source)
);

CREATE INDEX IF NOT EXISTS planning_sales_user_sku_location_date_idx
  ON planning_sales_history (user_id, sku_id, location_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS planning_sales_product_lookup_idx
  ON planning_sales_history (user_id, product_id, location_id, sale_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS planning_sales_product_source_unique_idx
  ON planning_sales_history (user_id, product_id, location_id, sale_date, source_system, external_id);

CREATE TABLE IF NOT EXISTS planning_inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  on_hand_qty NUMERIC NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
  on_hand NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC NOT NULL DEFAULT 0,
  on_order_qty NUMERIC NOT NULL DEFAULT 0 CHECK (on_order_qty >= 0),
  in_transit_qty NUMERIC NOT NULL DEFAULT 0 CHECK (in_transit_qty >= 0),
  safety_stock_threshold NUMERIC NOT NULL DEFAULT 0 CHECK (safety_stock_threshold >= 0),
  unit_cost NUMERIC,
  unit_price NUMERIC,
  source TEXT NOT NULL DEFAULT 'sample',
  source_system TEXT NOT NULL DEFAULT 'sample_seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sku_id, location_id, inventory_date, source)
);

CREATE INDEX IF NOT EXISTS planning_inventory_user_sku_location_date_idx
  ON planning_inventory_levels (user_id, sku_id, location_id, inventory_date DESC);
CREATE INDEX IF NOT EXISTS planning_inventory_product_lookup_idx
  ON planning_inventory_levels (user_id, product_id, location_id, recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS planning_inventory_product_date_unique_idx
  ON planning_inventory_levels (user_id, product_id, location_id, recorded_at);

CREATE TABLE IF NOT EXISTS planning_promotion_calendar (
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
);

CREATE TABLE IF NOT EXISTS planning_forecast_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES planning_products(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  horizon_days INTEGER NOT NULL CHECK (horizon_days IN (7, 30, 90)),
  point_forecast NUMERIC NOT NULL DEFAULT 0,
  forecast_units NUMERIC NOT NULL DEFAULT 0,
  lower_bound NUMERIC NOT NULL DEFAULT 0,
  lower_bound_units NUMERIC NOT NULL DEFAULT 0,
  upper_bound NUMERIC NOT NULL DEFAULT 0,
  upper_bound_units NUMERIC NOT NULL DEFAULT 0,
  confidence_level NUMERIC NOT NULL DEFAULT 0.8,
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  model_version TEXT NOT NULL DEFAULT 'll-exp-smooth-v1',
  model_name TEXT NOT NULL DEFAULT 'LiquidityLens Ensemble',
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sku_id, location_id, forecast_date, horizon_days, model_version)
);

CREATE INDEX IF NOT EXISTS planning_forecast_user_lookup_idx
  ON planning_forecast_results (user_id, sku_id, location_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS planning_forecast_product_lookup_idx
  ON planning_forecast_results (user_id, product_id, location_id, forecast_date DESC, model_name);

CREATE TABLE IF NOT EXISTS planning_forecast_accuracy_log (
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
);

CREATE TABLE IF NOT EXISTS planning_transfer_recommendations (
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
);

CREATE TABLE IF NOT EXISTS planning_supplier_orders (
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
);

CREATE TABLE IF NOT EXISTS planning_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('products', 'sales', 'inventory')),
  file_name TEXT NOT NULL DEFAULT 'manual upload',
  status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'committed', 'failed')),
  preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS planning_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  rows_processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_dashboard_cache (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cache_key)
);
