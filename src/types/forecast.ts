/** Core types for the forecast-driven dashboard. */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;
export type Month = (typeof MONTHS)[number];

/** One row from the "Forecasting Hrs" sheet: one employee on one project. */
export interface ForecastAssignment {
  employeeName: string;
  notes: string;
  role: string;
  rateCard: number | null; // USD/hr
  isSI: boolean;
  isContractor: boolean;
  project: string;
  /** Weekly hours keyed by ISO date string, e.g. "2026-01-05" */
  weeklyHours: Record<string, number>;
  /** Monthly total hours keyed by month name */
  monthlyTotals: Record<Month, number>;
}

/** Aggregated view of one employee across all their projects. */
export interface EmployeeSummary {
  name: string;
  role: string;
  rateCard: number | null;
  isSI: boolean;
  isContractor: boolean;
  projects: string[];
  monthlyHours: Record<Month, number>;
  totalHours: number;
  q1Hours: number; // Jan–Mar
  q2Hours: number; // Apr–Jun
}

/** Aggregated view of one project across all assigned employees. */
export interface ProjectSummary {
  name: string;
  employees: { name: string; role: string; totalHours: number; rateCard: number | null }[];
  monthlyHours: Record<Month, number>;
  totalHours: number;
  estimatedRevenue: number; // sum of employee hours × rate
}

/** Weekly date column parsed from the header. */
export interface WeekColumn {
  colIndex: number;
  date: string; // ISO date string
  label: string; // e.g. "5 Jan"
}
