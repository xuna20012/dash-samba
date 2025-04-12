/*
  # Merge first_name and last_name columns into name column

  1. Changes
    - Check if name column exists
    - Add name column if it doesn't exist
    - Merge first_name and last_name into name
    - Drop old columns
    - Add comment
    
  2. Notes
    - Handles case where name column already exists
    - Preserves existing data
*/

DO $$ 
BEGIN
  -- Check if name column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'name'
  ) THEN
    -- Add the new name column
    ALTER TABLE appointments 
    ADD COLUMN name TEXT;

    -- Merge first_name and last_name into the new name column
    UPDATE appointments 
    SET name = CONCAT(first_name, ' ', last_name);

    -- Make name column NOT NULL after data migration
    ALTER TABLE appointments 
    ALTER COLUMN name SET NOT NULL;

    -- Drop the old columns
    ALTER TABLE appointments 
    DROP COLUMN first_name,
    DROP COLUMN last_name;

    -- Add comment for the new column
    COMMENT ON COLUMN appointments.name IS 'Full name of the client';
  END IF;
END $$;