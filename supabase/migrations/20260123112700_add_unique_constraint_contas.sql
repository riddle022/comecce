-- Migración para añadir restricción de unicidad en tbl_contas para permitir UPSERT inteligente
-- Basado en: id_empresa, numero_documento, parcela, fornecedor, data_vencimento

ALTER TABLE tbl_contas 
ADD CONSTRAINT unique_conta_key 
UNIQUE (id_empresa, numero_documento, parcela, fornecedor, data_vencimento);
