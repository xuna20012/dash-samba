/*
  # Create appointments table with triggers

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
      - `date_id` (uuid, references available_dates)
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
  first_name text NOT NULL,
  last_name text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  service text NOT NULL,
  date_id uuid NOT NULL REFERENCES available_dates(id),
  phone text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to read appointments" ON appointments;
  DROP POLICY IF EXISTS "Allow authenticated users to insert appointments" ON appointments;
  DROP POLICY IF EXISTS "Allow authenticated users to update appointments" ON appointments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Allow authenticated users to read appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update the available_dates status
CREATE OR REPLACE FUNCTION update_available_date_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the available_date status to booked and set client info
    UPDATE available_dates
    SET 
      status = 'booked',
      client_name = NEW.first_name || ' ' || NEW.last_name,
      client_phone = NEW.phone
    WHERE id = NEW.date_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    -- Reset the available_date status to available and clear client info
    UPDATE available_dates
    SET 
      status = 'available',
      client_name = NULL,
      client_phone = NULL
    WHERE id = NEW.date_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointments
CREATE TRIGGER update_available_date_status_trigger
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_available_date_status();

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();