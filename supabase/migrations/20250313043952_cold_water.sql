/*
  # Create users table and storage policies

  1. Changes
    - Drop and recreate users table
    - Add RLS policies
    - Create storage bucket and policies
    - Create admin user
    
  2. Notes
    - Handles existing storage policies gracefully
    - Maintains data integrity
    - Safe to run multiple times
*/

-- Drop existing table and recreate with correct structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Drop existing storage policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- Create admin user if not exists
DO $$ 
DECLARE
  admin_id uuid;
  admin_email text := 'admin@example.com';
  auth_user_exists boolean;
BEGIN
  -- Check if admin exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) INTO auth_user_exists;

  IF NOT auth_user_exists THEN
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
      updated_at,
      phone,
      phone_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      is_sso_user,
      deleted_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',  -- instance_id
      admin_id,                                 -- id
      'authenticated',                          -- aud
      'authenticated',                          -- role
      admin_email,                             -- email
      crypt('admin123', gen_salt('bf')),       -- encrypted_password
      now(),                                   -- email_confirmed_at
      now(),                                   -- last_sign_in_at
      '{"provider":"email","providers":["email"]}',  -- raw_app_meta_data
      '{"name":"Admin","role":"admin"}',       -- raw_user_meta_data
      false,                                   -- is_super_admin
      now(),                                   -- created_at
      now(),                                   -- updated_at
      null,                                    -- phone
      null,                                    -- phone_confirmed_at
      encode(gen_random_bytes(32), 'base64'),  -- confirmation_token
      encode(gen_random_bytes(32), 'base64'),  -- recovery_token
      null,                                    -- email_change_token_new
      null,                                    -- email_change
      null,                                    -- email_change_token_current
      0,                                       -- email_change_confirm_status
      null,                                    -- banned_until
      encode(gen_random_bytes(32), 'base64'),  -- reauthentication_token
      false,                                   -- is_sso_user
      null                                     -- deleted_at
    );

    -- Create admin profile in users table
    INSERT INTO users (
      id,
      name,
      email,
      role,
      phone,
      avatar_url
    ) VALUES (
      admin_id,
      'Admin',
      admin_email,
      'admin',
      '+1234567890',
      'https://ui-avatars.com/api/?name=Admin&background=random'
    );
  END IF;
END $$;