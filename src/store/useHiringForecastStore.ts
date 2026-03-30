import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import type { ConciergeConfig, RoleCategory, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';

function defaultConciergeConfig(): ConciergeConfig {
  // Default to zero — users configure actual concierge demand as needed
  const fill = (val: number): Record<Month, number> => {
    const r: Record<string, number> = {};
    for (const m of MONTHS) r[m] = val;
    return r as Record<Month, number>;
  };
  return {
    monthlyHours: {
      BA: fill(0),
      JuniorDev: fill(0),
      SeniorDev: fill(0),
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
      version: 6,
      migrate: (persisted: unknown, version: number) => {
        const old = persisted as Record<string, unknown> | null;
        // v6: reset concierge config to zero defaults (previously had inflated defaults)
        const conciergeConfig = version < 6
          ? defaultConciergeConfig()
          : (old?.conciergeConfig as ConciergeConfig) ?? defaultConciergeConfig();
        return {
          conciergeConfig,
          staffingRequests: (old?.staffingRequests as StaffingRequest[]) ?? [],
          scenarioSettings: (old?.scenarioSettings as ScenarioSettings) ?? defaultScenarioSettings(),
        };
      },
    },
  ),
);
