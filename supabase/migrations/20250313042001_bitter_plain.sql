/*
  # Update available_dates table structure

  1. Changes
    - Add datetime column if it doesn't exist
    - Migrate data from date and time columns
    - Make datetime column required
    - Drop old columns
    
  2. Notes
    - Handles case where datetime column already exists
    - Preserves existing data
*/

-- First check if datetime column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'available_dates' 
    AND column_name = 'datetime'
  ) THEN
    -- Add new datetime column
    ALTER TABLE available_dates 
    ADD COLUMN datetime timestamptz;

    -- Update the new column with combined date and time
    UPDATE available_dates
    SET datetime = (date || ' ' || time)::timestamptz
    WHERE date IS NOT NULL AND time IS NOT NULL;

    -- Make datetime column required
    ALTER TABLE available_dates
    ALTER COLUMN datetime SET NOT NULL;

    -- Drop old columns
    ALTER TABLE available_dates
    DROP COLUMN date,
    DROP COLUMN time;
  END IF;
END $$;