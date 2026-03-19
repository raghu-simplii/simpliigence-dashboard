import type { Month } from './forecast';

export type RoleCategory = 'BA' | 'JuniorDev' | 'SeniorDev';

export const ROLE_CATEGORIES: RoleCategory[] = ['BA', 'JuniorDev', 'SeniorDev'];

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  BA: 'Business Analysts',
  JuniorDev: 'Junior Developers',
  SeniorDev: 'Senior Developers',
};

/** Concierge demand: configurable hours per role per month */
export interface ConciergeConfig {
  monthlyHours: Record<RoleCategory, Record<Month, number>>;
}

/** A manual staffing request (future: from Zoho Recruit) */
export interface StaffingRequest {
  id: string;
  roleCategory: RoleCategory;
  hoursPerMonth: number;
  startMonth: Month;
  endMonth: Month;
  clientName: string;
}

/** A pipeline project with resource requirements */
export interface PipelineProject {
  id: string;
  projectName: string;
  startMonth: Month;
  endMonth: Month;
  /** Number of people needed per role category */
  headcount: Record<RoleCategory, number>;
  /** Hours per person per month (default 160) */
  hoursPerPerson: number;
}

/** Scenario planner settings */
export interface ScenarioSettings {
  targetUtilization: number; // 0–100
  forecastStartMonth: Month;
  forecastEndMonth: Month;
}

/** One row of forecast output: one month × one role category */
export interface HiringGapRow {
  month: Month;
  roleCategory: RoleCategory;
  projectDemand: number;
  conciergeDemand: number;
  staffingDemand: number;
  pipelineDemand: number;
  totalDemand: number;
  currentHeadcount: number;
  effectiveCapacityPerPerson: number;
  totalCapacity: number;
  gap: number;
  hiresNeeded: number;
}
