-- India Staffing v2 — additive only. No existing columns or data are dropped.
-- Adds: start_date, probability, ai_probability, and a history/audit log table.
-- The legacy `location` column is INTENTIONALLY retained so no historical data is lost.

-- 1) New fields on india_staffing_requisitions
ALTER TABLE india_staffing_requisitions
  ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';

ALTER TABLE india_staffing_requisitions
  ADD COLUMN IF NOT EXISTS probability NUMERIC DEFAULT 0;

ALTER TABLE india_staffing_requisitions
  ADD COLUMN IF NOT EXISTS ai_probability NUMERIC DEFAULT 0;

-- Back-fill start_date from created_at for any existing rows that don't have one.
UPDATE india_staffing_requisitions
SET start_date = COALESCE(NULLIF(start_date, ''), COALESCE(created_at, ''))
WHERE COALESCE(start_date, '') = '';

-- 2) History / audit log — one row per field change
CREATE TABLE IF NOT EXISTS india_staffing_history (
  id TEXT PRIMARY KEY,
  requisition_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT DEFAULT '',
  new_value TEXT DEFAULT '',
  changed_at TEXT NOT NULL,
  changed_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_india_history_req ON india_staffing_history(requisition_id);
CREATE INDEX IF NOT EXISTS idx_india_history_changed_at ON india_staffing_history(changed_at);

-- Enable realtime on the new table (guard against re-running on already-added tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'india_staffing_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE india_staffing_history;
  END IF;
END$$;

-- RLS matching the existing india_staffing_* policy style
ALTER TABLE india_staffing_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'india_staffing_history' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON india_staffing_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
