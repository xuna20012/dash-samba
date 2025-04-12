/*
  # Update fuel column in appointments table

  1. Changes
    - Remove constraints from fuel column in appointments table
    - Allow any value for fuel type

  2. Notes
    - This change maintains existing data
    - No data type change, only constraint removal
*/

DO $$ 
BEGIN
  -- Drop any existing constraints on the fuel column
  ALTER TABLE appointments 
    ALTER COLUMN fuel DROP NOT NULL,
    ALTER COLUMN fuel TYPE text;
END $$;