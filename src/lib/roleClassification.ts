import { MONTHS, emptyMonthRecord } from '../types/forecast';
import type { ForecastAssignment, Month } from '../types/forecast';
import type { RoleCategory } from '../types/hiringForecast';
import { ROLE_CATEGORIES } from '../types/hiringForecast';

/** Classify a spreadsheet role string into BA, JuniorDev, SeniorDev, or null (not tracked for hiring). */
export function classifyRole(role: string): RoleCategory | null {
  const lower = role.toLowerCase();
  if (lower.includes('senior') && lower.includes('developer')) return 'SeniorDev';
  if (lower.includes('developer')) return 'JuniorDev';
  if (lower.includes('analyst') || lower.includes(' ba')) return 'BA';
  // Consultants, Team Leads, Contractors, US Resources, etc. — not tracked for hiring
  return null;
}

/** Sum monthly hours from assignments grouped by role category (excludes untracked roles). */
export function getProjectDemandByRole(
  assignments: ForecastAssignment[],
): Record<RoleCategory, Record<Month, number>> {
  const result = emptyRoleMonthRecord();
  for (const a of assignments) {
    const cat = classifyRole(a.role);
    if (!cat) continue; // skip roles not tracked for hiring
    for (const m of MONTHS) {
      result[cat][m] += a.monthlyTotals[m] || 0;
    }
  }
  return result;
}

/** Count unique employees per role category (excludes untracked roles). */
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
    if (!cat) continue; // skip roles not tracked for hiring
    sets[cat].add(a.employeeName.toLowerCase());
  }
  return {
    BA: sets.BA.size,
    JuniorDev: sets.JuniorDev.size,
    SeniorDev: sets.SeniorDev.size,
  };
}

/**
 * Compute historic utilization % per role category (excludes untracked roles).
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
    BA: emptyMonthRecord(),
    JuniorDev: emptyMonthRecord(),
    SeniorDev: emptyMonthRecord(),
  };
}
