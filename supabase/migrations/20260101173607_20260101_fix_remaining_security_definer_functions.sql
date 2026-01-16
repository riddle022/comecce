/*
  # Fix Remaining SECURITY DEFINER Functions

  ## Summary
  This migration fixes the 3 remaining SECURITY DEFINER functions that were discovered
  after the initial security patch. These functions also lack SET search_path protection.

  ## Functions Fixed (3 functions)
  1. cleanup_old_rate_limits() - Cleans up old rate limit records
  2. current_user_belongs_to_empresa(uuid) - Checks if user belongs to empresa
  3. current_user_is_admin() - Duplicate admin check function (old version)

  ## Changes
  - Add SET search_path = public, pg_temp to all 3 functions
  - Maintain exact same logic and behavior
  - Add security comments

  ## Note
  The function current_user_is_admin() appears to be a legacy/duplicate function.
  The canonical version is user_is_admin() which was already fixed in the previous migration.
  Both are kept for backward compatibility but should be consolidated in the future.
*/

-- Function 1: cleanup_old_rate_limits
-- Cleans up old rate limit records older than 2 minutes
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '2 minutes';
END;
$$;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'SECURITY: Deletes rate limit records older than 2 minutes. Uses SECURITY DEFINER with fixed search_path.';

-- Function 2: current_user_belongs_to_empresa
-- Checks if authenticated user belongs to specified empresa
CREATE OR REPLACE FUNCTION current_user_belongs_to_empresa(emp_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.usuario_id = auth.uid() AND ue.empresa_id = emp_id
  );
$$;

COMMENT ON FUNCTION current_user_belongs_to_empresa IS 'SECURITY: Returns true if authenticated user belongs to specified empresa. Uses SECURITY DEFINER with fixed search_path.';

-- Function 3: current_user_is_admin (legacy function)
-- Checks if authenticated user is admin (LEGACY VERSION - prefer user_is_admin())
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT (g.permissoes ->> 'admin')::boolean
    FROM perfis p
    JOIN grupos g ON p.grupo_id = g.id
    WHERE p.id = auth.uid()
    LIMIT 1
  ), false);
$$;

COMMENT ON FUNCTION current_user_is_admin IS 'SECURITY: LEGACY function - prefer user_is_admin(). Returns true if user is admin. Uses SECURITY DEFINER with fixed search_path.';

-- Add note about function consolidation
COMMENT ON FUNCTION current_user_is_admin IS 'SECURITY: LEGACY function for backward compatibility. New code should use user_is_admin() instead. This function does NOT check if user is active or has a group assigned - use user_is_admin() for proper security checks.';