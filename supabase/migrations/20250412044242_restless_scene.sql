/*
  # Create quotes table

  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `phone_number` (text)
      - `email` (text)
      - `amount` (numeric)
      - `details` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on quotes table
    - Add policies for authenticated users
*/

-- Drop existing policies and trigger if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read all quotes" ON quotes;
  DROP POLICY IF EXISTS "Authenticated users can insert quotes" ON quotes;
  DROP POLICY IF EXISTS "Authenticated users can update quotes" ON quotes;
  DROP POLICY IF EXISTS "Authenticated users can delete quotes" ON quotes;
  DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  amount numeric NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read all quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS quotes_customer_name_idx ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();