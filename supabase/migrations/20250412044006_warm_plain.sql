/*
  # Create available_dates table

  1. New Tables
    - `available_dates`
      - `id` (uuid, primary key)
      - `datetime` (timestamptz)
      - `status` (text)
      - `client_name` (text)
      - `client_phone` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on available_dates table
    - Add policies for authenticated users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can insert available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can update available dates" ON available_dates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create available_dates table
CREATE TABLE IF NOT EXISTS available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  client_name text,
  client_phone text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read available dates"
  ON available_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert available dates"
  ON available_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update available dates"
  ON available_dates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS available_dates_datetime_idx ON available_dates(datetime);
CREATE INDEX IF NOT EXISTS available_dates_status_idx ON available_dates(status);