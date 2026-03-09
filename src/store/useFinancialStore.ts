import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RateCard, HiringBudget, FinancialSettings, ID, Role, Seniority } from '../types';
import { nanoid } from 'nanoid';
import { DEFAULT_RATE_CARDS, DEFAULT_EXCHANGE_RATE } from '../constants/financial';

interface FinancialState {
  rateCards: RateCard[];
  hiringBudgets: HiringBudget[];
  settings: FinancialSettings;

  initializeDefaultRateCards: () => void;
  updateRateCard: (id: ID, updates: Partial<RateCard>) => void;
  getRateForRole: (role: Role, seniority: Seniority) => RateCard | undefined;

  addHiringBudget: (budget: Omit<HiringBudget, 'id'>) => void;
  updateHiringBudget: (id: ID, updates: Partial<HiringBudget>) => void;
  deleteHiringBudget: (id: ID) => void;

  updateSettings: (updates: Partial<FinancialSettings>) => void;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      rateCards: [],
      hiringBudgets: [],
      settings: {
        exchangeRate: DEFAULT_EXCHANGE_RATE,
        displayCurrency: 'inr',
      },

      initializeDefaultRateCards: () => {
        if (get().rateCards.length > 0) return;
        set({
          rateCards: DEFAULT_RATE_CARDS.map((rc) => ({
            ...rc,
            id: nanoid(),
          })),
        });
      },

      updateRateCard: (id, updates) =>
        set((state) => ({
          rateCards: state.rateCards.map((rc) =>
            rc.id === id ? { ...rc, ...updates } : rc
          ),
        })),

      getRateForRole: (role, seniority) =>
        get().rateCards.find((rc) => rc.role === role && rc.seniority === seniority),

      addHiringBudget: (budget) =>
        set((state) => ({
          hiringBudgets: [...state.hiringBudgets, { ...budget, id: nanoid() }],
        })),

      updateHiringBudget: (id, updates) =>
        set((state) => ({
          hiringBudgets: state.hiringBudgets.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      deleteHiringBudget: (id) =>
        set((state) => ({
          hiringBudgets: state.hiringBudgets.filter((b) => b.id !== id),
        })),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    { name: 'simpliigence-financial', version: 1 }
  )
);
