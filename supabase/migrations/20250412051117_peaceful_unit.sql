/*
  # Create new user with proper role handling

  1. Changes
    - Create new user in auth.users
    - Set proper metadata and role
    - Handle existing user case
    
  2. Notes
    - Uses secure password hashing
    - Sets proper role in metadata
*/

DO $$ 
DECLARE
  new_user_id uuid;
  user_email text := 'test@example.com';
  user_password text := 'test123';
  existing_auth_user auth.users%ROWTYPE;
  existing_profile public.users%ROWTYPE;
BEGIN
  -- Check if user exists in either table
  SELECT * INTO existing_auth_user FROM auth.users WHERE email = user_email;
  SELECT * INTO existing_profile FROM public.users WHERE email = user_email;

  -- Only create if user doesn't exist in either table
  IF existing_auth_user IS NULL AND existing_profile IS NULL THEN
    -- Generate new UUID
    new_user_id := gen_random_uuid();

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
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Test User","role":"agent"}',
      false,
      now(),
      now()
    );

    -- Profile will be created automatically by the trigger
    RAISE NOTICE 'Created new user with email %', user_email;
  ELSE
    RAISE NOTICE 'User with email % already exists', user_email;
  END IF;
END $$;