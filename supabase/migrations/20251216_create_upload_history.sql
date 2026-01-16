-- Create table for upload history
CREATE TABLE IF NOT EXISTS public.tbl_historico_uploads (
    id_upload uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    id_empresa uuid NOT NULL,
    data_upload timestamp with time zone DEFAULT now(),
    arquivo_vendas text,
    arquivo_produtos text,
    arquivo_os text,
    total_vendas integer DEFAULT 0,
    total_os integer DEFAULT 0,
    status text DEFAULT 'sucesso',
    CONSTRAINT fk_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);

-- Add id_upload column to tbl_vendas
ALTER TABLE public.tbl_vendas 
ADD COLUMN IF NOT EXISTS id_upload uuid REFERENCES public.tbl_historico_uploads(id_upload) ON DELETE CASCADE;

-- Add id_upload column to tbl_ordem_servico
ALTER TABLE public.tbl_ordem_servico 
ADD COLUMN IF NOT EXISTS id_upload uuid REFERENCES public.tbl_historico_uploads(id_upload) ON DELETE CASCADE;

-- Create index for faster deletion/querying by upload
CREATE INDEX IF NOT EXISTS idx_vendas_upload ON public.tbl_vendas(id_upload);
CREATE INDEX IF NOT EXISTS idx_os_upload ON public.tbl_ordem_servico(id_upload);

-- RLS Policies (Optional but recommended)
ALTER TABLE public.tbl_historico_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users based on company"
ON public.tbl_historico_uploads
FOR ALL
USING (true); -- Adjust this based on your actual RLS needs (e.g., auth.uid() check)
