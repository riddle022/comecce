
-- Add columns to tbl_historico_uploads for financial data
ALTER TABLE public.tbl_historico_uploads
ADD COLUMN IF NOT EXISTS arquivo_financeiro text,
ADD COLUMN IF NOT EXISTS total_financeiro integer DEFAULT 0;

-- Add id_upload to tbl_contas to link records to their upload event
ALTER TABLE public.tbl_contas
ADD COLUMN IF NOT EXISTS id_upload uuid REFERENCES public.tbl_historico_uploads(id_upload) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contas_upload ON public.tbl_contas(id_upload);
