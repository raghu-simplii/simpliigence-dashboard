/**
 * Parse the "Forecasting Hrs" sheet and extract all forecast data.
 *
 * Layout: A=Employee Name, B=Notes, C=Role, D=Rate Card, E=SI Employee?,
 *         F=Contractor, G=Active Projects, H+= weekly date columns
 *         interspersed with monthly total columns like "Jan Full Month".
 */
import { emptyMonthRecord } from '../types/forecast';
import type { ForecastAssignment, Month, EmployeeSummary, ProjectSummary } from '../types/forecast';

const MONTHS: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Column indices
const COL_NAME = 0;
const COL_NOTES = 1;
const COL_ROLE = 2;
const COL_RATE = 3;
const COL_SI = 4;
const COL_CONTRACTOR = 5;
const COL_PROJECT = 6;
const FIRST_DATA_COL = 7;

// ── Helpers ────────────────────────────────────────────────────

function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\*+$/, '').trim();
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  if (typeof val === 'number') return val === 1;
  return false;
}

/** Convert Excel serial date to ISO date string. */
function excelSerialToISO(serial: number): string {
  const jsDate = new Date((serial - 25569) * 86400000);
  return jsDate.toISOString().split('T')[0];
}

/** Determine which month a date falls in (Jan–Dec). */
function dateToMonth(isoDate: string): Month | null {
  const d = new Date(isoDate);
  const month = d.getMonth(); // 0=Jan, 11=Dec
  if (month >= 0 && month <= 11) return MONTHS[month];
  return null;
}

/** Check if a header cell is a monthly total label. Returns the month or null. */
function parseMonthlyTotalLabel(val: unknown): Month | null {
  if (typeof val !== 'string') return null;
  const lower = val.toLowerCase();
  if (lower.includes('jan')) return 'Jan';
  if (lower.includes('feb')) return 'Feb';
  if (lower.includes('mar')) return 'Mar';
  if (lower.includes('apr') || lower.includes('aprint')) return 'Apr';
  if (lower.includes('may')) return 'May';
  if (lower.includes('jun')) return 'Jun';
  if (lower.includes('jul')) return 'Jul';
  if (lower.includes('aug')) return 'Aug';
  if (lower.includes('sep')) return 'Sep';
  if (lower.includes('oct')) return 'Oct';
  if (lower.includes('nov')) return 'Nov';
  if (lower.includes('dec')) return 'Dec';
  return null;
}

function isDateSerial(val: unknown): val is number {
  return typeof val === 'number' && val > 40000 && val < 60000;
}

// ── Main parse function ────────────────────────────────────────

export interface ParseResult {
  assignments: ForecastAssignment[];
  weekDates: string[];
}

export async function parseForecastingSheet(
  buffer: ArrayBuffer,
  sheetName: string = 'Forecasting Hrs',
): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
  }

  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (raw.length < 2) throw new Error('Spreadsheet has no data rows.');

  const headerRow = raw[0];

  // ── Classify header columns ──────────────────────────────────
  const weekColMap = new Map<number, string>();
  const monthTotalColMap = new Map<number, Month>();

  for (let c = FIRST_DATA_COL; c < headerRow.length; c++) {
    const val = headerRow[c];
    const month = parseMonthlyTotalLabel(val);
    if (month) {
      monthTotalColMap.set(c, month);
    } else if (isDateSerial(val)) {
      weekColMap.set(c, excelSerialToISO(val));
    }
  }

  const weekDatesSet = new Set<string>();
  for (const d of weekColMap.values()) weekDatesSet.add(d);
  const weekDates = Array.from(weekDatesSet).sort();

  // ── Parse data rows ──────────────────────────────────────────
  const assignments: ForecastAssignment[] = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.length === 0) continue;

    const name = cleanName(row[COL_NAME]);
    if (!name) continue;

    const project = typeof row[COL_PROJECT] === 'string' ? row[COL_PROJECT].trim() : '';
    if (!project) continue;

    const role = typeof row[COL_ROLE] === 'string' ? row[COL_ROLE].trim() : '';
    const rateRaw = toNumber(row[COL_RATE]);
    const rateCard = rateRaw > 0 ? rateRaw : null;
    const isSI = toBool(row[COL_SI]);
    const isContractor = toBool(row[COL_CONTRACTOR]);
    const notes = typeof row[COL_NOTES] === 'string' ? row[COL_NOTES].trim() : '';

    // Weekly hours
    const weeklyHours: Record<string, number> = {};
    for (const [colIdx, dateStr] of weekColMap) {
      const hrs = toNumber(row[colIdx]);
      if (hrs > 0) weeklyHours[dateStr] = hrs;
    }

    // Monthly totals from "X Full Month" columns
    const monthlyTotals: Record<Month, number> = emptyMonthRecord();
    for (const [colIdx, month] of monthTotalColMap) {
      const val = toNumber(row[colIdx]);
      if (val > 0) monthlyTotals[month] = val;
    }

    // Fill missing monthly totals from weekly hours
    for (const month of MONTHS) {
      if (monthlyTotals[month] === 0) {
        let sum = 0;
        for (const [dateStr, hrs] of Object.entries(weeklyHours)) {
          if (dateToMonth(dateStr) === month) sum += hrs;
        }
        if (sum > 0) monthlyTotals[month] = sum;
      }
    }

    assignments.push({
      employeeName: name,
      notes,
      role,
      rateCard,
      isSI,
      isContractor,
      project,
      weeklyHours,
      monthlyTotals,
    });
  }

  return { assignments, weekDates };
}

// ── Derived data helpers ───────────────────────────────────────

export function deriveEmployeeSummaries(assignments: ForecastAssignment[]): EmployeeSummary[] {
  const groups = new Map<string, ForecastAssignment[]>();
  for (const a of assignments) {
    const key = a.employeeName.toLowerCase();
    const arr = groups.get(key) ?? [];
    arr.push(a);
    groups.set(key, arr);
  }

  const result: EmployeeSummary[] = [];
  for (const [, rows] of groups) {
    const first = rows[0];
    const projects = [...new Set(rows.map((r) => r.project))];

    const monthlyHours: Record<Month, number> = emptyMonthRecord();
    for (const row of rows) {
      for (const m of MONTHS) {
        monthlyHours[m] += row.monthlyTotals[m];
      }
    }

    let role = '';
    let rateCard: number | null = null;
    let isSI = false;
    let isContractor = false;
    for (const row of rows) {
      if (row.role && !role) role = row.role;
      if (row.rateCard && !rateCard) rateCard = row.rateCard;
      if (row.isSI) isSI = true;
      if (row.isContractor) isContractor = true;
    }

    const totalHours = MONTHS.reduce((sum, m) => sum + monthlyHours[m], 0);
    const q1Hours = monthlyHours.Jan + monthlyHours.Feb + monthlyHours.Mar;
    const q2Hours = monthlyHours.Apr + monthlyHours.May + monthlyHours.Jun;

    result.push({ name: first.employeeName, role, rateCard, isSI, isContractor, projects, monthlyHours, totalHours, q1Hours, q2Hours });
  }

  return result.sort((a, b) => b.totalHours - a.totalHours);
}

export function deriveProjectSummaries(assignments: ForecastAssignment[]): ProjectSummary[] {
  const groups = new Map<string, ForecastAssignment[]>();
  for (const a of assignments) {
    const arr = groups.get(a.project) ?? [];
    arr.push(a);
    groups.set(a.project, arr);
  }

  const result: ProjectSummary[] = [];
  for (const [projectName, rows] of groups) {
    const monthlyHours: Record<Month, number> = emptyMonthRecord();
    const employeeMap = new Map<string, { name: string; role: string; totalHours: number; rateCard: number | null }>();

    for (const row of rows) {
      const rowTotal = MONTHS.reduce((s, m) => s + row.monthlyTotals[m], 0);
      for (const m of MONTHS) monthlyHours[m] += row.monthlyTotals[m];

      const existing = employeeMap.get(row.employeeName);
      if (existing) {
        existing.totalHours += rowTotal;
      } else {
        employeeMap.set(row.employeeName, { name: row.employeeName, role: row.role, totalHours: rowTotal, rateCard: row.rateCard });
      }
    }

    const employees = Array.from(employeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);
    const totalHours = MONTHS.reduce((s, m) => s + monthlyHours[m], 0);

    let estimatedRevenue = 0;
    for (const row of rows) {
      if (row.rateCard) {
        const hrs = MONTHS.reduce((s, m) => s + row.monthlyTotals[m], 0);
        estimatedRevenue += hrs * row.rateCard;
      }
    }

    result.push({ name: projectName, employees, monthlyHours, totalHours, estimatedRevenue });
  }

  return result.sort((a, b) => b.totalHours - a.totalHours);
}
