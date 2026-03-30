import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../lib/supabaseSync';

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
  isSyncing: boolean; // local-only, not synced to Supabase

  // Actions
  setOneDriveUrl: (url: string) => void;
  setSheetName: (name: string) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncStarted: () => void;
  setSyncSuccess: (rowCount: number, memberCount: number, projectCount: number) => void;
  setSyncError: (error: string) => void;
  clearConfig: () => void;
}

function syncableState(s: SyncState) {
  return {
    oneDriveUrl: s.oneDriveUrl,
    sheetName: s.sheetName,
    autoSyncOnLoad: s.autoSyncOnLoad,
    lastSyncAt: s.lastSyncAt,
    lastSyncStatus: s.lastSyncStatus,
    lastSyncError: s.lastSyncError,
    lastSyncRowCount: s.lastSyncRowCount,
    lastSyncMemberCount: s.lastSyncMemberCount,
    lastSyncProjectCount: s.lastSyncProjectCount,
  };
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
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

      setOneDriveUrl: (url) => {
        set({ oneDriveUrl: url.trim() });
        db.saveSyncConfig(syncableState(get()));
      },
      setSheetName: (name) => {
        set({ sheetName: name.trim() });
        db.saveSyncConfig(syncableState(get()));
      },
      setAutoSync: (enabled) => {
        set({ autoSyncOnLoad: enabled });
        db.saveSyncConfig(syncableState(get()));
      },

      setSyncStarted: () => set({ isSyncing: true, lastSyncError: null }),

      setSyncSuccess: (rowCount, memberCount, projectCount) => {
        set({
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          lastSyncRowCount: rowCount,
          lastSyncMemberCount: memberCount,
          lastSyncProjectCount: projectCount,
        });
        db.saveSyncConfig(syncableState(get()));
      },

      setSyncError: (error) => {
        set({
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'error',
          lastSyncError: error,
        });
        db.saveSyncConfig(syncableState(get()));
      },

      clearConfig: () => {
        set({
          oneDriveUrl: '',
          lastSyncAt: null,
          lastSyncStatus: 'never',
          lastSyncError: null,
          lastSyncRowCount: 0,
          lastSyncMemberCount: 0,
          lastSyncProjectCount: 0,
          isSyncing: false,
        });
        db.saveSyncConfig(syncableState(get()));
      },
    }),
    {
      name: 'simpliigence-sync',
      version: 1,
    },
  ),
);
