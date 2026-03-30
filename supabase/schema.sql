-- Simpliigence Dashboard — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- ============================================================
-- 1. forecast_assignments — one row per employee × project
-- ============================================================
CREATE TABLE forecast_assignments (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  role TEXT NOT NULL,
  rate_card NUMERIC,
  is_si BOOLEAN DEFAULT false,
  is_contractor BOOLEAN DEFAULT false,
  project TEXT NOT NULL,
  weekly_hours JSONB DEFAULT '{}',
  monthly_totals JSONB DEFAULT '{}',
  manually_edited BOOLEAN DEFAULT false,
  manually_added BOOLEAN DEFAULT false,
  original_key TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fa_employee ON forecast_assignments(employee_name);
CREATE INDEX idx_fa_project ON forecast_assignments(project);

-- ============================================================
-- 2. forecast_meta — singleton for week column dates
-- ============================================================
CREATE TABLE forecast_meta (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  week_dates JSONB DEFAULT '[]',
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO forecast_meta (id) VALUES ('singleton');

-- ============================================================
-- 3. financial_settings — singleton
-- ============================================================
CREATE TABLE financial_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  exchange_rate NUMERIC DEFAULT 83.5,
  cad_to_usd_rate NUMERIC DEFAULT 0.73,
  display_currency TEXT DEFAULT 'inr',
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO financial_settings (id) VALUES ('singleton');

-- ============================================================
-- 4. sync_config — singleton for spreadsheet sync settings
-- ============================================================
CREATE TABLE sync_config (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  onedrive_url TEXT DEFAULT '',
  sheet_name TEXT DEFAULT 'Forecasting Hrs',
  auto_sync_on_load BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'never',
  last_sync_error TEXT,
  last_sync_row_count INTEGER DEFAULT 0,
  last_sync_member_count INTEGER DEFAULT 0,
  last_sync_project_count INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO sync_config (id) VALUES ('singleton');

-- ============================================================
-- 5. hiring_forecast_config — singleton for scenario settings
-- ============================================================
CREATE TABLE hiring_forecast_config (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  concierge_config JSONB DEFAULT '{}',
  scenario_settings JSONB DEFAULT '{}',
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO hiring_forecast_config (id) VALUES ('singleton');

-- ============================================================
-- 6. staffing_requests — one row per request
-- ============================================================
CREATE TABLE staffing_requests (
  id TEXT PRIMARY KEY,
  role_category TEXT NOT NULL,
  hours_per_month NUMERIC NOT NULL,
  start_month TEXT NOT NULL,
  end_month TEXT NOT NULL,
  client_name TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. pipeline_projects — one row per project
-- ============================================================
CREATE TABLE pipeline_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  owner TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  source TEXT DEFAULT 'manual',
  zoho_id TEXT,
  forecast_name TEXT,
  go_live_date TEXT,
  revenue NUMERIC,
  revenue_currency TEXT DEFAULT 'USD',
  resources JSONB DEFAULT '[]',
  phases JSONB DEFAULT '[]',
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pp_zoho ON pipeline_projects(zoho_id);

-- ============================================================
-- Enable Realtime on all tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE forecast_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE forecast_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_config;
ALTER PUBLICATION supabase_realtime ADD TABLE hiring_forecast_config;
ALTER PUBLICATION supabase_realtime ADD TABLE staffing_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_projects;

-- ============================================================
-- Row Level Security — open for all (internal team dashboard)
-- ============================================================
ALTER TABLE forecast_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON forecast_assignments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE forecast_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON forecast_meta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON financial_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON sync_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE hiring_forecast_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hiring_forecast_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE staffing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON staffing_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pipeline_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON pipeline_projects FOR ALL USING (true) WITH CHECK (true);
