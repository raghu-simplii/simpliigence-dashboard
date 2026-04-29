-- US Roster — full US FTE list (billable + bench + on leave + notice).
-- Superset of open_bench_resources (which only shows the available subset).
-- Additive only. Idempotent. Locked to authorized users (008 lockdown).

CREATE TABLE IF NOT EXISTS us_roster (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  project TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Bench',
  visa_category TEXT DEFAULT 'Other',
  cost_per_hour NUMERIC DEFAULT 0,
  bill_rate NUMERIC DEFAULT 0,
  start_date TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  location TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_us_roster_status ON us_roster(status);
CREATE INDEX IF NOT EXISTS idx_us_roster_project ON us_roster(project);
CREATE INDEX IF NOT EXISTS idx_us_roster_role ON us_roster(role);
CREATE INDEX IF NOT EXISTS idx_us_roster_visa ON us_roster(visa_category);

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'us_roster'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE us_roster;
  END IF;
END$$;

-- RLS — authorized users only
ALTER TABLE us_roster ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'us_roster' AND policyname = 'Allow all for anon'
  ) THEN
    DROP POLICY "Allow all for anon" ON us_roster;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'us_roster' AND policyname = 'Authorized users only'
  ) THEN
    CREATE POLICY "Authorized users only" ON us_roster
      FOR ALL
      TO authenticated
      USING (is_authorized_user())
      WITH CHECK (is_authorized_user());
  END IF;
END$$;
