-- Lock down every dashboard table to authenticated users only.
-- Until now policies were "Allow all for anon" — the anon key was effectively
-- the password. This migration:
--   1. Creates an `authorized_users` allowlist table (admin-managed) so you
--      can explicitly invite specific emails.
--   2. Replaces every "Allow all for anon" policy with one that requires the
--      caller to (a) be authenticated AND (b) have their email in the allowlist.
--
-- ⚠️  RUN THIS ONLY AFTER:
--   - You've signed in successfully via the new auth UI at least once
--   - You've added your own email to authorized_users (instructions at the
--     bottom of this file)
--   - All teammates who need access have signed in once (so Supabase has
--     a user row for them) and been added to the allowlist
--
-- Otherwise the dashboard will show empty data for everyone.

-- ────────────────────────────────────────────────────────────────────
-- 1. Allowlist table
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorized_users (
  email TEXT PRIMARY KEY,
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Helper: returns true iff the current Supabase auth.uid() corresponds to a
-- user whose email is in authorized_users (case-insensitive).
CREATE OR REPLACE FUNCTION is_authorized_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM authorized_users au
    JOIN auth.users u ON LOWER(u.email) = LOWER(au.email)
    WHERE u.id = auth.uid()
  );
$$;

-- The function reads from auth.users which lives in the auth schema, so we
-- need to grant execute to authenticated.
GRANT EXECUTE ON FUNCTION is_authorized_user() TO authenticated;
GRANT SELECT ON authorized_users TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 2. Helper to swap the anon policy for an authenticated-allowlist policy
--    on a single table. Idempotent — safe to re-run.
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'forecast_assignments',
    'forecast_meta',
    'financial_settings',
    'sync_config',
    'hiring_forecast_config',
    'staffing_requests',
    'pipeline_projects',
    'india_staffing_accounts',
    'india_staffing_requisitions',
    'india_staffing_statuses',
    'india_staffing_history',
    'india_staffing_candidates',
    'us_staffing_accounts',
    'us_staffing_requisitions',
    'open_bench_resources',
    'open_bench_updates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip tables that don't exist yet (older deploys may be missing some)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      RAISE NOTICE 'Skipping % — table does not exist yet', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Drop the old "anon allowed" policy
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', t);

    -- Create the new policy: authenticated AND on the allowlist
    EXECUTE format(
      'CREATE POLICY "Authorized users only" ON %I FOR ALL TO authenticated USING (is_authorized_user()) WITH CHECK (is_authorized_user())',
      t
    );
  END LOOP;
END$$;

-- ────────────────────────────────────────────────────────────────────
-- 3. Allowlist table policies — admins manage via SQL Editor; the API
--    surface only lets authorized users SELECT (so the app can confirm
--    membership) but not INSERT/UPDATE/DELETE.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'authorized_users' AND policyname = 'Authorized users can read') THEN
    CREATE POLICY "Authorized users can read"
      ON authorized_users
      FOR SELECT
      TO authenticated
      USING (is_authorized_user());
  END IF;
END$$;

-- ────────────────────────────────────────────────────────────────────
-- 4. Bootstrap your email — REPLACE the address below before running.
-- ────────────────────────────────────────────────────────────────────
-- Add yourself first so you don't lock yourself out.  Repeat for each
-- teammate.  Adding to authorized_users is the only way to grant access.
--
-- INSERT INTO authorized_users (email, added_by, notes) VALUES
--   ('raghu@simpliigence.com', 'bootstrap', 'admin'),
--   ('teammate@simpliigence.com', 'raghu@simpliigence.com', 'finance lead');
--
-- To revoke access:
--   DELETE FROM authorized_users WHERE email = 'former-teammate@simpliigence.com';
--
-- To list current authorized users:
--   SELECT email, added_at, notes FROM authorized_users ORDER BY added_at;
