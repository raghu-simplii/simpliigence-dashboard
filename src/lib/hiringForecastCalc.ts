import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import type {
  ConciergeConfig,
  HiringGapRow,
  RoleCategory,
  ScenarioSettings,
  StaffingRequest,
} from '../types/hiringForecast';
import { ROLE_CATEGORIES } from '../types/hiringForecast';
import type { ForecastAssignment } from '../types/forecast';
import { getProjectDemandByRole, getCurrentHeadcountByRole } from './roleClassification';

/** Check if month is within the inclusive range [start, end] using MONTHS order. */
function monthInRange(month: Month, start: Month, end: Month): boolean {
  const i = MONTHS.indexOf(month);
  const s = MONTHS.indexOf(start);
  const e = MONTHS.indexOf(end);
  return i >= s && i <= e;
}

/** Sum staffing request hours for a given role category and month. */
function sumStaffingDemand(
  requests: StaffingRequest[],
  cat: RoleCategory,
  month: Month,
): number {
  let total = 0;
  for (const r of requests) {
    if (r.roleCategory === cat && monthInRange(month, r.startMonth, r.endMonth)) {
      total += r.hoursPerMonth;
    }
  }
  return total;
}

/**
 * Compute the full hiring gap analysis.
 * Returns one HiringGapRow per (month, roleCategory) within the forecast period.
 */
export function computeHiringForecast(
  assignments: ForecastAssignment[],
  conciergeConfig: ConciergeConfig,
  staffingRequests: StaffingRequest[],
  settings: ScenarioSettings,
): HiringGapRow[] {
  const projectDemand = getProjectDemandByRole(assignments);
  const headcount = getCurrentHeadcountByRole(assignments);
  const effectiveCapPerPerson = 160 * (settings.targetUtilization / 100);

  const rows: HiringGapRow[] = [];

  for (const month of MONTHS) {
    if (!monthInRange(month, settings.forecastStartMonth, settings.forecastEndMonth)) continue;

    for (const cat of ROLE_CATEGORIES) {
      const pd = projectDemand[cat][month];
      const cd = conciergeConfig.monthlyHours[cat][month];
      const sd = sumStaffingDemand(staffingRequests, cat, month);
      const totalDemand = pd + cd + sd;
      const totalCapacity = headcount[cat] * effectiveCapPerPerson;
      const gap = totalDemand - totalCapacity;

      rows.push({
        month,
        roleCategory: cat,
        projectDemand: pd,
        conciergeDemand: cd,
        staffingDemand: sd,
        totalDemand,
        currentHeadcount: headcount[cat],
        effectiveCapacityPerPerson: effectiveCapPerPerson,
        totalCapacity,
        gap,
        hiresNeeded: Math.max(0, Math.ceil(gap / effectiveCapPerPerson)),
      });
    }
  }

  return rows;
}

/** Aggregate gap rows for summary stats. */
export function aggregateGapRows(rows: HiringGapRow[]) {
  let totalDemand = 0;
  let totalCapacity = 0;
  let totalGap = 0;
  const maxHiresByRole: Record<RoleCategory, number> = { BA: 0, JuniorDev: 0, SeniorDev: 0 };

  for (const r of rows) {
    totalDemand += r.totalDemand;
    totalCapacity += r.totalCapacity;
    totalGap += Math.max(0, r.gap);
    if (r.hiresNeeded > maxHiresByRole[r.roleCategory]) {
      maxHiresByRole[r.roleCategory] = r.hiresNeeded;
    }
  }

  const totalHiresNeeded = maxHiresByRole.BA + maxHiresByRole.JuniorDev + maxHiresByRole.SeniorDev;

  return { totalDemand, totalCapacity, totalGap, totalHiresNeeded, maxHiresByRole };
}
