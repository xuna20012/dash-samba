-- Update existing admin user to ensure correct role and metadata
DO $$ 
DECLARE
  admin_email text := 'admin@example.com';
  existing_auth_user auth.users%ROWTYPE;
  existing_profile public.users%ROWTYPE;
BEGIN
  -- Get existing admin user
  SELECT * INTO existing_auth_user FROM auth.users WHERE email = admin_email;
  SELECT * INTO existing_profile FROM public.users WHERE email = admin_email;

  -- Update auth user metadata if exists
  IF existing_auth_user IS NOT NULL THEN
    UPDATE auth.users
    SET 
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"admin"'
      ),
      raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{provider}',
        '"email"'
      ),
      role = 'authenticated'
    WHERE id = existing_auth_user.id;
  END IF;

  -- Update profile if exists
  IF existing_profile IS NOT NULL THEN
    UPDATE public.users
    SET role = 'admin'
    WHERE id = existing_profile.id;
  END IF;
END $$;

-- Update handle_new_user function to properly set role
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

  -- Update auth user metadata to ensure role is set
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(user_role)
  )
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;