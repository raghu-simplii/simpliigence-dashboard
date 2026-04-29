-- India Roster — full FTE list (billable + bench).
-- Additive only. Idempotent. Locked to authorized users (008 lockdown).

CREATE TABLE IF NOT EXISTS india_roster (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  project TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Bench',
  cost_per_hour NUMERIC DEFAULT 0,
  bill_rate NUMERIC DEFAULT 0,
  start_date TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_india_roster_status ON india_roster(status);
CREATE INDEX IF NOT EXISTS idx_india_roster_project ON india_roster(project);
CREATE INDEX IF NOT EXISTS idx_india_roster_role ON india_roster(role);

-- Realtime publication (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'india_roster'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE india_roster;
  END IF;
END$$;

-- RLS — authorized users only (matches the policy from 008_auth_lockdown)
ALTER TABLE india_roster ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop any old anon-allow policy if it exists from a previous deploy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'india_roster' AND policyname = 'Allow all for anon'
  ) THEN
    DROP POLICY "Allow all for anon" ON india_roster;
  END IF;
  -- Create the authenticated-only policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'india_roster' AND policyname = 'Authorized users only'
  ) THEN
    CREATE POLICY "Authorized users only" ON india_roster
      FOR ALL
      TO authenticated
      USING (is_authorized_user())
      WITH CHECK (is_authorized_user());
  END IF;
END$$;
