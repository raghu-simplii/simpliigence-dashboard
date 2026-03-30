import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import type { ConciergeConfig, PipelineProject, RoleCategory, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';

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
  pipelineProjects: PipelineProject[];
  scenarioSettings: ScenarioSettings;

  setConciergeHours: (role: RoleCategory, month: Month, hours: number) => void;
  addStaffingRequest: (req: Omit<StaffingRequest, 'id'>) => void;
  removeStaffingRequest: (id: string) => void;
  addPipelineProject: (proj: Omit<PipelineProject, 'id'>) => void;
  removePipelineProject: (id: string) => void;
  updatePipelineProject: (id: string, updates: Partial<Omit<PipelineProject, 'id'>>) => void;
  /** Bulk-import Zoho projects (preserves manual ones + resource estimates from existing Zoho entries). */
  setZohoProjects: (projects: Omit<PipelineProject, 'id'>[]) => void;
  updateScenarioSettings: (updates: Partial<ScenarioSettings>) => void;
  resetToDefaults: () => void;
}

export const useHiringForecastStore = create<HiringForecastState>()(
  persist(
    (set) => ({
      conciergeConfig: defaultConciergeConfig(),
      staffingRequests: [],
      pipelineProjects: [],
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

      addPipelineProject: (proj) =>
        set((s) => ({
          pipelineProjects: [...s.pipelineProjects, { ...proj, id: genId('pp') }],
        })),

      removePipelineProject: (id) =>
        set((s) => ({
          pipelineProjects: s.pipelineProjects.filter((p) => p.id !== id),
        })),

      updatePipelineProject: (id, updates) =>
        set((s) => ({
          pipelineProjects: s.pipelineProjects.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      setZohoProjects: (zohoProjects) =>
        set((s) => {
          const manual = s.pipelineProjects.filter((p) => p.source !== 'zoho');
          // Preserve resource estimates from existing zoho entries
          const existingByZohoId = new Map(
            s.pipelineProjects
              .filter((p) => p.source === 'zoho' && p.zohoId)
              .map((p) => [p.zohoId!, p]),
          );
          const merged = zohoProjects.map((zp, i) => {
            const existing = zp.zohoId ? existingByZohoId.get(zp.zohoId) : undefined;
            const base = { ...zp, id: `zoho-${zp.zohoId || i}-${Date.now()}` };
            if (existing) {
              // Keep user-edited headcount/hours if they were set
              const totalHc = existing.headcount.BA + existing.headcount.JuniorDev + existing.headcount.SeniorDev;
              if (totalHc > 0) {
                return { ...base, headcount: existing.headcount, hoursPerPerson: existing.hoursPerPerson };
              }
            }
            return base;
          });
          return { pipelineProjects: [...manual, ...merged] };
        }),

      updateScenarioSettings: (updates) =>
        set((s) => ({
          scenarioSettings: { ...s.scenarioSettings, ...updates },
        })),

      resetToDefaults: () =>
        set({
          conciergeConfig: defaultConciergeConfig(),
          staffingRequests: [],
          pipelineProjects: [],
          scenarioSettings: defaultScenarioSettings(),
        }),
    }),
    {
      name: 'simpliigence-hiring-forecast',
      version: 4,
      migrate: () => ({
        conciergeConfig: defaultConciergeConfig(),
        staffingRequests: [],
        pipelineProjects: [],
        scenarioSettings: defaultScenarioSettings(),
      }),
    },
  ),
);
