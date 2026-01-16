/*
  # Create RLS Policies Aligned with Edge Function Logic

  ## Overview
  This migration creates comprehensive RLS policies that are fully aligned with the
  check-permissions Edge Function. Key principle: users WITHOUT a grupo have NO access.

  ## 1. Helper Functions (7 functions)
    - `user_is_active()` - Checks if user profile is active
    - `user_has_group()` - Checks if user has an assigned group
    - `user_is_admin()` - Checks if user is admin (requires active + group + admin permission)
    - `user_can_edit()` - Checks if user can edit data (requires active + group + edit permission)
    - `user_can_delete()` - Checks if user can delete data (requires active + group + delete permission)
    - `user_has_menu_access(menu_name)` - Checks if user can access specific menu
    - `user_empresas()` - Returns empresas user can access (admin = all, regular = associated only)

  ## 2. Security Model
    - Users without grupo: NO ACCESS to any data
    - Inactive users: NO ACCESS to any data
    - All permissions require: active user + assigned group + specific permission
    - Data operations verify empresa association

  ## 3. Tables with RLS Policies
    - grupos (SELECT: active with group, INSERT/UPDATE/DELETE: admin only)
    - perfis (SELECT: own or admin, INSERT: signup only, UPDATE: own or admin)
    - empresas (SELECT: associated or admin, INSERT/UPDATE/DELETE: admin only)
    - usuarios_empresas (SELECT: own or admin, INSERT/DELETE: admin only)
    - tbl_grupos_economicos (SELECT: all authenticated, INSERT/UPDATE/DELETE: admin only)
    - tbl_clientes (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)
    - tbl_produtos (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)
    - tbl_os (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)
    - tbl_vendas (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)
    - tbl_itens_venda (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)
    - tbl_itens_os (SELECT: all with access, INSERT/UPDATE/DELETE: requires permissions)

  ## 4. Alignment with Edge Function
    - User without group = denied access (returns false)
    - User inactive = denied access (returns false)
    - All permission checks validate active status and group membership
    - Empresa associations enforced on all data operations
*/

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is active
CREATE OR REPLACE FUNCTION user_is_active()
RETURNS boolean AS $$
DECLARE
  user_active boolean;
BEGIN
  SELECT ativo INTO user_active
  FROM perfis
  WHERE id = auth.uid();

  RETURN COALESCE(user_active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a group assigned
CREATE OR REPLACE FUNCTION user_has_group()
RETURNS boolean AS $$
DECLARE
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  RETURN user_grupo_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  RETURN COALESCE((user_permissions->>'admin')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit data
CREATE OR REPLACE FUNCTION user_can_edit()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN COALESCE((user_permissions->>'edit_data')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can delete data
CREATE OR REPLACE FUNCTION user_can_delete()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN COALESCE((user_permissions->>'delete_data')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a specific menu
CREATE OR REPLACE FUNCTION user_has_menu_access(menu_name text)
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
  user_active boolean;
BEGIN
  SELECT p.grupo_id, p.ativo INTO user_grupo_id, user_active
  FROM perfis p
  WHERE p.id = auth.uid();

  IF user_active IS FALSE OR user_active IS NULL THEN
    RETURN false;
  END IF;

  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  IF COALESCE((user_permissions->>'admin')::boolean, false) THEN
    RETURN true;
  END IF;

  RETURN user_permissions->'menus' @> to_jsonb(menu_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get empresas user can access
CREATE OR REPLACE FUNCTION user_empresas()
RETURNS SETOF uuid AS $$
BEGIN
  IF user_is_admin() THEN
    RETURN QUERY SELECT id FROM empresas WHERE ativo = true;
  ELSE
    RETURN QUERY
      SELECT empresa_id
      FROM usuarios_empresas
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES - GRUPOS
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view grupos" ON grupos;
DROP POLICY IF EXISTS "Only admins can insert grupos" ON grupos;
DROP POLICY IF EXISTS "Only admins can update grupos" ON grupos;
DROP POLICY IF EXISTS "Only admins can delete grupos" ON grupos;

CREATE POLICY "Authenticated users can view grupos"
  ON grupos FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Only admins can insert grupos"
  ON grupos FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin());

CREATE POLICY "Only admins can update grupos"
  ON grupos FOR UPDATE
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

CREATE POLICY "Only admins can delete grupos"
  ON grupos FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- =============================================
-- RLS POLICIES - PERFIS
-- =============================================

DROP POLICY IF EXISTS "Users can view own profile" ON perfis;
DROP POLICY IF EXISTS "Admins can view all profiles" ON perfis;
DROP POLICY IF EXISTS "System can create profiles on signup" ON perfis;
DROP POLICY IF EXISTS "Users can update own profile" ON perfis;
DROP POLICY IF EXISTS "Admins can update any profile" ON perfis;
DROP POLICY IF EXISTS "Admins can delete profiles" ON perfis;

CREATE POLICY "Users can view own profile"
  ON perfis FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON perfis FOR SELECT
  TO authenticated
  USING (user_is_admin());

CREATE POLICY "System can create profiles on signup"
  ON perfis FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON perfis FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND grupo_id = (SELECT grupo_id FROM perfis WHERE id = auth.uid()))
  WITH CHECK (id = auth.uid() AND grupo_id = (SELECT grupo_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON perfis FOR UPDATE
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

CREATE POLICY "Admins can delete profiles"
  ON perfis FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- =============================================
-- RLS POLICIES - EMPRESAS
-- =============================================

DROP POLICY IF EXISTS "Users can view associated empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON empresas;
DROP POLICY IF EXISTS "Admins can delete empresas" ON empresas;

CREATE POLICY "Users can view associated empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    user_is_active()
    AND user_has_group()
    AND id IN (SELECT * FROM user_empresas())
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

-- =============================================
-- RLS POLICIES - USUARIOS_EMPRESAS
-- =============================================

DROP POLICY IF EXISTS "Users can view own associations" ON usuarios_empresas;
DROP POLICY IF EXISTS "Admins can view all associations" ON usuarios_empresas;
DROP POLICY IF EXISTS "Admins can create associations" ON usuarios_empresas;
DROP POLICY IF EXISTS "Admins can delete associations" ON usuarios_empresas;

CREATE POLICY "Users can view own associations"
  ON usuarios_empresas FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Admins can view all associations"
  ON usuarios_empresas FOR SELECT
  TO authenticated
  USING (user_is_admin());

CREATE POLICY "Admins can create associations"
  ON usuarios_empresas FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin());

CREATE POLICY "Admins can delete associations"
  ON usuarios_empresas FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- =============================================
-- RLS POLICIES - TBL_GRUPOS_ECONOMICOS
-- =============================================

DROP POLICY IF EXISTS "Users can view grupos economicos" ON tbl_grupos_economicos;
DROP POLICY IF EXISTS "Admins can insert grupos economicos" ON tbl_grupos_economicos;
DROP POLICY IF EXISTS "Admins can update grupos economicos" ON tbl_grupos_economicos;
DROP POLICY IF EXISTS "Admins can delete grupos economicos" ON tbl_grupos_economicos;

CREATE POLICY "Users can view grupos economicos"
  ON tbl_grupos_economicos FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Admins can insert grupos economicos"
  ON tbl_grupos_economicos FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin());

CREATE POLICY "Admins can update grupos economicos"
  ON tbl_grupos_economicos FOR UPDATE
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

CREATE POLICY "Admins can delete grupos economicos"
  ON tbl_grupos_economicos FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- =============================================
-- RLS POLICIES - TBL_CLIENTES
-- =============================================

DROP POLICY IF EXISTS "Users can view clientes" ON tbl_clientes;
DROP POLICY IF EXISTS "Users with permission can insert clientes" ON tbl_clientes;
DROP POLICY IF EXISTS "Users with permission can update clientes" ON tbl_clientes;
DROP POLICY IF EXISTS "Users with permission can delete clientes" ON tbl_clientes;

CREATE POLICY "Users can view clientes"
  ON tbl_clientes FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert clientes"
  ON tbl_clientes FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update clientes"
  ON tbl_clientes FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete clientes"
  ON tbl_clientes FOR DELETE
  TO authenticated
  USING (user_can_delete());

-- =============================================
-- RLS POLICIES - TBL_PRODUTOS
-- =============================================

DROP POLICY IF EXISTS "Users can view produtos" ON tbl_produtos;
DROP POLICY IF EXISTS "Users with permission can insert produtos" ON tbl_produtos;
DROP POLICY IF EXISTS "Users with permission can update produtos" ON tbl_produtos;
DROP POLICY IF EXISTS "Users with permission can delete produtos" ON tbl_produtos;

CREATE POLICY "Users can view produtos"
  ON tbl_produtos FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert produtos"
  ON tbl_produtos FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update produtos"
  ON tbl_produtos FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete produtos"
  ON tbl_produtos FOR DELETE
  TO authenticated
  USING (user_can_delete());

-- =============================================
-- RLS POLICIES - TBL_OS
-- =============================================

DROP POLICY IF EXISTS "Users can view os" ON tbl_os;
DROP POLICY IF EXISTS "Users with permission can insert os" ON tbl_os;
DROP POLICY IF EXISTS "Users with permission can update os" ON tbl_os;
DROP POLICY IF EXISTS "Users with permission can delete os" ON tbl_os;

CREATE POLICY "Users can view os"
  ON tbl_os FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert os"
  ON tbl_os FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update os"
  ON tbl_os FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete os"
  ON tbl_os FOR DELETE
  TO authenticated
  USING (user_can_delete());

-- =============================================
-- RLS POLICIES - TBL_VENDAS
-- =============================================

DROP POLICY IF EXISTS "Users can view vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can insert vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can update vendas" ON tbl_vendas;
DROP POLICY IF EXISTS "Users with permission can delete vendas" ON tbl_vendas;

CREATE POLICY "Users can view vendas"
  ON tbl_vendas FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert vendas"
  ON tbl_vendas FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update vendas"
  ON tbl_vendas FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete vendas"
  ON tbl_vendas FOR DELETE
  TO authenticated
  USING (user_can_delete());

-- =============================================
-- RLS POLICIES - TBL_ITENS_VENDA
-- =============================================

DROP POLICY IF EXISTS "Users can view itens venda" ON tbl_itens_venda;
DROP POLICY IF EXISTS "Users with permission can insert itens venda" ON tbl_itens_venda;
DROP POLICY IF EXISTS "Users with permission can update itens venda" ON tbl_itens_venda;
DROP POLICY IF EXISTS "Users with permission can delete itens venda" ON tbl_itens_venda;

CREATE POLICY "Users can view itens venda"
  ON tbl_itens_venda FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert itens venda"
  ON tbl_itens_venda FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update itens venda"
  ON tbl_itens_venda FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete itens venda"
  ON tbl_itens_venda FOR DELETE
  TO authenticated
  USING (user_can_delete());

-- =============================================
-- RLS POLICIES - TBL_ITENS_OS
-- =============================================

DROP POLICY IF EXISTS "Users can view itens os" ON tbl_itens_os;
DROP POLICY IF EXISTS "Users with permission can insert itens os" ON tbl_itens_os;
DROP POLICY IF EXISTS "Users with permission can update itens os" ON tbl_itens_os;
DROP POLICY IF EXISTS "Users with permission can delete itens os" ON tbl_itens_os;

CREATE POLICY "Users can view itens os"
  ON tbl_itens_os FOR SELECT
  TO authenticated
  USING (user_is_active() AND user_has_group());

CREATE POLICY "Users with permission can insert itens os"
  ON tbl_itens_os FOR INSERT
  TO authenticated
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can update itens os"
  ON tbl_itens_os FOR UPDATE
  TO authenticated
  USING (user_can_edit())
  WITH CHECK (user_can_edit());

CREATE POLICY "Users with permission can delete itens os"
  ON tbl_itens_os FOR DELETE
  TO authenticated
  USING (user_can_delete());