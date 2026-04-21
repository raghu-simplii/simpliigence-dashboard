-- Rename legacy project strings on forecast_assignments to their short
-- forecastName alias, so allocations join to their Current Projects card
-- and loaded cost rolls up correctly.
--
-- Idempotent: running twice is a no-op. Case-insensitive match on the
-- stored project string. Only the 4 known aliases that the Team Roster
-- dropdown now writes are renamed here — any other legacy name is left
-- alone (use the Team Roster UI to fix those individually).

UPDATE forecast_assignments
   SET project = 'QUData',
       updated_at = now()
 WHERE LOWER(TRIM(project)) = 'qudata centres';

UPDATE forecast_assignments
   SET project = 'Matheson',
       updated_at = now()
 WHERE LOWER(TRIM(project)) = 'matheson constructors';

UPDATE forecast_assignments
   SET project = 'CoolAir',
       updated_at = now()
 WHERE LOWER(TRIM(project)) = 'cool air';

UPDATE forecast_assignments
   SET project = 'LLI',
       updated_at = now()
 WHERE LOWER(TRIM(project)) = 'llyods list intelligence';

-- Optional audit: show how many rows changed per alias.
-- Wrap in DO $$ ... $$ so it runs inline without cluttering the script.
DO $$
DECLARE
  remaining_qudata INTEGER;
  remaining_matheson INTEGER;
  remaining_coolair INTEGER;
  remaining_lli INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_qudata FROM forecast_assignments WHERE LOWER(TRIM(project)) = 'qudata centres';
  SELECT COUNT(*) INTO remaining_matheson FROM forecast_assignments WHERE LOWER(TRIM(project)) = 'matheson constructors';
  SELECT COUNT(*) INTO remaining_coolair FROM forecast_assignments WHERE LOWER(TRIM(project)) = 'cool air';
  SELECT COUNT(*) INTO remaining_lli FROM forecast_assignments WHERE LOWER(TRIM(project)) = 'llyods list intelligence';

  RAISE NOTICE 'Post-migration check — should all be 0:';
  RAISE NOTICE '  QuData Centres: %', remaining_qudata;
  RAISE NOTICE '  Matheson Constructors: %', remaining_matheson;
  RAISE NOTICE '  Cool Air: %', remaining_coolair;
  RAISE NOTICE '  Llyods List Intelligence: %', remaining_lli;
END $$;
