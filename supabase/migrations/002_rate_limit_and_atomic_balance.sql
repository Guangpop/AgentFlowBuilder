-- Migration: Rate Limiting + Atomic Balance Deduction
-- Date: 2025-01-19
-- Description: Add rate limiting table and atomic balance deduction function

-- ============================================================
-- 1. Rate Limits Table
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits (window_start);

-- ============================================================
-- 2. check_rate_limit() - Rate limit check with upsert
-- ============================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Get current minute window
  v_window := date_trunc('minute', NOW());

  -- Upsert and get count atomically
  INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Return whether request is allowed
  RETURN v_count <= p_max_requests;
END;
$$;

-- ============================================================
-- 3. deduct_balance() - Atomic balance deduction with locking
-- ============================================================

CREATE OR REPLACE FUNCTION deduct_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, error_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the user's row to prevent concurrent modifications
  SELECT balance INTO v_current_balance
  FROM users_profile
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check for insufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'insufficient_balance'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update balance
  UPDATE users_profile
  SET balance = v_new_balance
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description, balance_after)
  VALUES (p_user_id, 'charge', -p_amount, p_description, v_new_balance);

  -- Update total_spent
  UPDATE users_profile
  SET total_spent = COALESCE(total_spent, 0) + p_amount
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- ============================================================
-- 4. cleanup_rate_limits() - Clean up old rate limit records
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================
-- 5. Grant permissions
-- ============================================================

-- Allow service role to call these functions
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION deduct_balance TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;

-- Allow service role to access rate_limits table
GRANT ALL ON rate_limits TO service_role;
