/*
  # Create available dates table

  1. New Tables
    - `available_dates`
      - `id` (uuid, primary key)
      - `datetime` (timestamptz)
      - `status` (text)
      - `client_name` (text)
      - `client_phone` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `available_dates` table
    - Add policies for authenticated users
*/

-- Create available_dates table
CREATE TABLE IF NOT EXISTS available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datetime timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'booked')) DEFAULT 'available',
  client_name text,
  client_phone text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read all dates" ON available_dates;
  DROP POLICY IF EXISTS "Authenticated users can insert dates" ON available_dates;
  DROP POLICY IF EXISTS "Authenticated users can update dates" ON available_dates;
  DROP POLICY IF EXISTS "Authenticated users can delete dates" ON available_dates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Authenticated users can read all dates"
  ON available_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dates"
  ON available_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dates"
  ON available_dates
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete dates"
  ON available_dates
  FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing indexes if they exist
DO $$ 
BEGIN
  DROP INDEX IF EXISTS available_dates_datetime_idx;
  DROP INDEX IF EXISTS available_dates_status_idx;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS available_dates_datetime_idx ON available_dates(datetime);
CREATE INDEX IF NOT EXISTS available_dates_status_idx ON available_dates(status);