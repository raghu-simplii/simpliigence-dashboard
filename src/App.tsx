import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { buildSeedAssignments } from './data/employeeSeed';
import { useSyncStore } from './store';
import { usePipelineStore } from './store';
import { performSync } from './lib/syncOneDrive';
import { ZOHO_SEED_PROJECTS } from './data/zohoSeed';

function useSeedOnFirstVisit() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('simpliigence-forecast');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.assignments?.length > 0) return;
      }
      const assignments = buildSeedAssignments();
      localStorage.setItem(
        'simpliigence-forecast',
        JSON.stringify({ state: { assignments, weekDates: [] }, version: 2 }),
      );
      window.location.reload();
    } catch {
      // silently ignore
    }
  }, []);
}

function useSeedZohoPipeline() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('simpliigence-pipeline');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.projects?.length > 0) {
          // Patch forecastName onto existing projects from seed data
          const store = usePipelineStore.getState();
          const seedMap = new Map(ZOHO_SEED_PROJECTS.map((p) => [p.zohoId, p]));
          let needsUpdate = false;
          const patched = store.projects.map((p) => {
            const seed = p.zohoId ? seedMap.get(p.zohoId) : null;
            if (seed?.forecastName && !p.forecastName) {
              needsUpdate = true;
              return { ...p, forecastName: seed.forecastName };
            }
            return p;
          });
          if (needsUpdate) {
            usePipelineStore.setState({ projects: patched });
          }
          return;
        }
      }
      usePipelineStore.getState().setZohoProjects(ZOHO_SEED_PROJECTS);
    } catch { /* ignore */ }
  }, []);
}

function useAutoSync() {
  useEffect(() => {
    const { oneDriveUrl, autoSyncOnLoad, lastSyncAt, isSyncing } = useSyncStore.getState();
    if (!oneDriveUrl || !autoSyncOnLoad || isSyncing) return;
    if (lastSyncAt) {
      const elapsed = Date.now() - new Date(lastSyncAt).getTime();
      if (elapsed < 60_000) return;
    }
    performSync().catch(() => {});
  }, []);
}

function App() {
  useSeedOnFirstVisit();
  useSeedZohoPipeline();
  useAutoSync();
  return <RouterProvider router={router} />;
}

export default App;
