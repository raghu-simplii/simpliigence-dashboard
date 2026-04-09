-- India Staffing
CREATE TABLE IF NOT EXISTS india_staffing_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT now()
);

CREATE TABLE IF NOT EXISTS india_staffing_requisitions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  month TEXT,
  new_positions INTEGER DEFAULT 0,
  expected_closure TEXT DEFAULT '',
  close_by_date TEXT DEFAULT '',
  status_field TEXT DEFAULT 'Open',
  stage TEXT DEFAULT 'Sourcing',
  anticipation TEXT DEFAULT '',
  client_spoc TEXT DEFAULT '',
  department TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS india_staffing_statuses (
  id TEXT PRIMARY KEY,
  requisition_id TEXT NOT NULL,
  status_date TEXT,
  status_text TEXT,
  anticipation TEXT DEFAULT '',
  created_at TEXT,
  updated_by TEXT
);

-- US Staffing
CREATE TABLE IF NOT EXISTS us_staffing_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'SI',
  created_at TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT now()
);

CREATE TABLE IF NOT EXISTS us_staffing_requisitions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL,
  initiation_date TEXT DEFAULT '',
  stage TEXT DEFAULT 'New',
  closure_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  updated_by TEXT
);

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE india_staffing_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE india_staffing_requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE india_staffing_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE us_staffing_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE us_staffing_requisitions;

-- RLS: allow all for anon (same as existing tables)
ALTER TABLE india_staffing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_staffing_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_staffing_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_staffing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_staffing_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON india_staffing_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON india_staffing_requisitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON india_staffing_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON us_staffing_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON us_staffing_requisitions FOR ALL USING (true) WITH CHECK (true);
