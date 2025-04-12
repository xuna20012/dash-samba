/*
  # Fix user profile creation

  1. Changes
    - Update handle_new_user trigger function to properly create user profiles
    - Add avatar_url generation
    - Ensure proper role handling
    
  2. Notes
    - Preserves existing data
    - Handles edge cases
*/

-- Drop and recreate the handle_new_user function with proper profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_name text;
  avatar_url text;
BEGIN
  -- Generate default name from email
  default_name := split_part(new.email, '@', 1);
  
  -- Generate avatar URL
  avatar_url := 'https://ui-avatars.com/api/?name=' || 
                encode(convert_to(default_name, 'UTF8'), 'base64') || 
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create missing profiles for existing auth users
INSERT INTO public.users (id, name, email, role, avatar_url)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'agent'),
  'https://ui-avatars.com/api/?name=' || encode(convert_to(split_part(au.email, '@', 1), 'UTF8'), 'base64') || '&background=random'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;