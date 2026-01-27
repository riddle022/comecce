-- Migration: Fix Contas Delete Cascade
-- Description: Updates the foreign key on tbl_contas to use ON DELETE CASCADE instead of ON DELETE SET NULL

-- 1. Find the constraint name (it's likely tbl_contas_id_upload_fkey but let's be safe and just run an anonymous block or drop by name if known)
-- Based on the previous migration: ADD COLUMN IF NOT EXISTS id_upload uuid REFERENCES public.tbl_historico_uploads(id_upload) ON DELETE SET NULL;
-- Postgres usually names it: [table]_[column]_fkey

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tbl_contas_id_upload_fkey') THEN
        ALTER TABLE public.tbl_contas DROP CONSTRAINT tbl_contas_id_upload_fkey;
    END IF;
END $$;

-- 2. Add it back with CASCADE
ALTER TABLE public.tbl_contas
ADD CONSTRAINT tbl_contas_id_upload_fkey 
FOREIGN KEY (id_upload) 
REFERENCES public.tbl_historico_uploads(id_upload) 
ON DELETE CASCADE;
