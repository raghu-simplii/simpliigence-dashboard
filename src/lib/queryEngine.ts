/**
 * Smart Query Engine — parses natural-language questions about team capacity,
 * utilization, hiring needs, project allocation, and revenue, then computes
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
      const re = new RegExp(`\\b${kw}\\b`, 'i');
      if (re.test(lower)) return role;
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
  | 'revenue'
  | 'top_employees'
  | 'employee_info'
  | 'summary'
  | 'unknown';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();

  if (/\b(capacity|free|available|bench|idle|spare)\b/.test(q)) return 'capacity';
  if (/\b(over\s?load|over\s?allocated|over\s?worked|over\s?booked|stretched)\b/.test(q)) return 'overloaded';
  if (/\b(utiliz|usage|busy|occupied|loaded)\b/.test(q)) return 'utilization';
  if (/\b(hire|hiring|recruit|need.*more|short|gap|staffing)\b/.test(q)) return 'hiring';
  if (/\bwho.*(work|assign|allocat).*(on|to)\b/.test(q)) return 'project_team';
  if (/\b(project|which project|most hours|biggest)\b/.test(q) && /\b(hour|time|effort)\b/.test(q)) return 'project_hours';
  if (/\b(revenue|earn|billing|cost|money|dollar)\b/.test(q)) return 'revenue';
  if (/\b(top|best|highest|most)\b/.test(q) && /\b(employee|person|people|resource)\b/.test(q)) return 'top_employees';
  if (/\b(tell me about|info|details|profile)\b/.test(q)) return 'employee_info';
  if (/\b(summary|overview|snapshot|status)\b/.test(q)) return 'summary';

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
    case 'revenue':
      return handleRevenue(projects, targetMonths, periodLabel);
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
  const recommendations: Array<{ role: string; count: number; avgUtil: number; totalGap: number }> = [];

  for (const [role, group] of roleGroups) {
    if (roleKey && !ROLE_KEYWORDS[roleKey]?.some((kw) => role.toLowerCase().includes(kw))) continue;

    const totalHours = group.reduce((s, e) => s + hoursInMonths(e, months), 0);
    const totalCapacity = group.length * cap;
    const avgUtil = utilizationPct(totalHours, totalCapacity);

    if (avgUtil > 85) {
      const gap = totalHours - totalCapacity * 0.8; // target 80% utilization
      const hiresNeeded = Math.ceil(gap / (cap * 0.8));
      if (hiresNeeded > 0) {
        recommendations.push({ role, count: hiresNeeded, avgUtil, totalGap: gap });
      }
    }
  }

  recommendations.sort((a, b) => b.totalGap - a.totalGap);

  if (recommendations.length === 0) {
    return { answer: `Based on current forecasts for **${periodLabel}**, no roles are above 85% average utilization. No immediate hiring needed, but monitor as new projects come in.` };
  }

  const totalHires = recommendations.reduce((s, r) => s + r.count, 0);
  const lines = recommendations.map(
    (r) => `- **${r.role}**: ${r.count} hire${r.count > 1 ? 's' : ''} recommended (team avg ${r.avgUtil}% utilized)`,
  );

  const data = recommendations.map((r) => ({
    Role: r.role,
    'Current Avg Util': r.avgUtil + '%',
    'Recommended Hires': r.count,
    'Capacity Gap (hrs)': Math.round(r.totalGap),
  }));

  return {
    answer: `**Hiring recommendation for ${periodLabel}** (targeting 80% utilization):\n\nTotal recommended: **${totalHires} hire${totalHires > 1 ? 's' : ''}**\n\n${lines.join('\n')}`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Role', 'Current Avg Util', 'Recommended Hires', 'Capacity Gap (hrs)'],
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
      'Est. Revenue': '$' + Math.round(p.estimatedRevenue).toLocaleString(),
    }));
    return {
      answer: `Here are all **${projects.length} projects** and their team allocation:`,
      data: data as Array<Record<string, string | number>>,
      columns: ['Project', 'Team Size', 'Total Hours', 'Est. Revenue'],
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
    answer: `**${proj.name}** has **${proj.employees.length} team members** allocated, totaling **${formatHours(proj.totalHours)} hours** (est. revenue: $${Math.round(proj.estimatedRevenue).toLocaleString()}):`,
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
      return { name: p.name, hours, team: p.employees.length, revenue: p.estimatedRevenue };
    })
    .sort((a, b) => b.hours - a.hours);

  const data = results.map((r) => ({
    Project: r.name,
    [`Hours (${periodLabel})`]: r.hours,
    'Team Size': r.team,
    'Est. Revenue': '$' + Math.round(r.revenue).toLocaleString(),
  }));

  return {
    answer: `**Project hours for ${periodLabel}**:\n\nBiggest project: **${results[0]?.name}** with ${formatHours(results[0]?.hours || 0)} hours.`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Project', `Hours (${periodLabel})`, 'Team Size', 'Est. Revenue'],
  };
}

function handleRevenue(
  projects: ProjectSummary[],
  _months: Month[],
  _periodLabel: string,
): QueryResult {
  const sorted = [...projects].sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  const totalRev = sorted.reduce((s, p) => s + p.estimatedRevenue, 0);

  const data = sorted.map((p) => ({
    Project: p.name,
    'Est. Revenue': '$' + Math.round(p.estimatedRevenue).toLocaleString(),
    'Total Hours': p.totalHours,
    'Team Size': p.employees.length,
  }));

  return {
    answer: `**Total estimated revenue: $${Math.round(totalRev).toLocaleString()}**\n\nTop earner: **${sorted[0]?.name}** at $${Math.round(sorted[0]?.estimatedRevenue || 0).toLocaleString()}.`,
    data: data as Array<Record<string, string | number>>,
    columns: ['Project', 'Est. Revenue', 'Total Hours', 'Team Size'],
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
  const totalRev = projects.reduce((s, p) => s + p.estimatedRevenue, 0);
  const overloaded = employees.filter((e) => utilizationPct(hoursInMonths(e, months), cap) > 90).length;
  const underutil = employees.filter((e) => utilizationPct(hoursInMonths(e, months), cap) < 50).length;

  return {
    answer: `**Team Summary for ${periodLabel}**\n\n` +
      `- **${employees.length}** team members across **${projects.length}** projects\n` +
      `- **${formatHours(totalHours)}** total hours allocated (${formatHours(totalCapacity)} capacity)\n` +
      `- Average utilization: **${avgUtil}%**\n` +
      `- Stretched (>90%): **${overloaded}** people\n` +
      `- Underutilized (<50%): **${underutil}** people\n` +
      `- Estimated revenue: **$${Math.round(totalRev).toLocaleString()}**`,
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
      `- **Revenue**: "Estimated revenue for Q2"\n` +
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
  'Estimated revenue for Q2',
  'Give me a team summary for March',
];
