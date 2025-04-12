/*
  # Create appointments and discussions tables

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `email` (text)
      - `brand` (text)
      - `model` (text)
      - `year` (int4)
      - `service` (text)
      - `date_id` (uuid, foreign key)
      - `status` (text)
      - `fuel` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

    - `discussions`
      - `id` (int4, primary key)
      - `session_id` (varchar)
      - `type` (varchar)
      - `message` (text)
      - `created_at` (timestamptz)
      - `client_name` (varchar)
      - `read` (boolean)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view all appointments" ON appointments;
  DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
  DROP POLICY IF EXISTS "Users can update appointments" ON appointments;
  DROP POLICY IF EXISTS "Users can delete appointments" ON appointments;
  DROP POLICY IF EXISTS "Users can view all discussions" ON discussions;
  DROP POLICY IF EXISTS "Users can create discussions" ON discussions;
  DROP POLICY IF EXISTS "Users can update discussions" ON discussions;
  DROP POLICY IF EXISTS "Users can delete discussions" ON discussions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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

-- Create discussions table
CREATE TABLE IF NOT EXISTS discussions (
  id int4 PRIMARY KEY DEFAULT nextval('discussions_id_seq'),
  session_id varchar NOT NULL,
  type varchar NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  client_name varchar NOT NULL,
  read boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Users can view all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (true);

-- Discussions policies
CREATE POLICY "Users can view all discussions"
  ON discussions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create discussions"
  ON discussions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update discussions"
  ON discussions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete discussions"
  ON discussions
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'appointments' AND indexname = 'idx_appointments_date_id'
  ) THEN
    CREATE INDEX idx_appointments_date_id ON appointments(date_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'appointments' AND indexname = 'idx_appointments_created_at'
  ) THEN
    CREATE INDEX idx_appointments_created_at ON appointments(created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'discussions' AND indexname = 'idx_discussions_session_id'
  ) THEN
    CREATE INDEX idx_discussions_session_id ON discussions(session_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'discussions' AND indexname = 'idx_discussions_created_at'
  ) THEN
    CREATE INDEX idx_discussions_created_at ON discussions(created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'discussions' AND indexname = 'idx_discussions_read'
  ) THEN
    CREATE INDEX idx_discussions_read ON discussions(read);
  END IF;
END $$;