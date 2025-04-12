/*
  # Fix user profile creation with proper URL encoding

  1. Changes
    - Use proper PostgreSQL encoding functions
    - Fix avatar URL generation
    - Maintain user profile synchronization
    
  2. Notes
    - Uses convert_to and encode for URL-safe strings
    - Maintains data consistency
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_name text;
  avatar_url text;
BEGIN
  -- Generate default name from email
  default_name := split_part(new.email, '@', 1);
  
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
    COALESCE(new.raw_user_meta_data->>'role', 'agent'),
    avatar_url,
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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