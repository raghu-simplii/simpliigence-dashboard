/**
 * Smart Query Engine — parses natural-language questions about team capacity,
 * utilization, hiring needs, project allocation, and loaded cost, then computes
 * answers from the forecast store data. Runs entirely client-side.
 */
import type { ForecastAssignment, Month, EmployeeSummary, ProjectSummary } from '../types/forecast';
import { deriveEmployeeSummaries, deriveProjectSummaries } from './parseSpreadsheet';

// ── Constants ────────────────────────────────────────────
const FULL_CAPACITY_PER_MONTH = 160; // hours

const MONTH_MAP: Record<string, Month> = {
  jan: 'Jan', january: 'Jan',
  feb: 'Feb', february: 'Feb',
  mar: 'Mar', march: 'Mar',
  apr: 'Apr', april: 'Apr',
  may: 'May',
  jun: 'Jun', june: 'Jun',
  jul: 'Jul', july: 'Jul',
  aug: 'Aug', august: 'Aug',
  sep: 'Sep', september: 'Sep',
  oct: 'Oct', october: 'Oct',
  nov: 'Nov', november: 'Nov',
  dec: 'Dec', december: 'Dec',
};

const QUARTER_MAP: Record<string, Month[]> = {
  q1: ['Jan', 'Feb', 'Mar'],
  q2: ['Apr', 'May', 'Jun'],
  q3: ['Jul', 'Aug', 'Sep'],
  q4: ['Oct', 'Nov', 'Dec'],
};

const ROLE_KEYWORDS: Record<string, string[]> = {
  ba: ['ba', 'business analyst', 'analyst'],
  dev: ['dev', 'developer', 'salesforce developer', 'senior developer', 'sr dev'],
  consultant: ['consultant', 'salesforce consultant'],
  contractor: ['contractor'],
  lead: ['lead', 'manager', 'team lead'],
};

// ── Helpers ──────────────────────────────────────────────

function extractMonths(query: string): Month[] {
  const lower = query.toLowerCase();
  const found: Month[] = [];

  // Check quarters first
  for (const [q, months] of Object.entries(QUARTER_MAP)) {
    if (lower.includes(q)) return months;
  }

  // Check month names
  for (const [key, month] of Object.entries(MONTH_MAP)) {
    // Use word boundary to avoid partial matches
    const re = new RegExp(`\\b${key}\\b`, 'i');
    if (re.test(lower) && !found.includes(month)) {
      found.push(month);
    }
  }

  return found;
}

function extractRole(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return role;
    }
  }
  return null;
}

function matchesRole(employee: EmployeeSummary, roleKey: string): boolean {
  const r = employee.role.toLowerCase();
  const keywords = ROLE_KEYWORDS[roleKey] || [];
  return keywords.some((kw) => r.includes(kw));
}

function extractProject(query: string, projects: ProjectSummary[]): string | null {
  const lower = query.toLowerCase();
  for (const p of projects) {
    if (lower.includes(p.name.toLowerCase())) return p.name;
  }
  return null;
}

function hoursInMonths(emp: EmployeeSummary, months: Month[]): number {
  return months.reduce((s, m) => s + emp.monthlyHours[m], 0);
}

function capacityInMonths(months: Month[]): number {
  return months.length * FULL_CAPACITY_PER_MONTH;
}

function utilizationPct(hours: number, capacity: number): number {
  return capacity > 0 ? Math.round((hours / capacity) * 100) : 0;
}

function formatHours(h: number): string {
  return Math.round(h).toLocaleString();
}

// ── Intent detection ─────────────────────────────────────

type Intent =
  | 'capacity'
  | 'utilization'
  | 'overloaded'
  | 'hiring'
  | 'project_team'
  | 'project_hours'
  | 'loaded_cost'
  | 'top_employees'
  | 'employee_info'
  | 'summary'
  | 'unknown';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();

  if (/(overload|over-load|over allocated|overworked|over-worked|overbooked|over-booked|stretched thin)/.test(q)) return 'overloaded';
  if (/(capacity|free |available|\bbench\b|\bidle\b|spare|bandwidth)/.test(q)) return 'capacity';
  if (/(utiliz|usage|\bbusy\b|occupied|workload)/.test(q)) return 'utilization';
  if (/(hire|hiring|recruit|need.*more|short(age)?|gap|staffing)/.test(q)) return 'hiring';
  if (/who.*(work|assign|allocat).*(on|to|for)/.test(q)) return 'project_team';
  if (/(project|which project|most hours|biggest).*(hour|time|effort)/.test(q)) return 'project_hours';
  if (/(revenue|earn|billing|cost|money|dollar)/.test(q)) return 'loaded_cost';
  if (/(top|best|highest|most).*(employee|person|people|resource)/.test(q)) return 'top_employees';
  if (/(tell me about|info on|details|profile)/.test(q)) return 'employee_info';
  if (/(summary|overview|snapshot|status|how are we)/.test(q)) return 'summary';

  // Fallback: if mentions a project name, treat as project_team
  return 'unknown';
}

// ── Query result ─────────────────────────────────────────

export interface QueryResult {
  answer: string;
  data?: Array<Record<string, string | number>>;
  columns?: string[];
}

// ── Main query function ──────────────────────────────────

export function runQuery(
  query: string,
  assignments: ForecastAssignment[],
): QueryResult {
  if (!query.trim()) {
    return { answer: 'Ask me anything about your team capacity, utilization, hiring needs, or project allocation.' };
  }

  const employees = deriveEmployeeSummaries(assignments);
  const projects = deriveProjectSummaries(assignments);
  const intent = detectIntent(query);
  const months = extractMonths(query);
  const roleKey = extractRole(query);
  const targetMonths = months.length > 0 ? months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as Month[];
  const periodLabel = months.length > 0
    ? months.length > 3
      ? Object.entries(QUARTER_MAP).find(([, ms]) => JSON.stringify(ms) === JSON.stringify(months))?.[0]?.toUpperCase() || months.join(', ')
      : months.join(', ')
    : 'H1 2026';

  switch (intent) {
    case 'capacity':
      return handleCapacity(employees, targetMonths, periodLabel, roleKey);
    case 'overloaded':
      return handleOverloaded(employees, targetMonths, periodLabel, roleKey);
    case 'utilization':
      return handleUtilization(employees, targetMonths, periodLabel, roleKey);
    case 'hiring':
      return handleHiring(employees, assignments, targetMonths, periodLabel, roleKey);
    case 'project_team':
      return handleProjectTeam(query, projects, employees);
    case 'project_hours':
      return handleProjectHours(projects, targetMonths, periodLabel);
    case 'loaded_cost':
      return handleLoadedCost(projects, targetMonths, periodLabel);
    case 'top_employees':
      return handleTopEmployees(employees, targetMonths, periodLabel);
    case 'summary':
      return handleSummary(employees, projects, targetMonths, periodLabel);
    default:
      // Try project name match
      const projName = extractProject(query, projects);
      if (projName) return handleProjectTeam(query, projects, employees);
      // Try employee name match
      const empMatch = findEmployee(query, employees);
      if (empMatch) return handleEmployeeInfo(empMatch, targetMonths, periodLabel);
      return handleFallback(employees, projects);
  }
}

// ── Intent handlers ──────────────────────────────────────

function handleCapacity(
  employees: EmployeeSummary[],
  months: Month[],
  periodLabel: string,
  roleKey: string | null,
): QueryResult {
  let pool = employees;
  if (roleKey) pool = pool.filter((e) => matchesRole(e, roleKey));

  const cap = capacityInMonths(months);
  const results = pool
    .map((e) => {
      const hours = hoursInMonths(e, months);
      const available = cap - hours;
      const util = utilizationPct(hours, cap);
      return { name: e.name, role: e.role, allocated: hours, available, util };
    })
    .filter((r) => r.available > 0)
    .sort((a, b) => b.available - a.available);

  if (results.length === 0) {
    return { answer: `No ${roleKey ? ROLE_KEYWORDS[roleKey]?.[0] + 's' : 'resources'} have spare capacity in ${periodLabel}. Everyone is fully allocated.` };
  }

  const roleLabel = roleKey ? ROLE_KEYWORDS[roleKey]?.[0] + 's' : 'resources';
  const data = results.map((r) => ({
    Name: r.name,
    Role: r.role,
    'Allocated Hrs': r.allocated,
    'Available Hrs': r.available,
    'Utilization %': r.util + '%',
  }));

  return {
    answer: `**${results.length} ${roleLabel}** have capacity in **${periodLabel}** (based on ${FULL_CAPACITY_PER_MONTH}hrs/month):\n\nTop available: **${results[0].name}** with ${formatHours(results[0].available)} hours free (${results[0].util}% utilized).`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Name', 'Role', 'Allocated Hrs', 'Available Hrs', 'Utilization %'],
  };
}

function handleOverloaded(
  employees: EmployeeSummary[],
  months: Month[],
  periodLabel: string,
  roleKey: string | null,
): QueryResult {
  let pool = employees;
  if (roleKey) pool = pool.filter((e) => matchesRole(e, roleKey));

  const cap = capacityInMonths(months);
  const results = pool
    .map((e) => {
      const hours = hoursInMonths(e, months);
      const over = hours - cap;
      const util = utilizationPct(hours, cap);
      return { name: e.name, role: e.role, allocated: hours, over, util };
    })
    .filter((r) => r.util > 90)
    .sort((a, b) => b.util - a.util);

  if (results.length === 0) {
    return { answer: `No one appears overloaded in ${periodLabel}. All resources are at or below 90% utilization.` };
  }

  const data = results.map((r) => ({
    Name: r.name,
    Role: r.role,
    'Allocated Hrs': r.allocated,
    'Over by': Math.max(r.over, 0),
    'Utilization %': r.util + '%',
  }));

  return {
    answer: `**${results.length} resources** are at >90% utilization in **${periodLabel}**:\n\nMost stretched: **${results[0].name}** at ${results[0].util}% (${formatHours(results[0].allocated)} hrs allocated vs ${formatHours(cap)} capacity).`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Name', 'Role', 'Allocated Hrs', 'Over by', 'Utilization %'],
  };
}

function handleUtilization(
  employees: EmployeeSummary[],
  months: Month[],
  periodLabel: string,
  roleKey: string | null,
): QueryResult {
  let pool = employees;
  if (roleKey) pool = pool.filter((e) => matchesRole(e, roleKey));

  const cap = capacityInMonths(months);
  const results = pool
    .map((e) => {
      const hours = hoursInMonths(e, months);
      const util = utilizationPct(hours, cap);
      return { name: e.name, role: e.role, hours, util };
    })
    .sort((a, b) => b.util - a.util);

  const avgUtil = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.util, 0) / results.length)
    : 0;

  const high = results.filter((r) => r.util > 90).length;
  const low = results.filter((r) => r.util < 50).length;

  const data = results.map((r) => ({
    Name: r.name,
    Role: r.role,
    Hours: r.hours,
    'Utilization %': r.util + '%',
  }));

  return {
    answer: `**Utilization report for ${periodLabel}** (${FULL_CAPACITY_PER_MONTH}hrs/month capacity):\n\n- Average utilization: **${avgUtil}%**\n- Over 90% (stretched): **${high}** people\n- Under 50% (underutilized): **${low}** people`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Name', 'Role', 'Hours', 'Utilization %'],
  };
}

function handleHiring(
  employees: EmployeeSummary[],
  _assignments: ForecastAssignment[],
  months: Month[],
  periodLabel: string,
  roleKey: string | null,
): QueryResult {
  // Group by role category
  const roleGroups = new Map<string, EmployeeSummary[]>();
  for (const e of employees) {
    const role = e.role || 'Unspecified';
    const arr = roleGroups.get(role) ?? [];
    arr.push(e);
    roleGroups.set(role, arr);
  }

  const cap = capacityInMonths(months);

  type RoleStat = { role: string; headcount: number; totalHours: number; totalCapacity: number; avgUtil: number; spareHours: number; hiresNeeded: number };
  const roleStats: RoleStat[] = [];

  for (const [role, group] of roleGroups) {
    if (roleKey && !ROLE_KEYWORDS[roleKey]?.some((kw) => role.toLowerCase().includes(kw))) continue;

    const totalHours = group.reduce((s, e) => s + hoursInMonths(e, months), 0);
    const totalCapacity = group.length * cap;
    const avgUtil = utilizationPct(totalHours, totalCapacity);
    const spareHours = totalCapacity - totalHours;

    // Hiring needed if avg util > 85% (targeting 80% utilization)
    let hiresNeeded = 0;
    if (avgUtil > 85) {
      const gap = totalHours - totalCapacity * 0.8;
      hiresNeeded = Math.ceil(gap / (cap * 0.8));
    }

    roleStats.push({ role, headcount: group.length, totalHours, totalCapacity, avgUtil, spareHours, hiresNeeded });
  }

  roleStats.sort((a, b) => b.avgUtil - a.avgUtil);

  const totalHires = roleStats.reduce((s, r) => s + r.hiresNeeded, 0);
  const rolesNeedingHires = roleStats.filter((r) => r.hiresNeeded > 0);

  const data = roleStats.map((r) => ({
    Role: r.role,
    Headcount: r.headcount,
    'Allocated Hrs': r.totalHours,
    'Capacity Hrs': r.totalCapacity,
    'Spare Hrs': r.spareHours,
    'Avg Util': r.avgUtil + '%',
    'Hires Needed': r.hiresNeeded > 0 ? r.hiresNeeded : '—',
  }));

  let answer: string;
  if (totalHires > 0) {
    const lines = rolesNeedingHires.map(
      (r) => `- **${r.role}**: ${r.hiresNeeded} hire${r.hiresNeeded > 1 ? 's' : ''} needed (${r.avgUtil}% utilized, ${r.headcount} current)`,
    );
    answer = `**Hiring recommendation for ${periodLabel}** (target: 80% utilization):\n\nTotal hires needed: **${totalHires}**\n\n${lines.join('\n')}`;
  } else {
    const roleLabel = roleKey ? ROLE_KEYWORDS[roleKey]?.[0] + 's' : 'roles';
    const totalSpare = roleStats.reduce((s, r) => s + r.spareHours, 0);
    const avgUtil = roleStats.length > 0 ? Math.round(roleStats.reduce((s, r) => s + r.avgUtil, 0) / roleStats.length) : 0;
    answer = `**No immediate hiring needed for ${roleLabel} in ${periodLabel}.**\n\n` +
      `Current team: **${roleStats.reduce((s, r) => s + r.headcount, 0)}** people, avg utilization **${avgUtil}%**, ` +
      `with **${formatHours(totalSpare)} spare hours** available.\n\n` +
      `Below is the breakdown by role — consider hiring if new projects are expected:`;
  }

  return {
    answer,
    data: data as Array<Record<string, string | number>>,
    columns: ['Role', 'Headcount', 'Allocated Hrs', 'Capacity Hrs', 'Spare Hrs', 'Avg Util', 'Hires Needed'],
  };
}

function handleProjectTeam(
  query: string,
  projects: ProjectSummary[],
  _employees: EmployeeSummary[],
): QueryResult {
  const projName = extractProject(query, projects);
  if (!projName) {
    // List all projects with team size
    const data = projects.map((p) => ({
      Project: p.name,
      'Team Size': p.employees.length,
      'Total Hours': p.totalHours,
      'Loaded Cost': '$' + Math.round(p.loadedCost).toLocaleString(),
    }));
    return {
      answer: `Here are all **${projects.length} projects** and their team allocation:`,
      data: data as Array<Record<string, string | number>>,
      columns: ['Project', 'Team Size', 'Total Hours', 'Loaded Cost'],
    };
  }

  const proj = projects.find((p) => p.name.toLowerCase() === projName.toLowerCase());
  if (!proj) return { answer: `Project "${projName}" not found.` };

  const data = proj.employees.map((e) => ({
    Name: e.name,
    Role: e.role || '—',
    'Total Hours': e.totalHours,
    Rate: e.rateCard ? '$' + e.rateCard + '/hr' : '—',
  }));

  return {
    answer: `**${proj.name}** has **${proj.employees.length} team members** allocated, totaling **${formatHours(proj.totalHours)} hours** (loaded cost: $${Math.round(proj.loadedCost).toLocaleString()}):`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Name', 'Role', 'Total Hours', 'Rate'],
  };
}

function handleProjectHours(
  projects: ProjectSummary[],
  months: Month[],
  periodLabel: string,
): QueryResult {
  const results = projects
    .map((p) => {
      const hours = months.reduce((s, m) => s + p.monthlyHours[m], 0);
      return { name: p.name, hours, team: p.employees.length, cost: p.loadedCost };
    })
    .sort((a, b) => b.hours - a.hours);

  const data = results.map((r) => ({
    Project: r.name,
    [`Hours (${periodLabel})`]: r.hours,
    'Team Size': r.team,
    'Loaded Cost': '$' + Math.round(r.cost).toLocaleString(),
  }));

  return {
    answer: `**Project hours for ${periodLabel}**:\n\nBiggest project: **${results[0]?.name}** with ${formatHours(results[0]?.hours || 0)} hours.`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Project', `Hours (${periodLabel})`, 'Team Size', 'Loaded Cost'],
  };
}

function handleLoadedCost(
  projects: ProjectSummary[],
  _months: Month[],
  _periodLabel: string,
): QueryResult {
  const sorted = [...projects].sort((a, b) => b.loadedCost - a.loadedCost);
  const totalRev = sorted.reduce((s, p) => s + p.loadedCost, 0);

  const data = sorted.map((p) => ({
    Project: p.name,
    'Loaded Cost': '$' + Math.round(p.loadedCost).toLocaleString(),
    'Total Hours': p.totalHours,
    'Team Size': p.employees.length,
  }));

  return {
    answer: `**Total loaded cost: $${Math.round(totalRev).toLocaleString()}**\n\nHighest cost: **${sorted[0]?.name}** at $${Math.round(sorted[0]?.loadedCost || 0).toLocaleString()}.`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Project', 'Loaded Cost', 'Total Hours', 'Team Size'],
  };
}

function handleTopEmployees(
  employees: EmployeeSummary[],
  months: Month[],
  periodLabel: string,
): QueryResult {
  const results = employees
    .map((e) => ({ name: e.name, role: e.role, hours: hoursInMonths(e, months), projects: e.projects.length }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const data = results.map((r) => ({
    Name: r.name,
    Role: r.role,
    Hours: r.hours,
    Projects: r.projects,
  }));

  return {
    answer: `**Top 10 most allocated resources for ${periodLabel}**:`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Name', 'Role', 'Hours', 'Projects'],
  };
}

function handleSummary(
  employees: EmployeeSummary[],
  projects: ProjectSummary[],
  months: Month[],
  periodLabel: string,
): QueryResult {
  const cap = capacityInMonths(months);
  const totalHours = employees.reduce((s, e) => s + hoursInMonths(e, months), 0);
  const totalCapacity = employees.length * cap;
  const avgUtil = utilizationPct(totalHours, totalCapacity);
  const totalRev = projects.reduce((s, p) => s + p.loadedCost, 0);
  const overloaded = employees.filter((e) => utilizationPct(hoursInMonths(e, months), cap) > 90).length;
  const underutil = employees.filter((e) => utilizationPct(hoursInMonths(e, months), cap) < 50).length;

  return {
    answer: `**Team Summary for ${periodLabel}**\n\n` +
      `- **${employees.length}** team members across **${projects.length}** projects\n` +
      `- **${formatHours(totalHours)}** total hours allocated (${formatHours(totalCapacity)} capacity)\n` +
      `- Average utilization: **${avgUtil}%**\n` +
      `- Stretched (>90%): **${overloaded}** people\n` +
      `- Underutilized (<50%): **${underutil}** people\n` +
      `- Loaded cost: **$${Math.round(totalRev).toLocaleString()}**`,
  };
}

function findEmployee(query: string, employees: EmployeeSummary[]): EmployeeSummary | null {
  const lower = query.toLowerCase();
  // Try to find an employee name in the query
  for (const e of employees) {
    const nameLower = e.name.toLowerCase();
    const firstName = nameLower.split(' ')[0];
    if (lower.includes(nameLower) || lower.includes(firstName)) return e;
  }
  return null;
}

function handleEmployeeInfo(
  emp: EmployeeSummary,
  months: Month[],
  periodLabel: string,
): QueryResult {
  const cap = capacityInMonths(months);
  const hours = hoursInMonths(emp, months);
  const util = utilizationPct(hours, cap);

  return {
    answer: `**${emp.name}** — ${emp.role || 'No role'}\n\n` +
      `- Type: ${emp.isSI ? 'SI Employee' : ''}${emp.isContractor ? 'Contractor' : ''}${!emp.isSI && !emp.isContractor ? 'Unspecified' : ''}\n` +
      `- Rate: ${emp.rateCard ? '$' + emp.rateCard + '/hr' : 'Not set'}\n` +
      `- Projects (${emp.projects.length}): ${emp.projects.join(', ')}\n` +
      `- Hours in ${periodLabel}: **${formatHours(hours)}** / ${formatHours(cap)} capacity (**${util}%** utilized)\n` +
      `- Total annual hours: **${formatHours(emp.totalHours)}**`,
  };
}

function handleFallback(_employees: EmployeeSummary[], _projects: ProjectSummary[]): QueryResult {
  return {
    answer: `I couldn't understand that query. Try asking about:\n\n` +
      `- **Capacity**: "Which BA has capacity in May?"\n` +
      `- **Utilization**: "Show utilization for Q2"\n` +
      `- **Overloaded**: "Who is overloaded in April?"\n` +
      `- **Hiring**: "How many developers should we hire in Q2?"\n` +
      `- **Projects**: "Who is working on CoolAir?"\n` +
      `- **Loaded Cost**: "Loaded cost for Q2"\n` +
      `- **People**: "Tell me about Anupama"\n` +
      `- **Summary**: "Give me a summary for March"`,
  };
}

// ── Suggested queries ────────────────────────────────────

export const SUGGESTED_QUERIES = [
  'Which BA has capacity in May?',
  'Who is overloaded in April?',
  'How many developers should we hire in Q2?',
  'Show utilization for Q2',
  'Who is working on CoolAir?',
  'Which project has the most hours?',
  'Loaded cost for Q2',
  'Give me a team summary for March',
];
