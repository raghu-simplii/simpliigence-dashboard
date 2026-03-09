/**
 * Parse the "Forecasting Hrs" sheet from an Excel workbook and transform
 * the rows into TeamMember[] and Project[] for the Zustand stores.
 *
 * Spreadsheet layout (verified from "List of all Employees (1).xlsx"):
 *   Row 1: Headers — A=Employee Name, B=Notes, C=Role, D=Rate Card,
 *          E=SI Employee?, F=Contractor, G=Active Projects,
 *          H+=weekly date columns (Excel date serial numbers)
 *   Rows 2+: Data — one row per employee-project combination.
 *          Employees on multiple projects appear in multiple rows.
 */
import type { TeamMember, Role, Seniority } from '../types/team';
import type { Project, ProjectType, ProjectStatus } from '../types/project';
import { nanoid } from 'nanoid';

// ── Raw row extracted from the spreadsheet ─────────────────────

export interface SpreadsheetRow {
  employeeName: string;
  notes: string;
  roleText: string;
  rateUSD: number;
  isContractor: boolean;
  projectName: string;
  weeklyHours: number;
}

// ── Column indices (0-based) ───────────────────────────────────

const COL_NAME = 0;
const COL_NOTES = 1;
const COL_ROLE = 2;
const COL_RATE = 3;
// COL_SI = 4  (not used beyond filtering)
const COL_CONTRACTOR = 5;
const COL_PROJECT = 6;
const FIRST_DATE_COL = 7; // Column H onward = weekly dates

// ── Helpers ────────────────────────────────────────────────────

/** Strip trailing asterisks and extra whitespace from employee names */
function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\*+$/, '').trim();
}

/** Safely read a number cell (could be number, string, or null) */
function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Check if a value looks like a boolean TRUE */
function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  if (typeof val === 'number') return val === 1;
  return false;
}

/**
 * Detect which column index has the "latest" date that is ≤ today.
 * SheetJS parses date cells as JS Date objects (when cellDates is true)
 * or as Excel serial numbers (when not).
 */
function findLatestWeekColumn(headerRow: unknown[]): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // include all of today

  let bestCol = -1;
  let bestDate = new Date(0);

  for (let c = FIRST_DATE_COL; c < headerRow.length; c++) {
    const val = headerRow[c];
    let d: Date | null = null;

    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'number' && val > 40000 && val < 60000) {
      // Excel serial date → JS Date (epoch = 1900-01-01, with Excel's leap-year bug)
      d = new Date((val - 25569) * 86400000);
    } else if (typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) d = parsed;
    }

    if (d && d <= now && d > bestDate) {
      bestDate = d;
      bestCol = c;
    }
  }

  // Fallback: if no date columns found ≤ today, use the last populated column
  if (bestCol === -1) {
    for (let c = headerRow.length - 1; c >= FIRST_DATE_COL; c--) {
      if (headerRow[c] != null) { bestCol = c; break; }
    }
  }

  return bestCol;
}

// ── Role / Seniority mapping ───────────────────────────────────

function inferRole(roleText: string): Role {
  const lower = roleText.toLowerCase();
  if (lower.includes('business analyst')) return 'business_analyst';
  if (lower.includes('team lead') || lower.includes('manager')) return 'technical_lead';
  if (lower.includes('architect')) return 'architect';
  if (lower.includes('us resource') || lower.includes('project manager')) return 'project_manager';
  // Salesforce Developer, Senior Salesforce Developer, Salesforce Consultant, Contractor
  return 'salesforce_developer';
}

function inferSeniority(roleText: string): Seniority {
  const lower = roleText.toLowerCase();
  if (lower.includes('junior')) return 'associate';
  if (lower.includes('senior') || lower.includes(' sr')) return 'senior';
  if (lower.includes('team lead') || lower.includes('us resource') || lower.includes('manager')) return 'principal';
  if (lower.includes('consultant')) return 'consultant';
  return 'consultant'; // default
}

// ── Main parse function ────────────────────────────────────────

export async function parseForcastingSheet(
  buffer: ArrayBuffer,
  sheetName: string = 'Forecasting Hrs'
): Promise<SpreadsheetRow[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${available}`);
  }

  // Convert to array-of-arrays (row 0 = headers, row 1+ = data)
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (raw.length < 2) throw new Error('Spreadsheet has no data rows.');

  const headerRow = raw[0];
  const weekCol = findLatestWeekColumn(headerRow);
  if (weekCol < 0) throw new Error('Could not find any weekly date columns in the header row.');

  const rows: SpreadsheetRow[] = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.length === 0) continue;

    const name = cleanName(row[COL_NAME]);
    if (!name) continue; // skip blank rows

    const projectName = typeof row[COL_PROJECT] === 'string' ? row[COL_PROJECT].trim() : '';
    const roleText = typeof row[COL_ROLE] === 'string' ? row[COL_ROLE].trim() : '';
    const rateUSD = toNumber(row[COL_RATE]);
    const isContractor = toBool(row[COL_CONTRACTOR]);
    const weeklyHours = toNumber(row[weekCol]);
    const notes = typeof row[COL_NOTES] === 'string' ? row[COL_NOTES].trim() : '';

    rows.push({ employeeName: name, notes, roleText, rateUSD, isContractor, projectName, weeklyHours });
  }

  return rows;
}

// ── Transform to app models ────────────────────────────────────

const HRS_PER_MONTH = 160;

export function transformToModels(
  rows: SpreadsheetRow[],
  existingMembers: TeamMember[],
  existingProjects: Project[],
  exchangeRate: number = 83.5,
): { members: TeamMember[]; projects: Project[] } {
  const ts = new Date().toISOString();
  const today = ts.split('T')[0];

  // ── 1. Collect unique projects ───────────────────────────────
  const projectNames = new Set<string>();
  for (const row of rows) {
    if (row.projectName) projectNames.add(row.projectName);
  }

  // Build project lookup: match by name (case-insensitive)
  const existingProjectMap = new Map<string, Project>();
  for (const p of existingProjects) {
    existingProjectMap.set(p.name.toLowerCase(), p);
  }

  const projectIdMap = new Map<string, string>(); // projectName → id
  const projects: Project[] = [];

  for (const name of projectNames) {
    const existing = existingProjectMap.get(name.toLowerCase());
    if (existing) {
      projects.push(existing);
      projectIdMap.set(name, existing.id);
    } else {
      const id = nanoid();
      projectIdMap.set(name, id);
      projects.push({
        id,
        name,
        clientName: name,
        type: 'tm_ongoing' as ProjectType,
        status: 'active' as ProjectStatus,
        startDate: today,
        endDate: null,
        staffingRequirements: [],
        notes: '',
        contractValue: null,
        monthlyBudget: null,
        billingType: 'monthly',
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  // Also keep any existing projects NOT in the spreadsheet
  for (const p of existingProjects) {
    if (!projectNames.has(p.name) && !projects.find((pp) => pp.id === p.id)) {
      projects.push(p);
    }
  }

  // ── 2. Group rows by employee name ───────────────────────────
  const groups = new Map<string, SpreadsheetRow[]>();
  for (const row of rows) {
    const key = row.employeeName.toLowerCase();
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  // Build existing member lookup
  const existingMemberMap = new Map<string, TeamMember>();
  for (const m of existingMembers) {
    existingMemberMap.set(m.name.toLowerCase().replace(/\*+$/, '').trim(), m);
  }

  const members: TeamMember[] = [];
  const processedNames = new Set<string>();

  for (const [key, empRows] of groups) {
    processedNames.add(key);

    // Aggregate hours across all projects
    let totalHours = 0;
    let bestProject = '';
    let bestHours = -1;
    let rateUSD = 0;
    let roleText = '';
    let isContractor = false;
    let notes = '';

    for (const row of empRows) {
      totalHours += row.weeklyHours;
      if (row.weeklyHours > bestHours) {
        bestHours = row.weeklyHours;
        bestProject = row.projectName;
      }
      // Take rate/role from the first row that has them
      if (row.rateUSD > 0 && rateUSD === 0) rateUSD = row.rateUSD;
      if (row.roleText && !roleText) roleText = row.roleText;
      if (row.isContractor) isContractor = true;
      if (row.notes && !notes) notes = row.notes;
    }

    const utilizationPercent = Math.min(100, Math.round((totalHours / 40) * 100));
    const billingMonthly = rateUSD > 0 ? Math.round(rateUSD * HRS_PER_MONTH * exchangeRate) : null;
    const status = totalHours === 0 ? 'bench' as const : 'deployed' as const;
    const primaryProjectId = bestProject ? (projectIdMap.get(bestProject) ?? null) : null;

    // Check if this employee already exists
    const existing = existingMemberMap.get(key);
    if (existing) {
      // Preserve: id, role, seniority, specializations, email, notes (if set), ctcMonthly
      // Update: billingRateMonthly, utilizationPercent, status, currentProjectId
      members.push({
        ...existing,
        billingRateMonthly: billingMonthly ?? existing.billingRateMonthly,
        utilizationPercent,
        status,
        currentProjectId: primaryProjectId,
        availableFrom: status === 'bench' ? today : existing.availableFrom,
        benchSince: status === 'bench' ? (existing.benchSince ?? today) : null,
        notes: notes || existing.notes,
        updatedAt: ts,
      });
    } else {
      // New employee — infer role/seniority from spreadsheet
      members.push({
        id: nanoid(),
        name: empRows[0].employeeName,
        email: '',
        role: roleText ? inferRole(roleText) : 'salesforce_developer',
        seniority: roleText ? inferSeniority(roleText) : 'consultant',
        specializations: [],
        status,
        currentProjectId: primaryProjectId,
        availableFrom: status === 'bench' ? today : null,
        benchSince: status === 'bench' ? today : null,
        notes: isContractor ? `Contractor. ${notes}`.trim() : notes,
        ctcMonthly: null,
        billingRateMonthly: billingMonthly,
        utilizationPercent,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  // Keep existing members NOT in spreadsheet (don't delete them)
  for (const m of existingMembers) {
    const key = m.name.toLowerCase().replace(/\*+$/, '').trim();
    if (!processedNames.has(key)) {
      members.push(m);
    }
  }

  return { members, projects };
}
