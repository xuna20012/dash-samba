/*
  # Fix authentication schema and user creation

  1. Changes
    - Enable auth schema extensions
    - Create auth schema if not exists
    - Update user creation trigger
    
  2. Notes
    - Ensures proper auth schema setup
    - Maintains data integrity
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_name text;
  avatar_url text;
BEGIN
  -- Generate default name from email
  default_name := split_part(new.email, '@', 1);
  
  -- Generate avatar URL
  avatar_url := 'https://ui-avatars.com/api/?name=' || 
                url_encode(default_name) || 
                '&background=random';

  -- Create user profile
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', default_name),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'agent'),
    avatar_url,
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure admin user exists and has correct permissions
DO $$ 
DECLARE
  admin_id uuid;
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';
BEGIN
  -- Create admin user if not exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin","role":"admin"}',
      now(),
      now()
    );
  END IF;
END $$;