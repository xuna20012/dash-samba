/*
  # Create quotes table

  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `customer_name` (text, required)
      - `phone_number` (text, required)
      - `email` (text, required)
      - `amount` (numeric, required)
      - `details` (text, required)
      - `status` (text, default: 'pending')
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `quotes` table
    - Add policies for authenticated users to perform CRUD operations
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to view quotes" ON quotes;
  DROP POLICY IF EXISTS "Allow authenticated users to create quotes" ON quotes;
  DROP POLICY IF EXISTS "Allow authenticated users to update quotes" ON quotes;
  DROP POLICY IF EXISTS "Allow authenticated users to delete quotes" ON quotes;
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
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Add constraint to validate status values
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quotes' AND indexname = 'quotes_customer_name_idx'
  ) THEN
    CREATE INDEX quotes_customer_name_idx ON quotes(customer_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quotes' AND indexname = 'quotes_status_idx'
  ) THEN
    CREATE INDEX quotes_status_idx ON quotes(status);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quotes_updated_at'
  ) THEN
    CREATE TRIGGER update_quotes_updated_at
      BEFORE UPDATE ON quotes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;