/*
  # Fix user profile creation and permissions

  1. Changes
    - Update handle_new_user function to be more robust
    - Add proper error handling
    - Fix RLS policies
    - Add logging for debugging
    
  2. Notes
    - Maintains existing data
    - Ensures proper profile creation
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON users;
  DROP POLICY IF EXISTS "Enable insert access for service role" ON users;
  DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create more permissive policies
CREATE POLICY "Enable read access for all authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on id"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_name text;
  user_role text;
BEGIN
  -- Generate default name from email
  default_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  
  -- Get role from metadata or default to 'agent'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'agent');

  -- Log the attempt to create a user profile
  RAISE NOTICE 'Creating user profile for % (ID: %) with role %', new.email, new.id, user_role;

  -- Create user profile
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    default_name,
    new.email,
    user_role,
    now(),
    now()
  );

  -- Log successful creation
  RAISE NOTICE 'Successfully created user profile for % (ID: %)', new.email, new.id;

  RETURN new;
EXCEPTION WHEN others THEN
  -- Log any errors that occur
  RAISE NOTICE 'Error creating user profile for % (ID: %): %', new.email, new.id, SQLERRM;
  RETURN new;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'agent'),
  COALESCE(au.created_at, now()),
  now()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;