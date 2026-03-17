import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialSettings } from '../types';

const DEFAULT_EXCHANGE_RATE = 83.5;

interface FinancialState {
  settings: FinancialSettings;
  updateSettings: (updates: Partial<FinancialSettings>) => void;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      settings: {
        exchangeRate: DEFAULT_EXCHANGE_RATE,
        displayCurrency: 'inr',
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    { name: 'simpliigence-financial', version: 2 },
  ),
);
