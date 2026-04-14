-- ═══════════════════════════════════════════════════════════════════════════════
-- RioData — Full Platform SQL Migrations
-- Run this entire file in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS + ON CONFLICT)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  company_name        TEXT,
  role                TEXT        CHECK (role IN ('investor','business_owner','economic_developer','government','workforce')),
  sector              TEXT,
  city                TEXT,
  bio                 TEXT,
  avatar_url          TEXT,
  title               TEXT,
  membership_tier     TEXT        DEFAULT 'explorer'
                                  CHECK (membership_tier IN ('explorer','operator','investor','strategic')),
  onboarding_complete BOOLEAN     DEFAULT FALSE,
  email_digest        BOOLEAN     DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add any columns that may be missing on existing deployments
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'explorer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_digest   BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SAVED_COMPANIES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_companies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. WATCHLIST TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watchlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type   TEXT        NOT NULL,
  item_id     TEXT        NOT NULL,
  item_title  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);

-- Legacy column name support (some code uses item_name instead of item_title)
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS item_title TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. USER_ACTIVITY TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_activity (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  detail      TEXT,
  item_id     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity   ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- saved_companies
DROP POLICY IF EXISTS "saved_companies_all_own" ON saved_companies;

CREATE POLICY "saved_companies_all_own"
  ON saved_companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- watchlist
DROP POLICY IF EXISTS "watchlist_all_own" ON watchlist;

CREATE POLICY "watchlist_all_own"
  ON watchlist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_activity
DROP POLICY IF EXISTS "user_activity_select_own" ON user_activity;
DROP POLICY IF EXISTS "user_activity_insert_own" ON user_activity;

CREATE POLICY "user_activity_select_own"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_activity_insert_own"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_saved_companies_user
  ON saved_companies(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_companies_company
  ON saved_companies(company_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user
  ON watchlist(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_date
  ON user_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET: avatars
-- ─────────────────────────────────────────────────────────────────────────────

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Storage policies
DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read"          ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"         ON storage.objects;

-- Public read access (avatars are shown to everyone)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload only to their own folder (path starts with their UID)
CREATE POLICY "avatars_authenticated_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own files
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, membership_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'explorer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SEED ADMIN PROFILE
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO profiles (id, full_name, email, role, membership_tier, onboarding_complete)
SELECT
  id,
  'Moises Segovia',
  'moisessegovia@yahoo.com',
  'economic_developer',
  'strategic',
  TRUE
FROM auth.users
WHERE email = 'moisessegovia@yahoo.com'
ON CONFLICT (id) DO UPDATE SET
  membership_tier     = 'strategic',
  role                = 'economic_developer',
  onboarding_complete = TRUE,
  full_name           = COALESCE(NULLIF(profiles.full_name, ''), 'Moises Segovia'),
  updated_at          = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. UPDATED_AT TRIGGER (optional — keeps updated_at current on profiles)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. COMPANIES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name   TEXT        NOT NULL,
  sector       TEXT,
  city         TEXT,
  state        TEXT,
  country      TEXT        DEFAULT 'US',
  description  TEXT,
  website      TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  latitude     NUMERIC,
  longitude    NUMERIC,
  status       TEXT        DEFAULT 'active',
  employees    TEXT,
  founded_year INT,
  ready_to_work BOOLEAN    DEFAULT FALSE,
  cert_sam     BOOLEAN     DEFAULT FALSE,
  cert_hubzone BOOLEAN     DEFAULT FALSE,
  cert_immex   BOOLEAN     DEFAULT FALSE,
  services     TEXT,
  owner_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_public_read"  ON companies;
DROP POLICY IF EXISTS "companies_owner_insert" ON companies;
DROP POLICY IF EXISTS "companies_owner_update" ON companies;

CREATE POLICY "companies_public_read"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "companies_owner_insert"
  ON companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "companies_owner_update"
  ON companies FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_companies_sector  ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_city    ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_status  ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_owner   ON companies(owner_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PROJECTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  sector      TEXT,
  city        TEXT,
  state       TEXT,
  budget      TEXT,
  value_usd   NUMERIC,
  status      TEXT        DEFAULT 'active',
  location    TEXT,
  tags        TEXT[]      DEFAULT '{}',
  company_id  UUID        REFERENCES companies(id) ON DELETE SET NULL,
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_public_read"  ON projects;
DROP POLICY IF EXISTS "projects_owner_insert" ON projects;
DROP POLICY IF EXISTS "projects_owner_update" ON projects;

CREATE POLICY "projects_public_read"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "projects_owner_insert"
  ON projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "projects_owner_update"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(sector);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner  ON projects(owner_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE — verify with:
--   SELECT COUNT(*) FROM profiles;
--   SELECT COUNT(*) FROM saved_companies;
--   SELECT COUNT(*) FROM watchlist;
--   SELECT COUNT(*) FROM user_activity;
--   SELECT COUNT(*) FROM companies;
--   SELECT COUNT(*) FROM projects;
--   SELECT * FROM storage.buckets WHERE id = 'avatars';
-- ─────────────────────────────────────────────────────────────────────────────
