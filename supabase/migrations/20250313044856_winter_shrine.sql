/*
  # Check admin user status

  1. Purpose
    - Check if admin user exists in both auth.users and public.users tables
    - Verify user data consistency
    - Return admin user information for verification
    
  2. Notes
    - Safe query that doesn't modify any data
    - Used for debugging and verification purposes
*/

-- Check admin user status in both tables
WITH auth_user AS (
  SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at as auth_created_at
  FROM auth.users 
  WHERE email = 'admin@example.com'
),
profile AS (
  SELECT 
    id,
    name,
    email,
    role,
    avatar_url,
    created_at as profile_created_at
  FROM public.users 
  WHERE email = 'admin@example.com'
)
SELECT 
  COALESCE(au.id, pu.id) as user_id,
  COALESCE(au.email, pu.email) as email,
  au.raw_user_meta_data,
  au.auth_created_at,
  pu.name,
  pu.role,
  pu.avatar_url,
  pu.profile_created_at
FROM auth_user au
FULL OUTER JOIN profile pu ON au.id = pu.id;