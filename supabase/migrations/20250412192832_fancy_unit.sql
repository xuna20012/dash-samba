/*
  # Fix available dates policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Add policy for deletion
    
  2. Security
    - Enable proper access control
    - Allow modification of available dates
    - Allow deletion of available dates
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can insert available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can update available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can delete available dates" ON available_dates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies with proper permissions
CREATE POLICY "Available dates are viewable by authenticated users"
  ON available_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Available dates are insertable by authenticated users"
  ON available_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Available dates are updatable by authenticated users"
  ON available_dates
  FOR UPDATE
  TO authenticated
  USING (status = 'available')
  WITH CHECK (true);

CREATE POLICY "Available dates are deletable by authenticated users"
  ON available_dates
  FOR DELETE
  TO authenticated
  USING (status = 'available');