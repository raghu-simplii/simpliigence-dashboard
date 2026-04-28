-- Open Bench — resource roster + per-resource recruiter updates log.
-- Additive only. Mirrors the india_staffing_* table conventions (TEXT id,
-- realtime, RLS-with-anon policy).

-- 1) Bench resources
CREATE TABLE IF NOT EXISTS open_bench_resources (
  id TEXT PRIMARY KEY,
  resource_name TEXT NOT NULL,
  years_of_experience INTEGER DEFAULT 0,
  visa_category TEXT DEFAULT 'Other',
  primary_skill TEXT DEFAULT '',
  roles TEXT DEFAULT '',
  job_priority TEXT DEFAULT 'Primary',
  target_rate NUMERIC DEFAULT 0,
  location TEXT DEFAULT '',
  key_opportunities TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

-- 2) Recruiter updates log — one row per submission / interview / feedback / note
CREATE TABLE IF NOT EXISTS open_bench_updates (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  update_date TEXT NOT NULL,
  update_text TEXT NOT NULL,
  type TEXT DEFAULT 'Note',
  client_or_role TEXT DEFAULT '',
  recruiter TEXT DEFAULT '',
  created_at TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bench_updates_res ON open_bench_updates(resource_id);
CREATE INDEX IF NOT EXISTS idx_bench_updates_date ON open_bench_updates(update_date);
CREATE INDEX IF NOT EXISTS idx_bench_resources_avail ON open_bench_resources(available);

-- Realtime publication, guarded against re-running
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'open_bench_resources'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE open_bench_resources;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'open_bench_updates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE open_bench_updates;
  END IF;
END$$;

-- RLS + anon-all policy, matching every other india_staffing_* / us_staffing_* table
ALTER TABLE open_bench_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_bench_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'open_bench_resources' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON open_bench_resources FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'open_bench_updates' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON open_bench_updates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
