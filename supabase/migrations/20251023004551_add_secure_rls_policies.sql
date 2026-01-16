/*
  # Agregar Políticas RLS Basadas en Permisos de Grupos

  1. Nuevas Funciones Helper
    - `user_has_menu_access` - Verifica si el usuario tiene acceso a un recurso
    - `user_can_edit` - Verifica si el usuario puede editar datos
    - `user_can_delete` - Verifica si el usuario puede eliminar datos
    - `user_is_admin` - Verifica si el usuario es administrador

  2. Políticas Actualizadas
    - Empresas: Políticas basadas en permisos de grupo
    - Usuarios: Solo admin puede gestionar
    - Grupos: Solo admin puede gestionar
    - Datos comerciales, operacionales y financieros: Basados en permisos

  3. Seguridad
    - Las políticas verifican permisos del grupo en cada operación
    - Los usuarios sin grupo tienen acceso completo (backward compatibility)
    - Los administradores tienen acceso total
*/

-- Función para verificar si el usuario tiene acceso a un menú
CREATE OR REPLACE FUNCTION user_has_menu_access(menu_name text)
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  -- Si no tiene grupo, permitir acceso
  IF user_grupo_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  -- Si es admin, permitir acceso
  IF (user_permissions->>'admin')::boolean IS true THEN
    RETURN true;
  END IF;

  -- Verificar si el menú está en la lista de menus permitidos
  RETURN user_permissions->'menus' @> to_jsonb(menu_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario puede editar datos
CREATE OR REPLACE FUNCTION user_can_edit()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  -- Si no tiene grupo, permitir
  IF user_grupo_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  -- Si es admin, permitir
  IF (user_permissions->>'admin')::boolean IS true THEN
    RETURN true;
  END IF;

  -- Verificar permiso de edición
  RETURN (user_permissions->>'edit_data')::boolean IS true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario puede eliminar datos
CREATE OR REPLACE FUNCTION user_can_delete()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  -- Si no tiene grupo, permitir
  IF user_grupo_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  -- Si es admin, permitir
  IF (user_permissions->>'admin')::boolean IS true THEN
    RETURN true;
  END IF;

  -- Verificar permiso de eliminación
  RETURN (user_permissions->>'delete_data')::boolean IS true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  user_grupo_id uuid;
BEGIN
  SELECT grupo_id INTO user_grupo_id
  FROM perfis
  WHERE id = auth.uid();

  -- Si no tiene grupo, no es admin
  IF user_grupo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissoes INTO user_permissions
  FROM grupos
  WHERE id = user_grupo_id;

  RETURN (user_permissions->>'admin')::boolean IS true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas antiguas de empresas si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver empresas" ON empresas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar empresas" ON empresas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar empresas" ON empresas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar empresas" ON empresas;

-- Políticas para empresas basadas en permisos
CREATE POLICY "Usuarios con acceso al menu empresas pueden ver"
  ON empresas FOR SELECT
  TO authenticated
  USING (user_has_menu_access('empresas'));

CREATE POLICY "Usuarios con permiso de edicion pueden insertar empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (user_has_menu_access('empresas') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de edicion pueden actualizar empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (user_has_menu_access('empresas') AND user_can_edit())
  WITH CHECK (user_has_menu_access('empresas') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de eliminacion pueden eliminar empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (user_has_menu_access('empresas') AND user_can_delete());

-- Eliminar políticas antiguas de perfis si existen
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfis;
DROP POLICY IF EXISTS "Usuarios pueden ver otros perfiles" ON perfis;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar perfis" ON perfis;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON perfis;

-- Políticas para perfis (usuarios)
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON perfis FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Administradores pueden ver todos los perfiles"
  ON perfis FOR SELECT
  TO authenticated
  USING (user_is_admin());

CREATE POLICY "Sistema puede insertar nuevos perfiles"
  ON perfis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON perfis FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Administradores pueden actualizar cualquier perfil"
  ON perfis FOR UPDATE
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

-- Eliminar políticas antiguas de grupos si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver grupos" ON grupos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar grupos" ON grupos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar grupos" ON grupos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar grupos" ON grupos;

-- Políticas para grupos (solo administradores)
CREATE POLICY "Todos pueden ver grupos"
  ON grupos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden insertar grupos"
  ON grupos FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin());

CREATE POLICY "Solo administradores pueden actualizar grupos"
  ON grupos FOR UPDATE
  TO authenticated
  USING (user_is_admin())
  WITH CHECK (user_is_admin());

CREATE POLICY "Solo administradores pueden eliminar grupos"
  ON grupos FOR DELETE
  TO authenticated
  USING (user_is_admin());

-- Políticas para datos comerciales
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver datos comerciales" ON dados_comerciais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar dados comerciais" ON dados_comerciais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar dados comerciais" ON dados_comerciais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar dados comerciais" ON dados_comerciais;

CREATE POLICY "Usuarios con acceso a comercial pueden ver"
  ON dados_comerciais FOR SELECT
  TO authenticated
  USING (user_has_menu_access('comercial'));

CREATE POLICY "Usuarios con permiso de edicion pueden insertar dados comerciais"
  ON dados_comerciais FOR INSERT
  TO authenticated
  WITH CHECK (user_has_menu_access('comercial') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de edicion pueden actualizar dados comerciais"
  ON dados_comerciais FOR UPDATE
  TO authenticated
  USING (user_has_menu_access('comercial') AND user_can_edit())
  WITH CHECK (user_has_menu_access('comercial') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de eliminacion pueden eliminar dados comerciais"
  ON dados_comerciais FOR DELETE
  TO authenticated
  USING (user_has_menu_access('comercial') AND user_can_delete());

-- Políticas para datos operacionales
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver datos operacionales" ON dados_operacionais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar dados operacionais" ON dados_operacionais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar dados operacionais" ON dados_operacionais;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar dados operacionais" ON dados_operacionais;

CREATE POLICY "Usuarios con acceso a operacional pueden ver"
  ON dados_operacionais FOR SELECT
  TO authenticated
  USING (user_has_menu_access('operacional'));

CREATE POLICY "Usuarios con permiso de edicion pueden insertar dados operacionais"
  ON dados_operacionais FOR INSERT
  TO authenticated
  WITH CHECK (user_has_menu_access('operacional') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de edicion pueden actualizar dados operacionais"
  ON dados_operacionais FOR UPDATE
  TO authenticated
  USING (user_has_menu_access('operacional') AND user_can_edit())
  WITH CHECK (user_has_menu_access('operacional') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de eliminacion pueden eliminar dados operacionais"
  ON dados_operacionais FOR DELETE
  TO authenticated
  USING (user_has_menu_access('operacional') AND user_can_delete());

-- Políticas para datos financieros
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver datos financieros" ON dados_financeiros;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar dados financeiros" ON dados_financeiros;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar dados financeiros" ON dados_financeiros;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar dados financeiros" ON dados_financeiros;

CREATE POLICY "Usuarios con acceso a financeiro pueden ver"
  ON dados_financeiros FOR SELECT
  TO authenticated
  USING (user_has_menu_access('financeiro'));

CREATE POLICY "Usuarios con permiso de edicion pueden insertar dados financeiros"
  ON dados_financeiros FOR INSERT
  TO authenticated
  WITH CHECK (user_has_menu_access('financeiro') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de edicion pueden actualizar dados financeiros"
  ON dados_financeiros FOR UPDATE
  TO authenticated
  USING (user_has_menu_access('financeiro') AND user_can_edit())
  WITH CHECK (user_has_menu_access('financeiro') AND user_can_edit());

CREATE POLICY "Usuarios con permiso de eliminacion pueden eliminar dados financeiros"
  ON dados_financeiros FOR DELETE
  TO authenticated
  USING (user_has_menu_access('financeiro') AND user_can_delete());
