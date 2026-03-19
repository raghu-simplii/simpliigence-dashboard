import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ForecastAssignment } from '../types/forecast';

interface ForecastState {
  assignments: ForecastAssignment[];
  weekDates: string[];
  setData: (assignments: ForecastAssignment[], weekDates: string[]) => void;
  clear: () => void;
}

export const useForecastStore = create<ForecastState>()(
  persist(
    (set) => ({
      assignments: [],
      weekDates: [],
      setData: (assignments, weekDates) => set({ assignments, weekDates }),
      clear: () => set({ assignments: [], weekDates: [] }),
    }),
    {
      name: 'simpliigence-forecast',
      version: 2,
      migrate: () => ({ assignments: [], weekDates: [] }),
    },
  ),
);
