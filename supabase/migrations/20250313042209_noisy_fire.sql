/*
  # Create appointments and available_dates tables

  1. New Tables
    - `available_dates`
      - `id` (uuid, primary key)
      - `datetime` (timestamptz)
      - `status` (text)
      - `client_name` (text)
      - `client_phone` (text)
      - `created_at` (timestamptz)

    - `appointments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `email` (text)
      - `brand` (text)
      - `model` (text)
      - `year` (integer)
      - `service` (text)
      - `date_id` (uuid)
      - `status` (text)
      - `fuel` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create available_dates table
CREATE TABLE IF NOT EXISTS available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available',
  client_name text,
  client_phone text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT available_dates_status_check CHECK (status IN ('available', 'booked'))
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  service text NOT NULL,
  date_id uuid REFERENCES available_dates(id) NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  fuel text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT appointments_status_check CHECK (status IN ('confirmed', 'cancelled')),
  CONSTRAINT appointments_fuel_check CHECK (fuel IN ('essence', 'diesel', 'hybride', 'électrique', 'gpl'))
);

-- Enable RLS
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Available dates are viewable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are insertable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are updatable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Available dates are deletable by authenticated users" ON available_dates;
  DROP POLICY IF EXISTS "Appointments are viewable by authenticated users" ON appointments;
  DROP POLICY IF EXISTS "Appointments are insertable by authenticated users" ON appointments;
  DROP POLICY IF EXISTS "Appointments are updatable by authenticated users" ON appointments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for available_dates
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
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Available dates are deletable by authenticated users"
  ON available_dates
  FOR DELETE
  TO authenticated
  USING (status = 'available');

-- Create policies for appointments
CREATE POLICY "Appointments are viewable by authenticated users"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Appointments are insertable by authenticated users"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Appointments are updatable by authenticated users"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS available_dates_datetime_idx ON available_dates(datetime);
CREATE INDEX IF NOT EXISTS available_dates_status_idx ON available_dates(status);
CREATE INDEX IF NOT EXISTS appointments_date_id_idx ON appointments(date_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);

-- Add comments
COMMENT ON TABLE available_dates IS 'Available dates for appointments';
COMMENT ON TABLE appointments IS 'Customer appointments';