-- India Staffing — candidate pipeline per requisition.
-- Additive only. Matches the existing india_staffing_* table conventions.

CREATE TABLE IF NOT EXISTS india_staffing_candidates (
  id TEXT PRIMARY KEY,
  requisition_id TEXT NOT NULL,
  name TEXT NOT NULL,
  experience TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Submitted',
  submit_date TEXT DEFAULT '',
  feedback TEXT DEFAULT '',
  source TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_india_candidates_req ON india_staffing_candidates(requisition_id);
CREATE INDEX IF NOT EXISTS idx_india_candidates_stage ON india_staffing_candidates(stage);

-- Enable realtime, guarded against re-running
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'india_staffing_candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE india_staffing_candidates;
  END IF;
END$$;

-- RLS + anon-all policy, matching the other india_staffing_* tables
ALTER TABLE india_staffing_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'india_staffing_candidates'
      AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON india_staffing_candidates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
