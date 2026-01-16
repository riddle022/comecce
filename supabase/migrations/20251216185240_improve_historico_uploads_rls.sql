/*
  # Mejorar políticas RLS de tbl_historico_uploads

  1. Seguridad
    - Eliminar política permissiva existente
    - Crear políticas restrictivas basadas en membresía de empresa
    - Los usuarios solo pueden ver/eliminar uploads de sus empresas

  2. Políticas
    - SELECT: Usuario puede ver uploads de empresas a las que tiene acceso
    - DELETE: Usuario puede eliminar uploads de empresas a las que tiene acceso
    - INSERT: Manejado por Edge Function con service role key
    - UPDATE: No necesario para este flujo
*/

-- Eliminar política permissiva existente
DROP POLICY IF EXISTS "Enable read/write for authenticated users based on company" ON public.tbl_historico_uploads;

-- Política de SELECT: usuarios pueden ver uploads de sus empresas
CREATE POLICY "Users can view uploads from their companies"
  ON public.tbl_historico_uploads
  FOR SELECT
  TO authenticated
  USING (
    id_empresa IN (
      SELECT ue.empresa_id
      FROM public.usuarios_empresas ue
      INNER JOIN public.perfis p ON p.id = ue.usuario_id
      WHERE p.id = auth.uid()
    )
  );

-- Política de DELETE: usuarios podem eliminar uploads de suas empresas
CREATE POLICY "Users can delete uploads from their companies"
  ON public.tbl_historico_uploads
  FOR DELETE
  TO authenticated
  USING (
    id_empresa IN (
      SELECT ue.empresa_id
      FROM public.usuarios_empresas ue
      INNER JOIN public.perfis p ON p.id = ue.usuario_id
      WHERE p.id = auth.uid()
    )
  );

-- Política de INSERT: permitir Edge Functions com service role key
CREATE POLICY "Service role can insert upload history"
  ON public.tbl_historico_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);