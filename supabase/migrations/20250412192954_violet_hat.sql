/*
  # Update available dates policies

  1. Changes
    - Drop and recreate policies with proper permissions
    - Add policy for deletion
    - Fix naming conflicts
    
  2. Security
    - Enable proper access control
    - Allow modification of available dates
    - Allow deletion of available dates
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Available dates are viewable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are insertable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are updatable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are deletable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Users can read available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can insert available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can update available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can delete available dates" ON available_dates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies with proper permissions
CREATE POLICY "dates_select_policy"
  ON available_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "dates_insert_policy"
  ON available_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "dates_update_policy"
  ON available_dates
  FOR UPDATE
  TO authenticated
  USING (status = 'available')
  WITH CHECK (true);

CREATE POLICY "dates_delete_policy"
  ON available_dates
  FOR DELETE
  TO authenticated
  USING (status = 'available');