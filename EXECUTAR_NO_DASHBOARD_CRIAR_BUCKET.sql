
-- COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE DASHBOARD
-- PARA CRIAR O BUCKET DE UPLOAD (SE O COMANDO AUTOMÁTICO FALHAR)

INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'imports' );

CREATE POLICY "Authenticated can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING ( bucket_id = 'imports' );
