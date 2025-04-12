/*
  # Create appointments table

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `email` (text)
      - `brand` (text)
      - `model` (text)
      - `year` (integer)
      - `service` (text)
      - `date_id` (uuid, foreign key)
      - `status` (text)
      - `fuel` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on appointments table
    - Add policies for authenticated users
*/

-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  service text NOT NULL,
  date_id uuid NOT NULL REFERENCES available_dates(id),
  status text NOT NULL CHECK (status IN ('confirmed', 'cancelled')) DEFAULT 'confirmed',
  fuel text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read all appointments" ON appointments;
  DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
  DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
  DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Authenticated users can read all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing indexes if they exist
DO $$ 
BEGIN
  DROP INDEX IF EXISTS appointments_date_id_idx;
  DROP INDEX IF EXISTS appointments_created_at_idx;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS appointments_date_id_idx ON appointments(date_id);
CREATE INDEX IF NOT EXISTS appointments_created_at_idx ON appointments(created_at);