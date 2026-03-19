import type { ForecastAssignment, Month } from '../types/forecast';
import { MONTHS } from '../types/forecast';
import type { RoleCategory } from '../types/hiringForecast';
import { ROLE_CATEGORIES } from '../types/hiringForecast';

/** Classify a spreadsheet role string into BA, JuniorDev, or SeniorDev. */
export function classifyRole(role: string): RoleCategory {
  const lower = role.toLowerCase();
  if (lower.includes('senior') && lower.includes('developer')) return 'SeniorDev';
  if (lower.includes('developer')) return 'JuniorDev';
  // BA bucket: analysts, consultants, leads, US resources, contractors, etc.
  return 'BA';
}

/** Sum monthly hours from assignments grouped by role category. */
export function getProjectDemandByRole(
  assignments: ForecastAssignment[],
): Record<RoleCategory, Record<Month, number>> {
  const result = emptyRoleMonthRecord();
  for (const a of assignments) {
    const cat = classifyRole(a.role);
    for (const m of MONTHS) {
      result[cat][m] += a.monthlyTotals[m];
    }
  }
  return result;
}

/** Count unique employees per role category. */
export function getCurrentHeadcountByRole(
  assignments: ForecastAssignment[],
): Record<RoleCategory, number> {
  const sets: Record<RoleCategory, Set<string>> = {
    BA: new Set(),
    JuniorDev: new Set(),
    SeniorDev: new Set(),
  };
  for (const a of assignments) {
    const cat = classifyRole(a.role);
    sets[cat].add(a.employeeName.toLowerCase());
  }
  return {
    BA: sets.BA.size,
    JuniorDev: sets.JuniorDev.size,
    SeniorDev: sets.SeniorDev.size,
  };
}

/**
 * Compute historic utilization % per role category.
 * utilization = totalActualHours / (headcount × 160 × monthsWithData) × 100
 */
export function getHistoricUtilization(
  assignments: ForecastAssignment[],
): Record<RoleCategory, number> {
  const headcount = getCurrentHeadcountByRole(assignments);
  const demand = getProjectDemandByRole(assignments);

  const result: Record<RoleCategory, number> = { BA: 80, JuniorDev: 80, SeniorDev: 80 };

  for (const cat of ROLE_CATEGORIES) {
    if (headcount[cat] === 0) continue;
    // Count months that have any demand (to avoid dividing by empty months)
    let monthsActive = 0;
    let totalHours = 0;
    for (const m of MONTHS) {
      if (demand[cat][m] > 0) {
        monthsActive++;
        totalHours += demand[cat][m];
      }
    }
    if (monthsActive === 0) continue;
    const capacity = headcount[cat] * 160 * monthsActive;
    result[cat] = Math.min(100, Math.round((totalHours / capacity) * 100));
  }

  return result;
}

function emptyRoleMonthRecord(): Record<RoleCategory, Record<Month, number>> {
  return {
    BA: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 },
    JuniorDev: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 },
    SeniorDev: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 },
  };
}
