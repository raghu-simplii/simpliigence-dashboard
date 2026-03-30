import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialSettings } from '../types';
import { db } from '../lib/supabaseSync';

const DEFAULT_EXCHANGE_RATE = 83.5; // INR per 1 USD
const DEFAULT_CAD_TO_USD = 0.73;    // USD per 1 CAD

interface FinancialState {
  settings: FinancialSettings;
  updateSettings: (updates: Partial<FinancialSettings>) => void;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      settings: {
        exchangeRate: DEFAULT_EXCHANGE_RATE,
        cadToUsdRate: DEFAULT_CAD_TO_USD,
        displayCurrency: 'inr',
      },
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        db.saveFinancialSettings(get().settings);
      },
    }),
    {
      name: 'simpliigence-financial',
      version: 3,
      migrate: (persisted: unknown) => {
        const old = persisted as Record<string, unknown> | null;
        const oldSettings = (old?.settings as Record<string, unknown>) ?? {};
        return {
          settings: {
            exchangeRate: (oldSettings.exchangeRate as number) ?? DEFAULT_EXCHANGE_RATE,
            cadToUsdRate: (oldSettings.cadToUsdRate as number) ?? DEFAULT_CAD_TO_USD,
            displayCurrency: (oldSettings.displayCurrency as string) ?? 'inr',
          },
        };
      },
    },
  ),
);
