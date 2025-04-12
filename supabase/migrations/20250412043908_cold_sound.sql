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
      - `created_by` (uuid, foreign key)

  2. Security
    - Enable RLS on appointments table
    - Add policies for authenticated users
*/

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
  date_id uuid REFERENCES available_dates(id),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  fuel text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create appointments"
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

-- Create indexes
CREATE INDEX IF NOT EXISTS appointments_date_id_idx ON appointments(date_id);
CREATE INDEX IF NOT EXISTS appointments_created_at_idx ON appointments(created_at);
CREATE INDEX IF NOT EXISTS appointments_created_by_idx ON appointments(created_by);

-- Create function to update available_date status
CREATE OR REPLACE FUNCTION update_available_date_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the available_date status to booked and set client info
    UPDATE available_dates
    SET 
      status = 'booked',
      client_name = NEW.name,
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

-- Create trigger
CREATE TRIGGER update_available_date_status_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_available_date_status();