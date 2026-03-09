import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { buildSeedData } from './data/employeeSeed';
import { useSyncStore } from './store';
import { performSync } from './lib/syncOneDrive';

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

/**
 * Auto-sync from OneDrive on page load if a share URL is configured
 * and auto-sync is enabled. Debounce: skip if last sync was <60s ago.
 */
function useAutoSync() {
  useEffect(() => {
    const { oneDriveUrl, autoSyncOnLoad, lastSyncAt, isSyncing } = useSyncStore.getState();
    if (!oneDriveUrl || !autoSyncOnLoad || isSyncing) return;

    // Debounce: skip if synced within the last 60 seconds
    if (lastSyncAt) {
      const elapsed = Date.now() - new Date(lastSyncAt).getTime();
      if (elapsed < 60_000) return;
    }

    performSync().catch(() => {
      // errors are captured in syncStore
    });
  }, []);
}

function App() {
  useSeedOnFirstVisit();
  useAutoSync();
  return <RouterProvider router={router} />;
}

export default App;
