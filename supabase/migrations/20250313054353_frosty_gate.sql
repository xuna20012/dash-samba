/*
  # Fix authentication and storage setup

  1. Changes
    - Drop and recreate storage policies with proper user folder structure
    - Create storage bucket if not exists
    - Handle existing admin user gracefully
    
  2. Notes
    - Uses proper error handling
    - Maintains data integrity
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Create proper storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Allow users to upload to their own folder
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create or update admin user
DO $$ 
DECLARE
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';
  existing_auth_user auth.users%ROWTYPE;
  existing_profile public.users%ROWTYPE;
  new_admin_id uuid;
BEGIN
  -- Check for existing admin user
  SELECT * INTO existing_auth_user FROM auth.users WHERE email = admin_email;
  SELECT * INTO existing_profile FROM public.users WHERE email = admin_email;

  -- If no admin exists, create one
  IF existing_auth_user IS NULL THEN
    -- Generate new UUID
    new_admin_id := gen_random_uuid();

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
      new_admin_id,
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

    -- Create profile only if auth user was created
    IF existing_profile IS NULL THEN
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
        new_admin_id,
        'Admin',
        admin_email,
        'admin',
        '+1234567890',
        'https://ui-avatars.com/api/?name=Admin&background=random',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;