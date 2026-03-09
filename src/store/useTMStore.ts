import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ZohoPosition, TMSyncState } from '../types';

interface TMState {
  positions: ZohoPosition[];
  syncState: TMSyncState;
  setPositions: (positions: ZohoPosition[]) => void;
  addPosition: (position: ZohoPosition) => void;
  updateSyncState: (state: Partial<TMSyncState>) => void;
  clearPositions: () => void;
}

export const useTMStore = create<TMState>()(
  persist(
    (set) => ({
      positions: [],
      syncState: {
        lastSyncAt: null,
        isConnected: false,
        positionCount: 0,
        error: null,
      },

      setPositions: (positions) =>
        set({
          positions,
          syncState: {
            lastSyncAt: new Date().toISOString(),
            isConnected: true,
            positionCount: positions.length,
            error: null,
          },
        }),

      addPosition: (position) =>
        set((state) => ({ positions: [...state.positions, position] })),

      updateSyncState: (updates) =>
        set((state) => ({ syncState: { ...state.syncState, ...updates } })),

      clearPositions: () => set({ positions: [] }),
    }),
    { name: 'simpliigence-tm', version: 1 }
  )
);
