/*
  # Fix auth schema and admin user creation

  1. Changes
    - Clean up inconsistent data
    - Update existing admin user if exists
    - Create admin user only if doesn't exist
    - Fix role handling
    
  2. Security
    - Maintain data integrity
    - Ensure proper role assignment
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up any inconsistent data
DO $$ 
BEGIN
  -- Delete orphaned profiles
  DELETE FROM public.users pu
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = pu.id
  );

  -- Delete orphaned auth users
  DELETE FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );
END $$;

-- Update existing users to ensure correct role metadata
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    COALESCE(
      (SELECT to_jsonb(role) FROM public.users WHERE id = auth.users.id),
      '"agent"'
    )
  ),
  role = 'authenticated'
WHERE raw_user_meta_data->>'role' IS NULL 
   OR raw_user_meta_data->>'role' != (
     SELECT role FROM public.users WHERE id = auth.users.id
   );

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_name text;
  avatar_url text;
  user_role text;
BEGIN
  -- Generate default name from email
  default_name := split_part(new.email, '@', 1);
  
  -- Get role from metadata or default to 'agent'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'agent');
  
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
    user_role,
    avatar_url,
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update or create admin user
DO $$ 
DECLARE
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';
  existing_auth_user auth.users%ROWTYPE;
  existing_profile public.users%ROWTYPE;
BEGIN
  -- Check for existing admin user
  SELECT * INTO existing_auth_user FROM auth.users WHERE email = admin_email;
  SELECT * INTO existing_profile FROM public.users WHERE email = admin_email;

  -- If admin exists, update metadata
  IF existing_auth_user IS NOT NULL THEN
    UPDATE auth.users
    SET 
      raw_user_meta_data = '{"name":"Admin","role":"admin"}'::jsonb,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      role = 'authenticated',
      updated_at = now()
    WHERE id = existing_auth_user.id;

    -- Update profile if exists
    IF existing_profile IS NOT NULL THEN
      UPDATE public.users
      SET 
        role = 'admin',
        updated_at = now()
      WHERE id = existing_auth_user.id;
    END IF;
  END IF;
END $$;