/*
  # Create admin user in auth and users tables

  1. Changes
    - Create admin user in auth.users table
    - Create admin profile in public.users table
    - Handle existing admin user case

  2. Notes
    - Checks for existing admin before creation
    - Uses explicit UUID generation
    - Sets proper metadata and role
*/

DO $$ 
DECLARE
  admin_id uuid;
  admin_email text := 'admin@example.com';
  auth_user_exists boolean;
BEGIN
  -- First check if admin exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) INTO auth_user_exists;

  IF NOT auth_user_exists THEN
    -- Generate new UUID for admin
    admin_id := gen_random_uuid();

    -- Create admin user in auth.users with explicit id
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
    INSERT INTO public.users (
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