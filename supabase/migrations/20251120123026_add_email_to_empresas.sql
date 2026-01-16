/*
  # Add Email Field to Empresas Table

  1. Changes
    - Add `email` column to `empresas` table
      - Type: text
      - Nullable: true (optional field)
      - No unique constraint (multiple companies can share contact emails)
  
  2. Notes
    - Email field is optional to maintain backward compatibility
    - No validation constraint at database level (handled by frontend)
    - Updated_at trigger already exists from previous migration
*/

-- Add email column to empresas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'email'
  ) THEN
    ALTER TABLE empresas ADD COLUMN email text;
  END IF;
END $$;
