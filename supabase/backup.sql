-- Snapshot every dashboard table into a single JSON document.
-- Paste this into Supabase → SQL Editor → Run.
-- The Editor will show one row with a 'data' column — click "Download CSV"
-- (or copy the JSON) and save it as a backup. Date-stamp the filename.
--
-- Restore: each top-level key is a table name, and the value is an array
-- of rows. To restore one table, use the corresponding INSERT INTO ... VALUES
-- (or use a `\copy` from a CSV reshape). For full restore see the recovery
-- procedure in supabase/backup-RESTORE.md (still TODO — ask Raghu).

SELECT json_build_object(
  'forecast_assignments',         (SELECT COALESCE(json_agg(t), '[]'::json) FROM forecast_assignments t),
  'forecast_meta',                (SELECT COALESCE(json_agg(t), '[]'::json) FROM forecast_meta t),
  'financial_settings',           (SELECT COALESCE(json_agg(t), '[]'::json) FROM financial_settings t),
  'sync_config',                  (SELECT COALESCE(json_agg(t), '[]'::json) FROM sync_config t),
  'hiring_forecast_config',       (SELECT COALESCE(json_agg(t), '[]'::json) FROM hiring_forecast_config t),
  'staffing_requests',            (SELECT COALESCE(json_agg(t), '[]'::json) FROM staffing_requests t),
  'pipeline_projects',            (SELECT COALESCE(json_agg(t), '[]'::json) FROM pipeline_projects t),
  'india_staffing_accounts',      (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_staffing_accounts t),
  'india_staffing_requisitions',  (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_staffing_requisitions t),
  'india_staffing_statuses',      (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_staffing_statuses t),
  'india_staffing_history',       (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_staffing_history t),
  'india_staffing_candidates',    (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_staffing_candidates t),
  'us_staffing_accounts',         (SELECT COALESCE(json_agg(t), '[]'::json) FROM us_staffing_accounts t),
  'us_staffing_requisitions',     (SELECT COALESCE(json_agg(t), '[]'::json) FROM us_staffing_requisitions t),
  'open_bench_resources',         (SELECT COALESCE(json_agg(t), '[]'::json) FROM open_bench_resources t),
  'open_bench_updates',           (SELECT COALESCE(json_agg(t), '[]'::json) FROM open_bench_updates t),
  -- india_roster line gets added below ONLY if migration 009 has been run.
  -- If the table doesn't exist yet, this snapshot still completes for the other 16.
  'india_roster',                 CASE
                                    WHEN to_regclass('public.india_roster') IS NOT NULL
                                    THEN (SELECT COALESCE(json_agg(t), '[]'::json) FROM india_roster t)
                                    ELSE NULL
                                  END,
  'authorized_users',             (SELECT COALESCE(json_agg(t), '[]'::json) FROM authorized_users t),
  '_meta',                        json_build_object(
                                    'taken_at', now(),
                                    'taken_by', current_user,
                                    'note',     'Full snapshot — save as backup-<timestamp>.json'
                                  )
) AS data;

-- Quick row-count audit (run separately to verify the snapshot above):
-- SELECT 'forecast_assignments' AS table_name, COUNT(*) FROM forecast_assignments
-- UNION ALL SELECT 'india_staffing_requisitions', COUNT(*) FROM india_staffing_requisitions
-- UNION ALL SELECT 'india_staffing_statuses', COUNT(*) FROM india_staffing_statuses
-- UNION ALL SELECT 'pipeline_projects', COUNT(*) FROM pipeline_projects
-- UNION ALL SELECT 'us_staffing_requisitions', COUNT(*) FROM us_staffing_requisitions
-- ORDER BY 1;
