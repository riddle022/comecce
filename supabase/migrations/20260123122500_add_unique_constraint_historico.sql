-- Migración para optimizar el historial de uploads
-- Limpia duplicados y añade restricción de unicidad

-- 1. Limpiar duplicados del historial manteniendo el más reciente
WITH duplicates AS (
    SELECT id_upload, 
           ROW_NUMBER() OVER (
               PARTITION BY id_empresa, ds_arquivo, tipo_importacao 
               ORDER BY data_upload DESC
           ) as row_num
    FROM tbl_historico_uploads
)
DELETE FROM tbl_historico_uploads 
WHERE id_upload IN (
    SELECT id_upload FROM duplicates WHERE row_num > 1
);

-- 2. Añadir restricción de unicidad para permitir UPSERT por archivo
ALTER TABLE tbl_historico_uploads 
DROP CONSTRAINT IF EXISTS unique_upload_file;

ALTER TABLE tbl_historico_uploads 
ADD CONSTRAINT unique_upload_file 
UNIQUE (id_empresa, ds_arquivo, tipo_importacao);
