import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { buildSeedAssignments } from './data/employeeSeed';
import { usePipelineStore } from './store';
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

function App() {
  useSeedOnFirstVisit();
  useSeedZohoPipeline();
  return <RouterProvider router={router} />;
}

export default App;
