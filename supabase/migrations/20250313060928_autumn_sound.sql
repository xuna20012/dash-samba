/*
  # Fix admin user creation and role handling

  1. Changes
    - Clean up inconsistent data
    - Update existing users' metadata
    - Fix handle_new_user function
    - Update existing admin or create new one if needed
    
  2. Notes
    - Handles existing admin user gracefully
    - Maintains data consistency
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

-- Update existing admin user or create new one if needed
DO $$ 
DECLARE
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';
  existing_auth_user auth.users%ROWTYPE;
  existing_profile public.users%ROWTYPE;
  admin_id uuid;
BEGIN
  -- Check for existing admin user
  SELECT * INTO existing_auth_user FROM auth.users WHERE email = admin_email;
  SELECT * INTO existing_profile FROM public.users WHERE email = admin_email;

  -- If admin exists in auth.users but not in public.users
  IF existing_auth_user IS NOT NULL AND existing_profile IS NULL THEN
    -- Create missing profile
    INSERT INTO public.users (
      id,
      name,
      email,
      role,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      existing_auth_user.id,
      'Admin',
      admin_email,
      'admin',
      'https://ui-avatars.com/api/?name=Admin&background=random',
      now(),
      now()
    );
  -- If admin exists in public.users but not in auth.users
  ELSIF existing_auth_user IS NULL AND existing_profile IS NOT NULL THEN
    -- Delete orphaned profile
    DELETE FROM public.users WHERE id = existing_profile.id;
    -- Will create new admin below
  END IF;

  -- If no admin exists at all, create new one
  IF existing_auth_user IS NULL THEN
    -- Generate new UUID
    admin_id := gen_random_uuid();
    
    -- Create auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin","role":"admin"}'::jsonb,
      false,
      now(),
      now()
    );
  ELSE
    -- Update existing admin user metadata
    UPDATE auth.users
    SET 
      raw_user_meta_data = '{"name":"Admin","role":"admin"}'::jsonb,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      role = 'authenticated',
      updated_at = now()
    WHERE id = existing_auth_user.id;

    -- Update existing admin profile
    UPDATE public.users
    SET 
      role = 'admin',
      name = 'Admin',
      updated_at = now()
    WHERE id = existing_auth_user.id;
  END IF;
END $$;