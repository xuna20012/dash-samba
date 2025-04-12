/*
  # Create appointments table

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `phone` (text, required)
      - `email` (text, required)
      - `brand` (text, required)
      - `model` (text, required)
      - `year` (int4, required)
      - `service` (text, required)
      - `date_id` (uuid, foreign key to available_dates)
      - `status` (text, default: 'confirmed')
      - `fuel` (text, required)
      - `created_at` (timestamp with timezone, default: now())
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `appointments` table
    - Add policies for:
      - Authenticated users can read all appointments
      - Authenticated users can create appointments
      - Authenticated users can update their own appointments
      - Authenticated users can delete their own appointments
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year int4 NOT NULL,
  service text NOT NULL,
  date_id uuid REFERENCES available_dates(id),
  status text DEFAULT 'confirmed',
  fuel text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies
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

CREATE POLICY "Authenticated users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete their own appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS appointments_date_id_idx ON appointments(date_id);
CREATE INDEX IF NOT EXISTS appointments_created_by_idx ON appointments(created_by);