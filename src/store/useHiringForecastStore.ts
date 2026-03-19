import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Month } from '../types/forecast';
import type { ConciergeConfig, RoleCategory, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';

function defaultConciergeConfig(): ConciergeConfig {
  const m = (ba: number, jd: number, sd: number): Record<RoleCategory, number> => ({
    BA: ba, JuniorDev: jd, SeniorDev: sd,
  });
  // ~400 hrs/month total, split: BA 130, JuniorDev 170, SeniorDev 100
  const split = m(130, 170, 100);
  return {
    monthlyHours: {
      BA: { Jan: split.BA, Feb: split.BA, Mar: split.BA, Apr: split.BA, May: split.BA, Jun: split.BA },
      JuniorDev: { Jan: split.JuniorDev, Feb: split.JuniorDev, Mar: split.JuniorDev, Apr: split.JuniorDev, May: split.JuniorDev, Jun: split.JuniorDev },
      SeniorDev: { Jan: split.SeniorDev, Feb: split.SeniorDev, Mar: split.SeniorDev, Apr: split.SeniorDev, May: split.SeniorDev, Jun: split.SeniorDev },
    },
  };
}

function defaultScenarioSettings(): ScenarioSettings {
  return { targetUtilization: 80, forecastStartMonth: 'Jan', forecastEndMonth: 'Jun' };
}

let nextId = 1;
function genId(): string {
  return `sr-${Date.now()}-${nextId++}`;
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
          staffingRequests: [...s.staffingRequests, { ...req, id: genId() }],
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
    { name: 'simpliigence-hiring-forecast', version: 1 },
  ),
);
