/*
  # Add avatar_url column and constraints to users table

  1. Changes
    - Add avatar_url column if it doesn't exist
    - Add foreign key constraint to auth.users if not exists
    - Make email required and unique if not already
    - Add proper error handling for existing constraints

  2. Notes
    - Uses IF NOT EXISTS checks to avoid errors
    - Maintains data integrity
    - Safe to run multiple times
*/

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Make id reference auth.users if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id);
  END IF;
END $$;

-- Make email required and unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_email_key'
  ) THEN
    ALTER TABLE users 
    ALTER COLUMN email SET NOT NULL,
    ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;