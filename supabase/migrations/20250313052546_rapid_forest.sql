/*
  # Fix storage policies and ensure proper user creation

  1. Changes
    - Add proper storage policies for avatar uploads
    - Fix user creation to handle existing profiles
    - Add proper error handling for duplicates
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create proper storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'avatars'
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Ensure admin user exists with correct credentials
DO $$ 
DECLARE
  admin_id uuid;
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';
  existing_user_id uuid;
  existing_profile_id uuid;
BEGIN
  -- Check if admin exists in either table
  SELECT id INTO existing_user_id FROM auth.users WHERE email = admin_email;
  SELECT id INTO existing_profile_id FROM public.users WHERE email = admin_email;

  -- If user exists in auth but not in profile, delete auth user
  IF existing_user_id IS NOT NULL AND existing_profile_id IS NULL THEN
    DELETE FROM auth.users WHERE id = existing_user_id;
    existing_user_id := NULL;
  END IF;

  -- If profile exists but no auth user, delete profile
  IF existing_profile_id IS NOT NULL AND existing_user_id IS NULL THEN
    DELETE FROM public.users WHERE id = existing_profile_id;
    existing_profile_id := NULL;
  END IF;

  -- Only create new admin if neither exists
  IF existing_user_id IS NULL AND existing_profile_id IS NULL THEN
    -- Generate new UUID for admin
    admin_id := gen_random_uuid();

    -- Create admin user in auth.users
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
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin","role":"admin"}',
      false,
      now(),
      now()
    );

    -- Create admin profile in public.users
    INSERT INTO public.users (
      id,
      name,
      email,
      role,
      phone,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      'Admin',
      admin_email,
      'admin',
      '+1234567890',
      'https://ui-avatars.com/api/?name=Admin&background=random',
      now(),
      now()
    );
  END IF;
END $$;