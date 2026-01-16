/*
  # Fix Empresas Granular Permissions

  ## Summary
  This migration corrects the RLS policies for empresas write operations to respect 
  the granular permissions defined in the grupos.permissoes column.

  ## Problem
  Current policies require admin=true for ALL write operations (INSERT/UPDATE/DELETE).
  This is incorrect because the grupos table has specific permission flags:
  - edit_data: Permite editar dados
  - delete_data: Permite excluir dados
  
  ## Solution
  Update write policies to use the specific permission flags:
  - INSERT: requires admin=true OR edit_data=true (users who can edit can also create)
  - UPDATE: requires edit_data=true (no need for admin)
  - DELETE: requires delete_data=true (no need for admin)
  
  All operations still require:
  - User must be active (ativo = true)
  - User must have access to 'empresas' menu
  
  ## Changes
  1. Drop existing INSERT/UPDATE/DELETE policies
  2. Create new policies with granular permission checks
  
  ## Security
  - Maintains proper authorization checks
  - Respects grupo permissions configuration
  - Allows flexible permission management per group
*/

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================

DROP POLICY IF EXISTS "Admins can insert empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can delete empresas" ON empresas;

-- =============================================
-- CREATE GRANULAR PERMISSION POLICIES
-- =============================================

-- INSERT: Users with admin OR edit_data permission
CREATE POLICY "Users with permissions can insert empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->'menus' ? 'empresas'
        AND (
          g.permissoes->>'admin' = 'true'
          OR g.permissoes->>'edit_data' = 'true'
        )
    )
  );

COMMENT ON POLICY "Users with permissions can insert empresas" ON empresas IS 'SECURITY: Users with admin or edit_data permissions can create empresas. Requires active profile and empresas menu access.';

-- UPDATE: Users with edit_data permission
CREATE POLICY "Users with edit permission can update empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->'menus' ? 'empresas'
        AND g.permissoes->>'edit_data' = 'true'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->'menus' ? 'empresas'
        AND g.permissoes->>'edit_data' = 'true'
    )
  );

COMMENT ON POLICY "Users with edit permission can update empresas" ON empresas IS 'SECURITY: Users with edit_data permission can update empresas. Does not require admin. Requires active profile and empresas menu access.';

-- DELETE: Users with delete_data permission
CREATE POLICY "Users with delete permission can delete empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->'menus' ? 'empresas'
        AND g.permissoes->>'delete_data' = 'true'
    )
  );

COMMENT ON POLICY "Users with delete permission can delete empresas" ON empresas IS 'SECURITY: Users with delete_data permission can delete empresas. Does not require admin. Requires active profile and empresas menu access.';
