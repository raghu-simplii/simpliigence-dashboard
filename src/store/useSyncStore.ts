import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncState {
  // Configuration
  oneDriveUrl: string;
  sheetName: string;
  autoSyncOnLoad: boolean;

  // Sync status
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | 'never';
  lastSyncError: string | null;
  lastSyncRowCount: number;
  lastSyncMemberCount: number;
  lastSyncProjectCount: number;
  isSyncing: boolean;

  // Actions
  setOneDriveUrl: (url: string) => void;
  setSheetName: (name: string) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncStarted: () => void;
  setSyncSuccess: (rowCount: number, memberCount: number, projectCount: number) => void;
  setSyncError: (error: string) => void;
  clearConfig: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      oneDriveUrl: '',
      sheetName: 'Forecasting Hrs',
      autoSyncOnLoad: true,

      lastSyncAt: null,
      lastSyncStatus: 'never',
      lastSyncError: null,
      lastSyncRowCount: 0,
      lastSyncMemberCount: 0,
      lastSyncProjectCount: 0,
      isSyncing: false,

      setOneDriveUrl: (url) => set({ oneDriveUrl: url.trim() }),
      setSheetName: (name) => set({ sheetName: name.trim() }),
      setAutoSync: (enabled) => set({ autoSyncOnLoad: enabled }),

      setSyncStarted: () => set({ isSyncing: true, lastSyncError: null }),

      setSyncSuccess: (rowCount, memberCount, projectCount) =>
        set({
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          lastSyncRowCount: rowCount,
          lastSyncMemberCount: memberCount,
          lastSyncProjectCount: projectCount,
        }),

      setSyncError: (error) =>
        set({
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'error',
          lastSyncError: error,
        }),

      clearConfig: () =>
        set({
          oneDriveUrl: '',
          lastSyncAt: null,
          lastSyncStatus: 'never',
          lastSyncError: null,
          lastSyncRowCount: 0,
          lastSyncMemberCount: 0,
          lastSyncProjectCount: 0,
          isSyncing: false,
        }),
    }),
    {
      name: 'simpliigence-sync',
      version: 1,
    }
  )
);
