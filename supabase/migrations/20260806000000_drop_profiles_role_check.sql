-- Drop the manual check constraint on profiles.role that blocks super_admin.
-- The role column is app_role enum (already includes super_admin via
-- 20260620000001_auth_role_overhaul.sql); this stray CHECK was added outside
-- the repo and only lists the older roles.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
