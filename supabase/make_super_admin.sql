-- ==============================================================================
-- St. Joseph Village 6 Phase 4 — Promote User to Super Admin (HOA President)
-- ==============================================================================
-- Instructions:
-- 1. Create your user account in Supabase Dashboard (Authentication > Users > Add user).
-- 2. In Supabase SQL Editor, replace 'your_email@example.com' below with your actual email.
-- 3. Click 'Run'.

DO $$
DECLARE
  target_email TEXT := 'your_email@example.com'; -- <<-- REPLACE WITH YOUR NEW USER EMAIL
  president_name TEXT := 'HOA President';        -- <<-- OPTIONAL: CHANGE TO YOUR FULL NAME
  target_user_id UUID;
BEGIN
  -- 1. Find user in auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User % was not found in auth.users. Please create the user under Authentication > Users first.', target_email;
  END IF;

  -- 2. Upsert into public.profiles with full Super Admin privileges
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    status,
    permissions
  )
  VALUES (
    target_user_id,
    president_name,
    target_email,
    'super_admin',
    'Active',
    '{
      "can_create_homeowner": true,
      "can_edit_homeowner": true,
      "can_delete_homeowner": true,
      "can_view_homeowner": true,
      "can_export_excel": true,
      "can_manage_users": true,
      "can_grant_permissions": true,
      "can_view_dashboard_stats": true
    }'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'super_admin',
    status = 'Active',
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    permissions = '{
      "can_create_homeowner": true,
      "can_edit_homeowner": true,
      "can_delete_homeowner": true,
      "can_view_homeowner": true,
      "can_export_excel": true,
      "can_manage_users": true,
      "can_grant_permissions": true,
      "can_view_dashboard_stats": true
    }'::jsonb,
    updated_at = now();

  RAISE NOTICE 'SUCCESS: % is now the Super Admin with full permissions!', target_email;
END $$;
