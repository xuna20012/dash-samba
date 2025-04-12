/*
  # Insert test users into the database

  1. Changes
    - Create test users in auth.users table
    - Let the trigger handle profile creation
    - Handle conflicts properly
    
  2. Notes
    - Uses proper error handling
    - Maintains data consistency
*/

DO $$ 
DECLARE
  admin_id uuid;
  agent1_id uuid;
  agent2_id uuid;
BEGIN
  -- Create admin user
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
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Admin","role":"admin"}'::jsonb,
    false,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@example.com'
  )
  RETURNING id INTO admin_id;

  -- Create first agent user
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
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'agent1@example.com',
    crypt('agent123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Agent 1","role":"agent"}'::jsonb,
    false,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'agent1@example.com'
  )
  RETURNING id INTO agent1_id;

  -- Create second agent user
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
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'agent2@example.com',
    crypt('agent123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Agent 2","role":"agent"}'::jsonb,
    false,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'agent2@example.com'
  )
  RETURNING id INTO agent2_id;

  -- Log the created users
  RAISE NOTICE 'Created users with the following credentials:';
  RAISE NOTICE 'Admin - Email: admin@example.com, Password: admin123';
  RAISE NOTICE 'Agent 1 - Email: agent1@example.com, Password: agent123';
  RAISE NOTICE 'Agent 2 - Email: agent2@example.com, Password: agent123';
END $$;