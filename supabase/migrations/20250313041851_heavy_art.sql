/*
  # Create available dates table

  1. Changes
    - Create available_dates table if not exists
    - Add policies for authenticated users
    - Add trigger for updated_at timestamp
    - Handle existing policies gracefully

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create the available_dates table
CREATE TABLE IF NOT EXISTS available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  client_name text,
  client_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can insert available dates" ON available_dates;
  DROP POLICY IF EXISTS "Users can update available dates" ON available_dates;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies for authenticated users
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
  USING (true)
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_available_dates_updated_at ON available_dates;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_available_dates_updated_at
  BEFORE UPDATE ON available_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();