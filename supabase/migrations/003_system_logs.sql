-- System logs table for critical events
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  event TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by level and event
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_event ON system_logs(event);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- RLS policies
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from API)
CREATE POLICY "Service role can insert system_logs"
  ON system_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can read (for admin dashboards)
CREATE POLICY "Service role can read system_logs"
  ON system_logs FOR SELECT
  TO service_role
  USING (true);

-- Function to increment total_spent (for instant payment mode)
CREATE OR REPLACE FUNCTION increment_total_spent(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE users_profile
  SET total_spent = COALESCE(total_spent, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
