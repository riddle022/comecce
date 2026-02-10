-- Remove unique constraint from tbl_contas to allow duplicate rows
-- (same date, value, category, supplier combinations are valid in accounting data)
ALTER TABLE public.tbl_contas DROP CONSTRAINT IF EXISTS tbl_contas_unique_entry;
