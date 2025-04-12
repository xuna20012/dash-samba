/*
  # Add created_by column and status constraints to appointments table

  1. Changes
    - Add created_by column if it doesn't exist
    - Add status check constraint if it doesn't exist
    - Set default status for new appointments
    - Add comment for created_by column
    
  2. Notes
    - Handles case where column already exists
    - Preserves existing data
*/

DO $$ 
BEGIN
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN created_by uuid REFERENCES auth.users(id);

    -- Add comment for created_by column
    COMMENT ON COLUMN appointments.created_by IS 'Reference to the user who created the appointment';
  END IF;

  -- Add check constraint for status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('confirmed', 'cancelled'));
  END IF;

  -- Set default status for new appointments if not already set
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'status' 
    AND column_default = '''confirmed''::text'
  ) THEN
    ALTER TABLE appointments
    ALTER COLUMN status SET DEFAULT 'confirmed';
  END IF;
END $$;