-- supabase/migrations/004_gumroad_payment.sql

-- Strategy A: track used license keys to prevent replay attacks
CREATE TABLE IF NOT EXISTS used_license_keys (
  license_key   TEXT PRIMARY KEY,
  product_type  TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  amount_paid   INTEGER NOT NULL,
  sale_id       TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Strategy B: short-lived payment sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
  session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'used', 'expired')),
  product_type    TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  expected_cents  INTEGER NOT NULL,
  sale_id         TEXT UNIQUE,
  amount_paid     INTEGER,
  payment_token   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Shared: prevent payment_token replay across both strategies
CREATE TABLE IF NOT EXISTS used_payment_tokens (
  payment_token TEXT PRIMARY KEY,
  product_type  TEXT NOT NULL,
  node_count    INTEGER,
  used_at       TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status
  ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at
  ON payment_sessions(expires_at);

-- RLS: backend-only via service role key
ALTER TABLE used_license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_payment_tokens ENABLE ROW LEVEL SECURITY;
