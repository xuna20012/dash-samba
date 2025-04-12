/*
  # Query admin user information

  1. Purpose
    - Check if admin user exists in both auth.users and public.users tables
    - Retrieve admin user details for verification
    
  2. Notes
    - Safe to run multiple times
    - Read-only operation
*/

-- Query admin user information from both tables
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at as auth_created_at,
  pu.name,
  pu.role,
  pu.avatar_url,
  pu.created_at as profile_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'admin@example.com'
  OR pu.email = 'admin@example.com';