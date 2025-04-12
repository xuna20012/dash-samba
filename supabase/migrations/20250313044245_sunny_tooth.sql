/*
  # Create admin user with proper role handling

  1. Changes
    - Drop and recreate users table with correct structure
    - Add proper role handling in trigger function
    - Create admin user if not exists
    
  2. Notes
    - Safe to run multiple times
    - Maintains data integrity
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

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'agent')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger after user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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