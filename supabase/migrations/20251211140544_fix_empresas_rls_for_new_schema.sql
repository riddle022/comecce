/*
  # Fix RLS Functions for Updated Empresas Schema
  
  ## Summary
  This migration updates all RLS functions and policies to work with the new empresas table schema.
  
  ## Changes Made
  
  ### 1. Database Functions
  - Updated `user_empresas()` function to use `id_empresa` instead of `id`
  - This function returns empresa IDs that the current user can access
  
  ### 2. RLS Policies
  - Recreated all empresas RLS policies to reference `id_empresa` column
  - Maintained security model: users see only their associated empresas, admins see all
  
  ## New Empresas Schema
  The empresas table now uses:
  - `id_empresa` (uuid) - primary key
  - `ds_empresa` (text) - company description/name
  - `cnpj` (text) - company tax ID
  - `telefone` (text) - phone number
  - `email` (text) - email address
  - `grupoeco_id` (uuid) - economic group reference
  - `ativo` (boolean) - active status
  - `created_at`, `updated_at` (timestamptz) - timestamps
  
  ## Security
  - All existing security rules remain enforced
  - Only column references are updated, no permission changes
*/

-- Update function to get empresas user can access
CREATE OR REPLACE FUNCTION user_empresas()
RETURNS SETOF uuid AS $$
BEGIN
  IF user_is_admin() THEN
    RETURN QUERY SELECT id_empresa FROM empresas WHERE ativo = true;
  ELSE
    RETURN QUERY
      SELECT empresa_id
      FROM usuarios_empresas
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing empresas RLS policies
DROP POLICY IF EXISTS "Users can view associated empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can delete empresas" ON empresas;

-- Recreate empresas RLS policies with correct column references
CREATE POLICY "Users can view associated empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    user_is_active()
    AND user_has_group()
    AND id_empresa IN (SELECT * FROM user_empresas())
  );

CREATE POLICY "Admins can insert empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin() AND user_has_menu_access('empresas'));

CREATE POLICY "Admins can update empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (user_is_admin() AND user_has_menu_access('empresas') AND user_can_edit())
  WITH CHECK (user_is_admin() AND user_has_menu_access('empresas') AND user_can_edit());

CREATE POLICY "Admins can delete empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (user_is_admin() AND user_has_menu_access('empresas') AND user_can_delete());