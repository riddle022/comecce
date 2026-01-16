/*
  # Add Security Features: Rate Limiting and Audit Logging

  ## Overview
  This migration adds comprehensive security features to protect against abuse and track critical events.

  ## 1. New Tables

  ### rate_limits
  Tracks API request rates per user/IP to prevent abuse and DoS attacks.
  - `id` (uuid, primary key)
  - `identifier` (text) - user_id or IP address
  - `identifier_type` (text) - 'user' or 'ip'
  - `endpoint` (text) - API endpoint being called
  - `request_count` (integer) - number of requests in current window
  - `window_start` (timestamptz) - start of current rate limit window
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### audit_logs
  Records critical security and business events for compliance and monitoring.
  - `id` (uuid, primary key)
  - `user_id` (uuid) - authenticated user (nullable for pre-auth events)
  - `event_type` (text) - 'auth', 'security', 'data_change', 'permission_change'
  - `action` (text) - specific action performed
  - `resource` (text) - resource being accessed (nullable)
  - `granted` (boolean) - whether access was granted
  - `ip_address` (text) - client IP address (nullable)
  - `user_agent` (text) - client user agent (nullable)
  - `metadata` (jsonb) - additional context (nullable)
  - `created_at` (timestamptz)

  ## 2. Indexes
  - rate_limits: composite index on (identifier, endpoint, window_start)
  - audit_logs: indexes on user_id, event_type, and created_at

  ## 3. RLS Policies
  - rate_limits: Only accessible via service role (Edge Functions)
  - audit_logs: SELECT only for admins, INSERT via service role

  ## 4. Automatic Cleanup
  - rate_limits: Records older than 2 minutes are automatically cleaned
  - audit_logs: Retained indefinitely for compliance (manual archival needed)

  ## 5. Critical Events Tracked
  - Auth: login, logout, inactive user blocked, user without group blocked
  - Security: access denied, rate limit exceeded
  - Data Changes: financial data creation/modification
  - Permission Changes: group assignments, permission modifications
*/

-- =============================================
-- TABLE: rate_limits
-- =============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('user', 'ip')),
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups during rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON rate_limits(identifier, endpoint, window_start);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON rate_limits(window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only Edge Functions (service role) can access rate_limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TABLE: audit_logs
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('auth', 'security', 'data_change', 'permission_change')),
  action text NOT NULL,
  resource text,
  granted boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_granted
  ON audit_logs(granted);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_is_admin());

-- Only service role can insert audit logs (via Edge Functions)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =============================================
-- FUNCTION: Clean up old rate limit records
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE rate_limits IS 'Tracks API request rates per user/IP to prevent abuse';
COMMENT ON TABLE audit_logs IS 'Records critical security and business events for compliance';

COMMENT ON COLUMN rate_limits.identifier IS 'User ID (uuid) or IP address (string)';
COMMENT ON COLUMN rate_limits.identifier_type IS 'Type of identifier: user or ip';
COMMENT ON COLUMN rate_limits.endpoint IS 'API endpoint path';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Start timestamp of current rate limit window';

COMMENT ON COLUMN audit_logs.user_id IS 'Authenticated user ID (null for pre-auth events)';
COMMENT ON COLUMN audit_logs.event_type IS 'Category: auth, security, data_change, permission_change';
COMMENT ON COLUMN audit_logs.action IS 'Specific action performed (e.g., login, access_denied)';
COMMENT ON COLUMN audit_logs.resource IS 'Resource being accessed (e.g., table name, menu name)';
COMMENT ON COLUMN audit_logs.granted IS 'Whether the action was permitted';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context as JSON';