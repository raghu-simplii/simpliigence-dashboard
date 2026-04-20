/**
 * Claude-powered Smart Query Engine.
 *
 * Sends the team's forecast data + the user's question to Claude and returns a
 * structured QueryResult (markdown answer, optional table).
 *
 * Key design decisions:
 *   - Model: claude-opus-4-7 (strongest reasoning on arithmetic-heavy data)
 *   - Adaptive thinking: Claude silently "shows its work" before answering,
 *     eliminating the math errors we used to see when summing monthly hours.
 *   - JSON data context (not pipe-delimited) so the model parses it cleanly.
 *   - Prompt caching on the data context — identical across all questions in a
 *     session, so every query after the first pays ~10% of input cost.
 *   - Strict "don't guess" system prompt — the old one let Claude invent
 *     employee/project names when the question was out of scope.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ForecastAssignment, Month } from '../types/forecast';
import type {
  HiringGapRow,
  RoleCategory,
  ScenarioSettings,
  StaffingRequest,
} from '../types/hiringForecast';
import { deriveEmployeeSummaries, deriveProjectSummaries } from './parseSpreadsheet';
import type { QueryResult } from './queryEngine';

const MONTHS: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LOCALSTORAGE_KEY = 'simpliigence-claude-api-key';
const MODEL = 'claude-opus-4-7';

export function getClaudeApiKey(): string {
  return localStorage.getItem(LOCALSTORAGE_KEY) || '';
}

export function setClaudeApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(LOCALSTORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  }
}

/* ── Shape of the data context we hand to Claude ─────────────────────── */

/** Data from the Hiring Forecast tab — demand, capacity, and gap per month × role. */
export interface HiringForecastInput {
  gapRows: HiringGapRow[];
  scenario: ScenarioSettings;
  staffingRequests: StaffingRequest[];
}

interface DataContext {
  meta: {
    year: number;
    capacityHoursPerMonth: number;
    employeeCount: number;
    projectCount: number;
    assignmentCount: number;
  };
  employees: Array<{
    name: string;
    role: string;
    rateCardUSDPerHour: number | null;
    type: 'SI' | 'Contractor' | 'Employee';
    projects: string[];
    monthlyHours: Record<Month, number>;
    totalHours: number;
  }>;
  projects: Array<{
    name: string;
    teamSize: number;
    monthlyHours: Record<Month, number>;
    totalHours: number;
    loadedCostUSD: number;
  }>;
  hiringForecast: {
    scenario: {
      targetUtilization: number;
      effectiveCapacityPerPersonPerMonth: number;
      forecastStartMonth: Month;
      forecastEndMonth: Month;
    };
    currentHeadcount: Record<RoleCategory, number>;
    /** One entry per (month × role) within the scenario window. */
    gapRows: Array<{
      month: Month;
      role: RoleCategory;
      totalDemandHours: number;
      totalCapacityHours: number;
      gapHours: number;
      hiresNeeded: number;
    }>;
    /** Manual staffing requests (one-off demand captured on the Hiring Forecast tab) */
    staffingRequests: Array<{
      clientName: string;
      role: RoleCategory;
      hoursPerMonth: number;
      startMonth: Month;
      endMonth: Month;
    }>;
  };
}

function buildDataContext(
  assignments: ForecastAssignment[],
  hiring: HiringForecastInput,
): DataContext {
  const employees = deriveEmployeeSummaries(assignments);
  const projects = deriveProjectSummaries(assignments);
  const roundRecord = (r: Record<Month, number>): Record<Month, number> =>
    MONTHS.reduce((acc, m) => {
      acc[m] = Math.round(r[m] || 0);
      return acc;
    }, {} as Record<Month, number>);

  // currentHeadcount and effectiveCapacityPerPerson are constant across gap rows,
  // so we can pluck them from any row per role.
  const currentHeadcount: Record<RoleCategory, number> = { BA: 0, JuniorDev: 0, SeniorDev: 0 };
  let effectiveCapPerPerson = 160 * (hiring.scenario.targetUtilization / 100);
  for (const r of hiring.gapRows) {
    currentHeadcount[r.roleCategory] = r.currentHeadcount;
    effectiveCapPerPerson = r.effectiveCapacityPerPerson;
  }

  return {
    meta: {
      year: 2026,
      capacityHoursPerMonth: 160,
      employeeCount: employees.length,
      projectCount: projects.length,
      assignmentCount: assignments.length,
    },
    employees: employees.map((e) => ({
      name: e.name,
      role: e.role || 'N/A',
      rateCardUSDPerHour: e.rateCard,
      type: e.isSI ? 'SI' : e.isContractor ? 'Contractor' : 'Employee',
      projects: e.projects,
      monthlyHours: roundRecord(e.monthlyHours),
      totalHours: Math.round(e.totalHours),
    })),
    projects: projects.map((p) => ({
      name: p.name,
      teamSize: p.employees.length,
      monthlyHours: roundRecord(p.monthlyHours),
      totalHours: Math.round(p.totalHours),
      loadedCostUSD: Math.round(p.loadedCost),
    })),
    hiringForecast: {
      scenario: {
        targetUtilization: hiring.scenario.targetUtilization,
        effectiveCapacityPerPersonPerMonth: Math.round(effectiveCapPerPerson),
        forecastStartMonth: hiring.scenario.forecastStartMonth,
        forecastEndMonth: hiring.scenario.forecastEndMonth,
      },
      currentHeadcount,
      gapRows: hiring.gapRows.map((r) => ({
        month: r.month,
        role: r.roleCategory,
        totalDemandHours: Math.round(r.totalDemand),
        totalCapacityHours: Math.round(r.totalCapacity),
        gapHours: Math.round(r.gap),
        hiresNeeded: r.hiresNeeded,
      })),
      staffingRequests: hiring.staffingRequests.map((r) => ({
        clientName: r.clientName,
        role: r.roleCategory,
        hoursPerMonth: r.hoursPerMonth,
        startMonth: r.startMonth,
        endMonth: r.endMonth,
      })),
    },
  };
}

/* ── Prompts ─────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a data analytics assistant for Simpliigence's resource management dashboard.

You answer questions about the team's forecasted hours, project allocation, and hiring needs. Your only source of truth is the JSON data provided in this message. Do not use outside knowledge.

Accuracy rules (non-negotiable):
- Compute every number by actually summing values in the data. Do not estimate.
- If the answer cannot be derived from the data, say exactly that — never invent employee names, project names, roles, or numbers.
- If the question is about India Staffing, Zoho project status, or general financials beyond the fields described below, reply that the Smart Query currently doesn't see that tab's data.

The data object has these top-level sections:
- meta: year, capacity per person per month (160 hours), totals.
- employees: per-person forecast (role, rate, monthlyHours Jan..Dec, totalHours, projects).
- projects: per-project forecast (teamSize, monthlyHours, totalHours, loadedCostUSD).
- hiringForecast: the Hiring Forecast tab — demand vs capacity per month × role, with hires needed.

How to answer HIRING / CAPACITY-GAP questions (use hiringForecast.gapRows):
- The field "hiresNeeded" on each gap row is the per-month, per-role number of FTEs to hire to close that month's gap. Demand fluctuates month-to-month.
- To answer "how many X to hire in period P": take MAX(hiresNeeded) over months in P for each relevant role, then sum those maxes across roles. (You don't un-hire someone once a peak month passes, so the peak drives the hiring plan.)
- "Developers" = JuniorDev + SeniorDev. "BAs" = BA only.
- Quarters: Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep, Q4=Oct–Dec. H1=Jan–Jun.
- Always mention which months drove the peak, and the current headcount baseline from hiringForecast.currentHeadcount.
- If all gapHours across the period are ≤ 0 for a role, the answer is 0 hires (current team has headroom).
- hiringForecast.scenario.targetUtilization and effectiveCapacityPerPersonPerMonth control the model — mention the scenario assumption if it's unusual (e.g. 80% target utilization means each person contributes 128 effective hours/month, not 160).

How to answer UTILIZATION questions:
- Utilization % for a person in period P = (hours they worked in P) / (160 × number of months in P) × 100.
- Utilization % for the team in P = sum of all person-hours in P / (160 × team size × number of months in P) × 100.

How to answer COST questions:
- Loaded cost is pre-computed per project in USD in projects[].loadedCostUSD. For a question spanning multiple projects, sum those values.
- Per-employee cost for period P = sum over months of (monthlyHours[m] × rateCardUSDPerHour). If rateCardUSDPerHour is null, exclude that person's hours from the cost number and call that out in the answer.

Output format — ALWAYS reply with a single JSON object matching this exact schema, and nothing else (no prose before or after, no markdown fences):

{
  "answer": "<markdown text, under 200 words. Use **bold** for key numbers and names. Use '- ' bullets for lists.>",
  "table": null | {
    "columns": ["<col header>", ...],
    "rows": [{"<col header>": <cell value>, ...}, ...]
  }
}

Return a table when listing/comparing multiple rows (people, projects, months, roles); return null for single-number answers. Every row object must use the exact strings from "columns" as its keys.`;

/* ── Client singleton (recreated when API key changes) ───────────────── */

let cachedClient: Anthropic | null = null;
let cachedKeyDigest = '';

function getClient(): Anthropic | null {
  const key = getClaudeApiKey();
  if (!key) return null;
  // Use last 8 chars as a cheap "has it changed?" fingerprint.
  const digest = key.slice(-8);
  if (!cachedClient || cachedKeyDigest !== digest) {
    cachedClient = new Anthropic({
      apiKey: key,
      dangerouslyAllowBrowser: true,
    });
    cachedKeyDigest = digest;
  }
  return cachedClient;
}

/* ── Parse the JSON response defensively ─────────────────────────────── */

interface ParsedResponse {
  answer: string;
  table: {
    columns: string[];
    rows: Record<string, string | number>[];
  } | null;
}

/** Coerce any cell value to string|number so it matches QueryResult's type. */
function coerceCell(v: unknown): string | number {
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function parseClaudeJson(text: string): ParsedResponse | null {
  // First try a clean JSON.parse. If that fails (e.g. Claude wrapped it in
  // a code fence despite instructions), fall back to a greedy brace match.
  const tryParse = (s: string): ParsedResponse | null => {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === 'object' && typeof obj.answer === 'string') {
        let table: ParsedResponse['table'] = null;
        if (obj.table && Array.isArray(obj.table.columns) && Array.isArray(obj.table.rows)) {
          const columns = obj.table.columns.map(String);
          const rows = (obj.table.rows as unknown[]).map((raw) => {
            const row: Record<string, string | number> = {};
            if (raw && typeof raw === 'object') {
              for (const col of columns) {
                row[col] = coerceCell((raw as Record<string, unknown>)[col]);
              }
            }
            return row;
          });
          table = { columns, rows };
        }
        return { answer: obj.answer, table };
      }
    } catch { /* fall through */ }
    return null;
  };

  const direct = tryParse(text.trim());
  if (direct) return direct;

  const match = text.match(/\{[\s\S]*\}/);
  return match ? tryParse(match[0]) : null;
}

/* ── Main entry point ───────────────────────────────────────────────── */

export async function runClaudeQuery(
  query: string,
  assignments: ForecastAssignment[],
  hiring: HiringForecastInput,
): Promise<QueryResult> {
  const client = getClient();
  if (!client) {
    return { answer: 'Claude API key not configured. Go to Settings to add your Anthropic API key.' };
  }

  const dataContext = buildDataContext(assignments, hiring);
  const dataJson = JSON.stringify(dataContext);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        {
          // The data is identical across questions within a session, so we
          // cache it. After the first query in a session, the rest cost ~10%
          // of input on the cached portion.
          type: 'text',
          text: `DATA (JSON):\n${dataJson}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: query }],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    if (!textBlock) {
      return { answer: 'Claude returned an empty response. Try rephrasing your question.' };
    }

    const parsed = parseClaudeJson(textBlock.text);
    if (!parsed) {
      // Last-resort fallback: show Claude's raw text rather than nothing.
      return { answer: textBlock.text };
    }

    const result: QueryResult = { answer: parsed.answer };
    if (parsed.table && parsed.table.rows.length > 0) {
      result.columns = parsed.table.columns;
      result.data = parsed.table.rows;
    }
    return result;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { answer: 'Invalid Claude API key. Please check your key in Settings.' };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { answer: 'Rate limit reached. Please wait a moment and try again.' };
    }
    if (err instanceof Anthropic.NotFoundError) {
      return { answer: `Model "${MODEL}" not found on your Anthropic account. Check the Models page in your Anthropic console to confirm access.` };
    }
    if (err instanceof Anthropic.APIError) {
      return { answer: `Claude API error (${err.status}): ${err.message.slice(0, 300)}` };
    }
    return {
      answer: `Failed to reach Claude: ${err instanceof Error ? err.message : 'Network error'}. Check your internet connection.`,
    };
  }
}
