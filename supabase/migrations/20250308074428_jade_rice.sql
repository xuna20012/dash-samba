/*
  # Create available dates table

  1. New Tables
    - `available_dates`
      - `id` (uuid, primary key)
      - `date` (date, not null)
      - `time` (time, not null)
      - `status` (text, default 'available')
      - `client_name` (text)
      - `client_phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `available_dates` table
    - Add policies for authenticated users to manage dates
*/

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

ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;

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