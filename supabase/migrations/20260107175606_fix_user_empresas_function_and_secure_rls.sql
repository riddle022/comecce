/*
  # Fix user_empresas() Function and Secure RLS Policies

  ## CRITICAL SECURITY FIX
  This migration addresses two critical security issues:
  1. Incorrect column name in user_empresas() function (id vs id_empresa)
  2. Overly permissive RLS policy that allows all users to see all companies

  ## Problems Fixed
  
  ### Problem 1: Wrong column in user_empresas()
  - Previous migration used `SELECT id FROM empresas` 
  - Correct column is `id_empresa` (not `id`)
  - This caused function to fail and users couldn't see any empresas
  
  ### Problem 2: Insecure RLS Policy
  - Policy "Authenticated users can view active empresas" allowed ALL users to see ALL companies
  - This violates data isolation between clients
  - Multi-tenant security requires users only see their associated companies
  
  ## Solution
  
  ### 1. Fix user_empresas() function
  - Correct the column name from `id` to `id_empresa`
  - Admin users: returns all active empresas
  - Regular users: returns only empresas from usuarios_empresas table
  
  ### 2. Implement proper RLS policy
  - Policy: "Users can view associated empresas"
  - Conditions:
    - User must be active (user_is_active())
    - User must have a group (user_has_group())
    - Empresa must be in user_empresas() result set
  - Admin behavior: sees all active empresas (via user_empresas())
  - Regular user behavior: sees only associated empresas (via user_empresas())
  
  ## Security Impact
  BEFORE: All authenticated users could see all active empresas
  AFTER: Users can only see empresas they're authorized to access
  
  ## Changes
  1. Recreate user_empresas() function with correct column name
  2. Drop insecure SELECT policy
  3. Create secure SELECT policy using user_empresas()
  4. Maintain existing admin-only write policies
*/

-- =============================================
-- PART 1: FIX user_empresas() FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION user_empresas()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Admin users can access all active empresas
  IF user_is_admin() THEN
    RETURN QUERY SELECT id_empresa FROM empresas WHERE ativo = true;
  ELSE
    -- Regular users can only access empresas they're associated with
    RETURN QUERY
      SELECT empresa_id
      FROM usuarios_empresas
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$;

COMMENT ON FUNCTION user_empresas IS 'SECURITY: Returns empresas user can access. Admin=all active empresas, Regular=only associated empresas from usuarios_empresas. Uses SECURITY DEFINER with fixed search_path to prevent privilege escalation.';

-- =============================================
-- PART 2: FIX RLS POLICIES FOR EMPRESAS
-- =============================================

-- Drop the insecure policy that allowed all users to see all empresas
DROP POLICY IF EXISTS "Authenticated users can view active empresas" ON empresas;

-- Create secure policy: users can only view empresas they have access to
CREATE POLICY "Users can view associated empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    user_is_active() 
    AND user_has_group() 
    AND id_empresa IN (SELECT user_empresas())
  );

COMMENT ON POLICY "Users can view associated empresas" ON empresas IS 'SECURITY: Users can only view empresas they have access to. Admin users see all active empresas, regular users see only their associated empresas from usuarios_empresas table.';

-- Keep existing admin-only write policies (no changes needed)
-- These policies are already correct and secure:
-- - "Admins can insert empresas"
-- - "Admins can update empresas"  
-- - "Admins can delete empresas"
