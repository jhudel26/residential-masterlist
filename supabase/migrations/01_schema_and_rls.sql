-- ==============================================================================
-- St. Joseph Village 6 Phase 4 — Homeowners Masterlist System
-- Supabase Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Enum Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ownership_type') THEN
    CREATE TYPE ownership_type AS ENUM ('Owner', 'Renter');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status') THEN
    CREATE TYPE record_status AS ENUM ('Active', 'Inactive');
  END IF;
END $$;

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role user_role NOT NULL DEFAULT 'user',
  permissions JSONB NOT NULL DEFAULT '{
    "can_create_homeowner": false,
    "can_edit_homeowner": false,
    "can_delete_homeowner": false,
    "can_view_homeowner": true,
    "can_export_excel": false,
    "can_manage_users": false,
    "can_grant_permissions": false,
    "can_view_dashboard_stats": true
  }'::jsonb,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Homeowners Table
CREATE TABLE IF NOT EXISTS public.homeowners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  ownership_type ownership_type NOT NULL DEFAULT 'Owner',
  gender gender_type DEFAULT 'Male',
  birthdate DATE NOT NULL,
  age INTEGER,
  address TEXT NOT NULL,
  household_count INTEGER NOT NULL DEFAULT 1,
  contact_mobile TEXT,
  contact_email TEXT,
  pet_count INTEGER NOT NULL DEFAULT 0,
  ga_proxy_name TEXT,
  ga_proxy_relationship TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Household Members Table
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homeowner_id UUID NOT NULL REFERENCES public.homeowners(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high performance searches
CREATE INDEX IF NOT EXISTS idx_homeowners_full_name ON public.homeowners(full_name);
CREATE INDEX IF NOT EXISTS idx_homeowners_address ON public.homeowners(address);
CREATE INDEX IF NOT EXISTS idx_homeowners_status ON public.homeowners(status);
CREATE INDEX IF NOT EXISTS idx_homeowners_ownership_type ON public.homeowners(ownership_type);
CREATE INDEX IF NOT EXISTS idx_household_members_homeowner_id ON public.household_members(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 7. Functions & Triggers

-- Compute age from birthdate
CREATE OR REPLACE FUNCTION public.calculate_homeowner_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(CURRENT_DATE, NEW.birthdate));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_homeowner_age ON public.homeowners;
CREATE TRIGGER trigger_calculate_homeowner_age
BEFORE INSERT OR UPDATE ON public.homeowners
FOR EACH ROW
EXECUTE FUNCTION public.calculate_homeowner_age();

-- Auto-create profile upon auth.user creation
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
    assigned_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'admin'::public.user_role);
    IF assigned_role = 'super_admin' THEN
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
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, permissions, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'HOA Officer'),
    NEW.email,
    assigned_role,
    assigned_perms,
    'Active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(perm_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  has_perm BOOLEAN;
BEGIN
  SELECT role, (permissions->>perm_name)::BOOLEAN
  INTO user_role_val, has_perm
  FROM public.profiles
  WHERE id = auth.uid() AND status = 'Active';

  IF user_role_val = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- Profiles:
CREATE POLICY "Users can view all active profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super Admins and managers can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR
  public.check_user_permission('can_manage_users')
);

CREATE POLICY "Super Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR
  public.check_user_permission('can_manage_users')
);

CREATE POLICY "Super Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
  public.check_user_permission('can_manage_users')
);

-- Homeowners:
CREATE POLICY "View homeowners policy"
ON public.homeowners FOR SELECT
TO authenticated
USING (
  public.check_user_permission('can_view_homeowner')
);

CREATE POLICY "Create homeowners policy"
ON public.homeowners FOR INSERT
TO authenticated
WITH CHECK (
  public.check_user_permission('can_create_homeowner')
);

CREATE POLICY "Update homeowners policy"
ON public.homeowners FOR UPDATE
TO authenticated
USING (
  public.check_user_permission('can_edit_homeowner')
);

CREATE POLICY "Delete homeowners policy"
ON public.homeowners FOR DELETE
TO authenticated
USING (
  public.check_user_permission('can_delete_homeowner')
);

-- Household Members:
CREATE POLICY "View household members policy"
ON public.household_members FOR SELECT
TO authenticated
USING (
  public.check_user_permission('can_view_homeowner')
);

CREATE POLICY "Create household members policy"
ON public.household_members FOR INSERT
TO authenticated
WITH CHECK (
  public.check_user_permission('can_create_homeowner') OR
  public.check_user_permission('can_edit_homeowner')
);

CREATE POLICY "Update household members policy"
ON public.household_members FOR UPDATE
TO authenticated
USING (
  public.check_user_permission('can_edit_homeowner')
);

CREATE POLICY "Delete household members policy"
ON public.household_members FOR DELETE
TO authenticated
USING (
  public.check_user_permission('can_edit_homeowner') OR
  public.check_user_permission('can_delete_homeowner')
);

-- Activity Logs:
CREATE POLICY "View activity logs policy"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  public.check_user_permission('can_view_dashboard_stats')
);

CREATE POLICY "Insert activity logs policy"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);
