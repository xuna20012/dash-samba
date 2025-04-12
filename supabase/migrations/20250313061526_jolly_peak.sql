/*
  # Fix user management and encoding functions

  1. Changes
    - Replace url_encode with PostgreSQL's built-in encoding functions
    - Clean up inconsistent data
    - Update user handling function
    - Maintain proper role management
    
  2. Notes
    - Uses encode() and convert_to() for URL-safe encoding
    - Maintains data consistency
    - Preserves role handling
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up any inconsistent data
DELETE FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = pu.id
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
  
  -- Generate avatar URL using PostgreSQL's built-in encoding functions
  avatar_url := 'https://ui-avatars.com/api/?name=' || 
                replace(
                  replace(
                    encode(convert_to(default_name, 'UTF8'), 'base64'),
                    '/', '_'
                  ),
                  '+', '-'
                ) || 
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

-- Update existing users to ensure correct role metadata
UPDATE public.users pu
SET role = COALESCE(
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = pu.id),
  'agent'
)
WHERE role IS NULL OR role = '';

-- Create missing profiles for existing auth users
INSERT INTO public.users (
  id,
  name,
  email,
  role,
  avatar_url,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'agent'),
  'https://ui-avatars.com/api/?name=' || 
  replace(
    replace(
      encode(convert_to(split_part(au.email, '@', 1), 'UTF8'), 'base64'),
      '/', '_'
    ),
    '+', '-'
  ) || 
  '&background=random',
  now(),
  now()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;