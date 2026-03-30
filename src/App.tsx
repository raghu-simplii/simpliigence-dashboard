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
 * 3. If Supabase is empty → seed from current localStorage/seed data, then push to Supabase
 * 4. Set up realtime subscriptions for multi-user sync
 */
function useSupabaseInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      try {
        // Fetch all data from Supabase in parallel, with a 5s timeout
        const withTimeout = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
          Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 5000))]);

        const [
          forecastData,
          financialData,
          syncData,
          hiringData,
          staffingData,
          pipelineData,
        ] = await Promise.all([
          withTimeout(fetchAssignments(), null),
          withTimeout(fetchFinancialSettings(), null),
          withTimeout(fetchSyncConfig(), null),
          withTimeout(fetchHiringForecastConfig(), null),
          withTimeout(fetchStaffingRequests(), null),
          withTimeout(fetchPipelineProjects(), null),
        ]);

        // --- Forecast assignments ---
        if (forecastData && forecastData.assignments.length > 0) {
          // Supabase has data — use it
          useForecastStore.setState({
            assignments: forecastData.assignments,
            weekDates: forecastData.weekDates,
          });
        } else {
          // Supabase is empty — check localStorage, then seed data
          const localAssignments = useForecastStore.getState().assignments;
          if (localAssignments.length > 0) {
            // Ensure all have ids
            const withIds = localAssignments.map((a) => (a.id ? a : { ...a, id: nanoid() }));
            useForecastStore.setState({ assignments: withIds });
            // Push local data to Supabase
            await db.replaceAllAssignments(withIds, useForecastStore.getState().weekDates);
          } else {
            // Load seed data
            const seedAssignments = buildSeedAssignments();
            useForecastStore.setState({ assignments: seedAssignments, weekDates: [] });
            await db.replaceAllAssignments(seedAssignments, []);
          }
        }

        // --- Financial settings ---
        if (financialData) {
          useFinancialStore.setState({ settings: financialData });
        } else {
          // Push current settings to Supabase
          db.saveFinancialSettings(useFinancialStore.getState().settings);
        }

        // --- Sync config ---
        if (syncData) {
          useSyncStore.setState(syncData);
        }

        // --- Hiring forecast ---
        if (hiringData && hiringData.scenarioSettings?.targetUtilization) {
          useHiringForecastStore.setState({
            conciergeConfig: hiringData.conciergeConfig,
            scenarioSettings: hiringData.scenarioSettings,
          });
        } else {
          const s = useHiringForecastStore.getState();
          db.saveHiringConfig(s.conciergeConfig, s.scenarioSettings);
        }

        // --- Staffing requests ---
        if (staffingData && staffingData.length > 0) {
          useHiringForecastStore.setState({ staffingRequests: staffingData });
        } else {
          // Push any existing staffing requests to Supabase
          const existing = useHiringForecastStore.getState().staffingRequests;
          for (const r of existing) {
            db.insertStaffingRequest(r);
          }
        }

        // --- Pipeline projects ---
        if (pipelineData && pipelineData.length > 0) {
          usePipelineStore.setState({ projects: pipelineData });
        } else {
          // Seed with Zoho data if localStorage is also empty
          const localProjects = usePipelineStore.getState().projects;
          if (localProjects.length === 0) {
            usePipelineStore.setState({ projects: ZOHO_SEED_PROJECTS });
            await db.replacePipelineProjects(ZOHO_SEED_PROJECTS);
          } else {
            await db.replacePipelineProjects(localProjects);
          }
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
