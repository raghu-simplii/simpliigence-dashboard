-- Bump any India Staffing dates stored with year 2025 up to 2026.
-- This only rewrites the leading "2025" in date-shaped text fields — it does
-- NOT touch anything that isn't a 2025 date, so existing 2026 data, blank
-- strings, and free-text fields are unaffected.

-- Requisitions: created_at / updated_at / start_date / close_by_date
UPDATE india_staffing_requisitions
   SET created_at = '2026' || SUBSTRING(created_at FROM 5)
 WHERE created_at LIKE '2025-%';

UPDATE india_staffing_requisitions
   SET updated_at = '2026' || SUBSTRING(updated_at FROM 5)
 WHERE updated_at LIKE '2025-%';

UPDATE india_staffing_requisitions
   SET start_date = '2026' || SUBSTRING(start_date FROM 5)
 WHERE start_date LIKE '2025-%';

UPDATE india_staffing_requisitions
   SET close_by_date = '2026' || SUBSTRING(close_by_date FROM 5)
 WHERE close_by_date LIKE '2025-%';

-- Accounts: created_at
UPDATE india_staffing_accounts
   SET created_at = '2026' || SUBSTRING(created_at FROM 5)
 WHERE created_at LIKE '2025-%';

-- Statuses: status_date / created_at
UPDATE india_staffing_statuses
   SET status_date = '2026' || SUBSTRING(status_date FROM 5)
 WHERE status_date LIKE '2025-%';

UPDATE india_staffing_statuses
   SET created_at = '2026' || SUBSTRING(created_at FROM 5)
 WHERE created_at LIKE '2025-%';

-- History (audit log): changed_at
-- If old_value / new_value happen to record a 2025 date (e.g. a start_date
-- change was logged), bump those too so the audit trail matches reality.
UPDATE india_staffing_history
   SET changed_at = '2026' || SUBSTRING(changed_at FROM 5)
 WHERE changed_at LIKE '2025-%';

UPDATE india_staffing_history
   SET old_value = '2026' || SUBSTRING(old_value FROM 5)
 WHERE old_value LIKE '2025-%';

UPDATE india_staffing_history
   SET new_value = '2026' || SUBSTRING(new_value FROM 5)
 WHERE new_value LIKE '2025-%';
