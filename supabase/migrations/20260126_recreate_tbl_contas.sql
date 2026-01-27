-- Recreate tbl_contas with specific columns requested by the user
DROP TABLE IF EXISTS public.tbl_contas;

CREATE TABLE public.tbl_contas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_empresa UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    data_pagamento DATE,
    valor_pago DECIMAL(15,2),
    categoria TEXT,
    status TEXT,
    fornecedor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX idx_contas_empresa ON public.tbl_contas(id_empresa);
CREATE INDEX idx_contas_data_pagamento ON public.tbl_contas(data_pagamento);
CREATE INDEX idx_contas_categoria ON public.tbl_contas(categoria);

-- Enable RLS
ALTER TABLE public.tbl_contas ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Matching pattern from other tables)

-- 1. Select: Users can view accounts for companies they are linked to
CREATE POLICY "Usuários podem ver contas de empresas associadas"
  ON public.tbl_contas FOR SELECT
  TO authenticated
  USING (
    id_empresa IN (
      SELECT empresa_id FROM public.usuarios_empresas
      WHERE usuario_id = auth.uid()
    )
  );

-- 2. Insert: Users with edit permission can insert
CREATE POLICY "Usuários com permissão podem inserir contas"
  ON public.tbl_contas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis p
      JOIN public.grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

-- 3. Update: Users with edit permission can update
CREATE POLICY "Usuários com permissão podem atualizar contas"
  ON public.tbl_contas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      JOIN public.grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'edit_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );

-- 4. Delete: Users with delete permission can delete
CREATE POLICY "Usuários com permissão podem deletar contas"
  ON public.tbl_contas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      JOIN public.grupos g ON p.grupo_id = g.id
      WHERE p.id = auth.uid()
      AND ((g.permissoes->>'delete_data')::boolean = true OR (g.permissoes->>'admin')::boolean = true)
    )
  );
