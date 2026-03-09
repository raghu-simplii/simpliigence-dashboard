import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { buildSeedData } from './data/employeeSeed';

/**
 * Auto-seed on first visit: if localStorage has no team data (or empty array),
 * write seed data so the dashboard isn't blank for new visitors.
 */
function useSeedOnFirstVisit() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('simpliigence-team');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.members?.length > 0) return; // already has data
      }
      // No data — seed it
      const { projects, members } = buildSeedData();
      localStorage.setItem(
        'simpliigence-team',
        JSON.stringify({ state: { members }, version: 3 }),
      );
      localStorage.setItem(
        'simpliigence-projects',
        JSON.stringify({ state: { projects }, version: 2 }),
      );
      window.location.reload();
    } catch {
      // silently ignore — user can still load manually from Settings
    }
  }, []);
}

function App() {
  useSeedOnFirstVisit();
  return <RouterProvider router={router} />;
}

export default App;
