/*
  # Add fuel column to appointments table

  1. Changes
    - Add fuel column if it doesn't exist
    - Set default value and constraints
    - Add column comment
    
  2. Notes
    - Handles case where fuel column already exists
    - Preserves existing data
*/

DO $$ 
BEGIN
  -- Check if fuel column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'fuel'
  ) THEN
    -- Add fuel column with default value and constraint
    ALTER TABLE appointments
    ADD COLUMN fuel TEXT NOT NULL DEFAULT 'essence'
    CHECK (fuel IN ('essence', 'diesel', 'hybride', 'électrique', 'gpl'));

    -- Add comment for the new column
    COMMENT ON COLUMN appointments.fuel IS 'Type of fuel used by the vehicle';
  END IF;
END $$;