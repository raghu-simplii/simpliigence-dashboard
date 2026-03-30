import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import type { ConciergeConfig, RoleCategory, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';

function defaultConciergeConfig(): ConciergeConfig {
  // ~400 hrs/month total, split: BA 130, JuniorDev 170, SeniorDev 100
  const fill = (val: number): Record<Month, number> => {
    const r: Record<string, number> = {};
    for (const m of MONTHS) r[m] = val;
    return r as Record<Month, number>;
  };
  return {
    monthlyHours: {
      BA: fill(130),
      JuniorDev: fill(170),
      SeniorDev: fill(100),
    },
  };
}

function defaultScenarioSettings(): ScenarioSettings {
  return { targetUtilization: 80, forecastStartMonth: 'Mar', forecastEndMonth: 'Dec' };
}

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${nextId++}`;
}

interface HiringForecastState {
  conciergeConfig: ConciergeConfig;
  staffingRequests: StaffingRequest[];
  scenarioSettings: ScenarioSettings;

  setConciergeHours: (role: RoleCategory, month: Month, hours: number) => void;
  addStaffingRequest: (req: Omit<StaffingRequest, 'id'>) => void;
  removeStaffingRequest: (id: string) => void;
  updateScenarioSettings: (updates: Partial<ScenarioSettings>) => void;
  resetToDefaults: () => void;
}

export const useHiringForecastStore = create<HiringForecastState>()(
  persist(
    (set) => ({
      conciergeConfig: defaultConciergeConfig(),
      staffingRequests: [],
      scenarioSettings: defaultScenarioSettings(),

      setConciergeHours: (role, month, hours) =>
        set((s) => ({
          conciergeConfig: {
            monthlyHours: {
              ...s.conciergeConfig.monthlyHours,
              [role]: { ...s.conciergeConfig.monthlyHours[role], [month]: hours },
            },
          },
        })),

      addStaffingRequest: (req) =>
        set((s) => ({
          staffingRequests: [...s.staffingRequests, { ...req, id: genId('sr') }],
        })),

      removeStaffingRequest: (id) =>
        set((s) => ({
          staffingRequests: s.staffingRequests.filter((r) => r.id !== id),
        })),

      updateScenarioSettings: (updates) =>
        set((s) => ({
          scenarioSettings: { ...s.scenarioSettings, ...updates },
        })),

      resetToDefaults: () =>
        set({
          conciergeConfig: defaultConciergeConfig(),
          staffingRequests: [],
          scenarioSettings: defaultScenarioSettings(),
        }),
    }),
    {
      name: 'simpliigence-hiring-forecast',
      version: 5,
      migrate: (persisted: unknown) => {
        const old = persisted as Record<string, unknown> | null;
        return {
          conciergeConfig: (old?.conciergeConfig as ConciergeConfig) ?? defaultConciergeConfig(),
          staffingRequests: (old?.staffingRequests as StaffingRequest[]) ?? [],
          scenarioSettings: (old?.scenarioSettings as ScenarioSettings) ?? defaultScenarioSettings(),
        };
      },
    },
  ),
);
