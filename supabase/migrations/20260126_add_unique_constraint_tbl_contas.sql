-- Add unique constraint to tbl_contas to allow safe UPSERT and prevent duplicates
-- The unique key will be: id_empresa, data_pagamento, valor_pago, categoria, fornecedor
-- This means we can have multiple payments on the same day for same category, AS LONG AS either value or supplier is different.
-- If EVERYTHING is identical, it's considered a duplicate and will be handled by UPSERT.

ALTER TABLE public.tbl_contas
ADD CONSTRAINT tbl_contas_unique_entry 
UNIQUE (id_empresa, data_pagamento, valor_pago, categoria, fornecedor);
