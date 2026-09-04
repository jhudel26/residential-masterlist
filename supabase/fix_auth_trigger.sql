-- ==============================================================================
-- Fix: Supabase Auth "Database error creating new user"
-- ==============================================================================
-- Run this in your Supabase SQL Editor.
-- This replaces the trigger function with an explicit search_path = public
-- and safe defaults so creating users in the Dashboard never fails.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  profile_count INTEGER;
  assigned_role public.user_role;
  assigned_perms JSONB;
BEGIN
  -- Check if this is the first user
  SELECT count(*) INTO profile_count FROM public.profiles;

  IF profile_count = 0 THEN
    assigned_role := 'super_admin'::public.user_role;
    assigned_perms := '{
      "can_create_homeowner": true,
      "can_edit_homeowner": true,
      "can_delete_homeowner": true,
      "can_view_homeowner": true,
      "can_export_excel": true,
      "can_manage_users": true,
      "can_grant_permissions": true,
      "can_view_dashboard_stats": true
    }'::jsonb;
  ELSE
    assigned_role := 'admin'::public.user_role;
    assigned_perms := '{
      "can_create_homeowner": true,
      "can_edit_homeowner": true,
      "can_delete_homeowner": false,
      "can_view_homeowner": true,
      "can_export_excel": true,
      "can_manage_users": false,
      "can_grant_permissions": false,
      "can_view_dashboard_stats": true
    }'::jsonb;
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    permissions,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'HOA Officer'),
    NEW.email,
    assigned_role,
    assigned_perms,
    'Active'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth.users creation even if profile insertion encounters an issue
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure trigger is properly bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
