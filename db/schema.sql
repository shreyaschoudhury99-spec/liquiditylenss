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

CREATE TABLE IF NOT EXISTS integration_connections (
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
);
