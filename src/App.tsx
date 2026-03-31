import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { nanoid } from 'nanoid';
import { buildSeedAssignments } from './data/employeeSeed';
import { useForecastStore, useFinancialStore, useSyncStore, useHiringForecastStore, usePipelineStore } from './store';
import { ZOHO_SEED_PROJECTS } from './data/zohoSeed';
import {
  fetchAssignments,
  fetchFinancialSettings,
  fetchSyncConfig,
  fetchHiringForecastConfig,
  fetchStaffingRequests,
  fetchPipelineProjects,
  setupRealtimeSubscriptions,
  db,
} from './lib/supabaseSync';

/**
 * On app start:
 * 1. Try loading data from Supabase (shared database)
 * 2. If Supabase has data → hydrate stores (overrides localStorage)
 * 3. If Supabase is genuinely empty (not timed out) → seed from localStorage/seed data, push to Supabase
 * 4. If Supabase timed out → use localStorage as-is, NEVER overwrite Supabase
 * 5. Set up realtime subscriptions for multi-user sync
 */

const TIMEOUT = Symbol('TIMEOUT');

function useSupabaseInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      try {
        // Fetch all data from Supabase in parallel, with a 10s timeout.
        // IMPORTANT: timeout returns TIMEOUT sentinel (not null) so we can
        // distinguish "Supabase returned empty" from "fetch never completed".
        // We must NEVER push stale localStorage data to Supabase on timeout.
        const withTimeout = <T,>(p: Promise<T>): Promise<T | typeof TIMEOUT> =>
          Promise.race([p, new Promise<T | typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), 10000))]);

        const [
          forecastResult,
          financialResult,
          syncResult,
          hiringResult,
          staffingResult,
          pipelineResult,
        ] = await Promise.all([
          withTimeout(fetchAssignments()),
          withTimeout(fetchFinancialSettings()),
          withTimeout(fetchSyncConfig()),
          withTimeout(fetchHiringForecastConfig()),
          withTimeout(fetchStaffingRequests()),
          withTimeout(fetchPipelineProjects()),
        ]);

        const timedOut = (v: unknown) => v === TIMEOUT;

        // --- Forecast assignments ---
        if (!timedOut(forecastResult) && forecastResult && (forecastResult as Awaited<ReturnType<typeof fetchAssignments>>).assignments.length > 0) {
          const forecastData = forecastResult as Awaited<ReturnType<typeof fetchAssignments>>;
          // Supabase has data — use it (overrides localStorage)
          useForecastStore.setState({
            assignments: forecastData.assignments,
            weekDates: forecastData.weekDates,
          });
          console.log('[supabase] Loaded', forecastData.assignments.length, 'assignments from Supabase');
        } else if (timedOut(forecastResult)) {
          // Timed out — use localStorage as-is, do NOT push to Supabase
          console.warn('[supabase] Forecast fetch timed out — using localStorage, not overwriting Supabase');
        } else {
          // Supabase is genuinely empty — seed from localStorage or seed data, then push
          console.log('[supabase] Supabase is empty — seeding...');
          const localAssignments = useForecastStore.getState().assignments;
          if (localAssignments.length > 0) {
            const withIds = localAssignments.map((a) => (a.id ? a : { ...a, id: nanoid() }));
            useForecastStore.setState({ assignments: withIds });
            await db.replaceAllAssignments(withIds, useForecastStore.getState().weekDates);
          } else {
            const seedAssignments = buildSeedAssignments();
            useForecastStore.setState({ assignments: seedAssignments, weekDates: [] });
            await db.replaceAllAssignments(seedAssignments, []);
          }
        }

        // --- Financial settings ---
        if (!timedOut(financialResult) && financialResult) {
          useFinancialStore.setState({ settings: financialResult as Awaited<ReturnType<typeof fetchFinancialSettings>> });
        } else if (!timedOut(financialResult)) {
          db.saveFinancialSettings(useFinancialStore.getState().settings);
        }

        // --- Sync config ---
        if (!timedOut(syncResult) && syncResult) {
          useSyncStore.setState(syncResult as Awaited<ReturnType<typeof fetchSyncConfig>>);
        }

        // --- Hiring forecast ---
        if (!timedOut(hiringResult) && hiringResult) {
          const hiringData = hiringResult as Awaited<ReturnType<typeof fetchHiringForecastConfig>>;
          if (hiringData?.scenarioSettings?.targetUtilization) {
            useHiringForecastStore.setState({
              conciergeConfig: hiringData.conciergeConfig,
              scenarioSettings: hiringData.scenarioSettings,
            });
          } else {
            const s = useHiringForecastStore.getState();
            db.saveHiringConfig(s.conciergeConfig, s.scenarioSettings);
          }
        }

        // --- Staffing requests ---
        if (!timedOut(staffingResult) && staffingResult) {
          const staffingData = staffingResult as Awaited<ReturnType<typeof fetchStaffingRequests>>;
          if (staffingData && staffingData.length > 0) {
            useHiringForecastStore.setState({ staffingRequests: staffingData });
          } else {
            const existing = useHiringForecastStore.getState().staffingRequests;
            for (const r of existing) {
              db.insertStaffingRequest(r);
            }
          }
        }

        // --- Pipeline projects ---
        if (!timedOut(pipelineResult) && pipelineResult) {
          const pipelineData = pipelineResult as Awaited<ReturnType<typeof fetchPipelineProjects>>;
          if (pipelineData && pipelineData.length > 0) {
            usePipelineStore.setState({ projects: pipelineData });
          } else {
            const localProjects = usePipelineStore.getState().projects;
            if (localProjects.length === 0) {
              usePipelineStore.setState({ projects: ZOHO_SEED_PROJECTS });
              await db.replacePipelineProjects(ZOHO_SEED_PROJECTS);
            } else {
              await db.replacePipelineProjects(localProjects);
            }
          }
        } else if (timedOut(pipelineResult)) {
          console.warn('[supabase] Pipeline fetch timed out — using localStorage');
        }

        // Set up realtime subscriptions
        cleanup = setupRealtimeSubscriptions({
          setForecastState: (assignments, weekDates) => {
            const update: Record<string, unknown> = { assignments };
            if (weekDates !== undefined) update.weekDates = weekDates;
            useForecastStore.setState(update as { assignments: typeof assignments; weekDates?: string[] });
          },
          setFinancialSettings: (settings) => {
            useFinancialStore.setState({ settings });
          },
          setSyncConfig: (config) => {
            useSyncStore.setState(config as unknown as Partial<ReturnType<typeof useSyncStore.getState>>);
          },
          setHiringConfig: (concierge, scenario, requests) => {
            useHiringForecastStore.setState({
              conciergeConfig: concierge,
              scenarioSettings: scenario,
              staffingRequests: requests,
            });
          },
          setPipelineProjects: (projects) => {
            usePipelineStore.setState({ projects });
          },
          getForecastAssignments: () => useForecastStore.getState().assignments,
          getStaffingRequests: () => useHiringForecastStore.getState().staffingRequests,
          getPipelineProjects: () => usePipelineStore.getState().projects,
        });

        console.log('[supabase] Initialized — data loaded and realtime subscriptions active');
      } catch (err) {
        console.warn('[supabase] Init failed, using local data:', err);
      } finally {
        setReady(true);
      }
    }

    init();
    return () => { cleanup?.(); };
  }, []);

  return ready;
}

function App() {
  const ready = useSupabaseInit();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
