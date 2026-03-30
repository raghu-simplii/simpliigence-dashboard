import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import type { ConciergeConfig, RoleCategory, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';
import { db, registerHiringConfigGetter } from '../lib/supabaseSync';

function defaultConciergeConfig(): ConciergeConfig {
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
    (set, get) => ({
      conciergeConfig: defaultConciergeConfig(),
      staffingRequests: [],
      scenarioSettings: defaultScenarioSettings(),

      setConciergeHours: (role, month, hours) => {
        set((s) => ({
          conciergeConfig: {
            monthlyHours: {
              ...s.conciergeConfig.monthlyHours,
              [role]: { ...s.conciergeConfig.monthlyHours[role], [month]: hours },
            },
          },
        }));
        const s = get();
        db.saveHiringConfig(s.conciergeConfig, s.scenarioSettings);
      },

      addStaffingRequest: (req) => {
        const newReq: StaffingRequest = { ...req, id: genId('sr') };
        set((s) => ({
          staffingRequests: [...s.staffingRequests, newReq],
        }));
        db.insertStaffingRequest(newReq);
      },

      removeStaffingRequest: (id) => {
        set((s) => ({
          staffingRequests: s.staffingRequests.filter((r) => r.id !== id),
        }));
        db.deleteStaffingRequest(id);
      },

      updateScenarioSettings: (updates) => {
        set((s) => ({
          scenarioSettings: { ...s.scenarioSettings, ...updates },
        }));
        const s = get();
        db.saveHiringConfig(s.conciergeConfig, s.scenarioSettings);
      },

      resetToDefaults: () => {
        set({
          conciergeConfig: defaultConciergeConfig(),
          staffingRequests: [],
          scenarioSettings: defaultScenarioSettings(),
        });
        db.saveHiringConfig(defaultConciergeConfig(), defaultScenarioSettings());
        db.deleteAllStaffingRequests();
      },
    }),
    {
      name: 'simpliigence-hiring-forecast',
      version: 6,
      migrate: (persisted: unknown, version: number) => {
        const old = persisted as Record<string, unknown> | null;
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

// Register getter so supabaseSync can read hiring config without circular imports
registerHiringConfigGetter(() => ({
  conciergeConfig: useHiringForecastStore.getState().conciergeConfig,
  scenarioSettings: useHiringForecastStore.getState().scenarioSettings,
}));
