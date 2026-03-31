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

/** Wrapper: resolves to { value, timedOut: false } or { value: undefined, timedOut: true } */
async function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<{ value: T; timedOut: false } | { value: undefined; timedOut: true }> {
  return Promise.race([
    p.then((value) => ({ value, timedOut: false as const })),
    new Promise<{ value: undefined; timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ value: undefined, timedOut: true }), ms),
    ),
  ]);
}

function useSupabaseInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      try {
        const [
          forecastRes,
          financialRes,
          syncRes,
          hiringRes,
          staffingRes,
          pipelineRes,
        ] = await Promise.all([
          withTimeout(fetchAssignments()),
          withTimeout(fetchFinancialSettings()),
          withTimeout(fetchSyncConfig()),
          withTimeout(fetchHiringForecastConfig()),
          withTimeout(fetchStaffingRequests()),
          withTimeout(fetchPipelineProjects()),
        ]);

        // --- Forecast assignments ---
        if (!forecastRes.timedOut) {
          const forecastData = forecastRes.value;
          if (forecastData && forecastData.assignments.length > 0) {
            useForecastStore.setState({
              assignments: forecastData.assignments,
              weekDates: forecastData.weekDates,
            });
            console.log('[supabase] Loaded', forecastData.assignments.length, 'assignments from Supabase');
          } else {
            // Supabase is genuinely empty — seed
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
        } else {
          console.warn('[supabase] Forecast fetch timed out — using localStorage, not overwriting Supabase');
        }

        // --- Financial settings ---
        if (!financialRes.timedOut) {
          if (financialRes.value) {
            useFinancialStore.setState({ settings: financialRes.value });
          } else {
            db.saveFinancialSettings(useFinancialStore.getState().settings);
          }
        }

        // --- Sync config ---
        if (!syncRes.timedOut && syncRes.value) {
          useSyncStore.setState(syncRes.value as unknown as Partial<ReturnType<typeof useSyncStore.getState>>);
        }

        // --- Hiring forecast ---
        if (!hiringRes.timedOut && hiringRes.value) {
          const hd = hiringRes.value;
          if (hd.scenarioSettings?.targetUtilization) {
            useHiringForecastStore.setState({
              conciergeConfig: hd.conciergeConfig,
              scenarioSettings: hd.scenarioSettings,
            });
          } else {
            const s = useHiringForecastStore.getState();
            db.saveHiringConfig(s.conciergeConfig, s.scenarioSettings);
          }
        }

        // --- Staffing requests ---
        if (!staffingRes.timedOut) {
          const sd = staffingRes.value;
          if (sd && sd.length > 0) {
            useHiringForecastStore.setState({ staffingRequests: sd });
          } else {
            const existing = useHiringForecastStore.getState().staffingRequests;
            for (const r of existing) {
              db.insertStaffingRequest(r);
            }
          }
        }

        // --- Pipeline projects ---
        if (!pipelineRes.timedOut) {
          const pd = pipelineRes.value;
          if (pd && pd.length > 0) {
            usePipelineStore.setState({ projects: pd });
          } else {
            const localProjects = usePipelineStore.getState().projects;
            if (localProjects.length === 0) {
              usePipelineStore.setState({ projects: ZOHO_SEED_PROJECTS });
              await db.replacePipelineProjects(ZOHO_SEED_PROJECTS);
            } else {
              await db.replacePipelineProjects(localProjects);
            }
          }
        } else {
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
