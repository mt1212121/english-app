-- ================================================================
--  SUPABASE DATABASE SCHEMA
--  Run this in your Supabase SQL Editor to set up the tables.
--  https://app.supabase.com → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
--  TABLE: test_results
--  Stores every test a user completes.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  estimated_level TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_completed_at ON public.test_results(completed_at DESC);

-- ----------------------------------------------------------------
--  TABLE: user_profiles
--  Extended user metadata beyond what auth.users provides.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  target_level TEXT,
  study_goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'displayName', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
--  ROW LEVEL SECURITY (RLS)
--  Users can only see/edit their own data.
-- ----------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- test_results policies
CREATE POLICY "Users can view their own test results"
  ON public.test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results"
  ON public.test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------
--  ADMIN POLICIES (optional - for future admin dashboard)
--  Admins can view all data. To enable, add admin role to user:
--  UPDATE auth.users SET raw_app_meta_data =
--    jsonb_set(raw_app_meta_data, '{role}', '"admin"')
--  WHERE email = 'admin@example.com';
-- ----------------------------------------------------------------

CREATE POLICY "Admins can view all test results"
  ON public.test_results FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() = id
  );

-- ================================================================
--  DONE! Your Supabase database is ready.
--  Next steps:
--  1. Copy VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
--     Project Settings → API
--  2. Add them to Netlify Environment Variables
--  3. Add them to your local .env file for development
-- ================================================================
