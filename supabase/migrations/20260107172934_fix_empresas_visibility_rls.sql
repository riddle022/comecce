/*
  # Fix Empresas Visibility RLS Policies

  ## Summary
  This migration fixes the visibility issues with the empresas table by simplifying the RLS policies.
  
  ## Problem
  - Users cannot see empresas in the management page (EmpresasPage)
  - Users cannot see empresas in the upload page filter (UploadPage)
  - The current policies are too restrictive, requiring user_is_active() AND user_has_group()
  
  ## Solution
  - Allow authenticated users to view ALL active empresas (needed for form dropdowns and listings)
  - Keep INSERT/UPDATE/DELETE restricted to admins with proper permissions
  - Simplify the SELECT policy to remove unnecessary restrictions
  
  ## Changes
  1. Drop existing restrictive SELECT policy
  2. Create new simplified SELECT policy for viewing active empresas
  3. Keep admin-only policies for INSERT/UPDATE/DELETE
  
  ## Security
  - Viewing empresas is safe - no sensitive data exposure
  - Write operations remain restricted to admins only
  - All policies check authentication status
*/

-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view associated empresas" ON empresas;

-- Create new simplified policy: authenticated users can view all active empresas
CREATE POLICY "Authenticated users can view active empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (ativo = true);

-- Keep the admin-only policies for write operations (already exist, just ensuring they're correct)
DROP POLICY IF EXISTS "Admins can insert empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can delete empresas" ON empresas;

CREATE POLICY "Admins can insert empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->>'admin' = 'true'
        AND g.permissoes->'menus' ? 'empresas'
    )
  );

CREATE POLICY "Admins can update empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->>'admin' = 'true'
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
        AND g.permissoes->>'admin' = 'true'
        AND g.permissoes->'menus' ? 'empresas'
        AND g.permissoes->>'edit_data' = 'true'
    )
  );

CREATE POLICY "Admins can delete empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN grupos g ON g.id = p.grupo_id
      WHERE p.id = auth.uid()
        AND p.ativo = true
        AND g.permissoes->>'admin' = 'true'
        AND g.permissoes->'menus' ? 'empresas'
        AND g.permissoes->>'delete_data' = 'true'
    )
  );
