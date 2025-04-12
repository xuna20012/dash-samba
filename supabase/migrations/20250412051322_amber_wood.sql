-- Insert test users
DO $$ 
DECLARE
  admin_id uuid;
  agent1_id uuid;
  agent2_id uuid;
BEGIN
  -- Create admin user
  admin_id := gen_random_uuid();
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
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin","role":"admin"}',
    false,
    now(),
    now()
  ) ON CONFLICT (email) DO NOTHING;

  -- Create first agent user
  agent1_id := gen_random_uuid();
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
    agent1_id,
    'authenticated',
    'authenticated',
    'agent1@example.com',
    crypt('agent123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Agent 1","role":"agent"}',
    false,
    now(),
    now()
  ) ON CONFLICT (email) DO NOTHING;

  -- Create second agent user
  agent2_id := gen_random_uuid();
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
    agent2_id,
    'authenticated',
    'authenticated',
    'agent2@example.com',
    crypt('agent123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Agent 2","role":"agent"}',
    false,
    now(),
    now()
  ) ON CONFLICT (email) DO NOTHING;

  -- Insert corresponding profiles in public.users
  -- The trigger should handle this automatically, but we'll do it explicitly to be sure
  INSERT INTO public.users (id, name, email, role, created_at, updated_at)
  VALUES 
    (admin_id, 'Admin', 'admin@example.com', 'admin', now(), now()),
    (agent1_id, 'Agent 1', 'agent1@example.com', 'agent', now(), now()),
    (agent2_id, 'Agent 2', 'agent2@example.com', 'agent', now(), now())
  ON CONFLICT (id) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now();

  -- Log the created users
  RAISE NOTICE 'Created users with the following credentials:';
  RAISE NOTICE 'Admin - Email: admin@example.com, Password: admin123';
  RAISE NOTICE 'Agent 1 - Email: agent1@example.com, Password: agent123';
  RAISE NOTICE 'Agent 2 - Email: agent2@example.com, Password: agent123';
END $$;