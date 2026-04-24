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
import type {
  StaffingAccount,
  StaffingRequisition,
  DailyStatus,
  StaffingHistoryEntry,
} from '../types/staffing';
import { deriveEmployeeSummaries, deriveProjectSummaries } from './parseSpreadsheet';
import { computeStageTiming } from './staffingAlerts';
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

/* ── India Staffing — AI Daily Briefing ─────────────────────────────────
 *
 * Claude reads the current active reqs, recent status updates, and recent
 * audit-log changes, and produces a 3–5 bullet operator briefing:
 *   - what moved yesterday / today
 *   - what's stuck and needs attention
 *   - any risk signals from status text sentiment
 *
 * Cached for the day in localStorage so we don't re-spend tokens on every
 * page load. Pass `forceRefresh` to bypass.
 */

export interface StaffingBriefing {
  /** Markdown-formatted summary text */
  markdown: string;
  /** Timestamp when this briefing was generated */
  generatedAt: string;
  /** Machine-readable alerts used to drive red badges in the UI */
  alerts: Array<{
    requisitionId: string;
    severity: 'high' | 'medium' | 'info';
    message: string;
  }>;
}

export interface StaffingBriefingInput {
  accounts: StaffingAccount[];
  requisitions: StaffingRequisition[];
  statuses: DailyStatus[];
  history: StaffingHistoryEntry[];
}

const BRIEFING_CACHE_KEY = 'simpliigence-india-briefing-v1';

function readCachedBriefing(): StaffingBriefing | null {
  try {
    const raw = localStorage.getItem(BRIEFING_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as StaffingBriefing;
    // Cache is good for the current calendar date only (local time).
    const today = new Date().toISOString().slice(0, 10);
    const genDate = (cached.generatedAt || '').slice(0, 10);
    if (genDate === today) return cached;
    return null;
  } catch {
    return null;
  }
}

function writeCachedBriefing(b: StaffingBriefing): void {
  try { localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

/** Build a compact JSON context representing the state relevant for a briefing. */
function buildBriefingContext(input: StaffingBriefingInput) {
  const { accounts, requisitions, statuses, history } = input;
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Unknown';

  // Only consider non-archived reqs for the briefing.
  const active = requisitions.filter((r) => !['Closed', 'Lost', 'Cancelled'].includes(r.status_field));

  const activeSummary = active.map((r) => {
    const timing = computeStageTiming(r, history);
    const reqStatuses = statuses
      .filter((s) => s.requisition_id === r.id)
      .sort((a, b) => b.status_date.localeCompare(a.status_date))
      .slice(0, 3);
    return {
      id: r.id,
      account: acctName(r.account_id),
      title: r.title,
      positions: r.new_positions,
      stage: r.stage,
      status: r.status_field,
      probability: r.probability || null,
      aiProbability: r.ai_probability,
      daysInStage: timing.daysInStage,
      stuckThreshold: timing.stuckThreshold,
      stuck: timing.isStuck,
      ageing: r.start_date
        ? Math.max(0, Math.floor((Date.now() - Date.parse(r.start_date)) / 86_400_000))
        : null,
      closeByDate: r.close_by_date || null,
      clientSpoc: r.client_spoc || null,
      anticipation: r.anticipation || null,
      recentStatuses: reqStatuses.map((s) => ({ date: s.status_date, text: s.status_text })),
    };
  });

  // History in the last 48 hours — what moved recently.
  const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const recentChanges = history
    .filter((h) => h.changed_at >= cutoff)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
    .slice(0, 50)
    .map((h) => {
      const req = requisitions.find((r) => r.id === h.requisition_id);
      return {
        at: h.changed_at,
        account: req ? acctName(req.account_id) : 'Unknown',
        reqTitle: req?.title || h.requisition_id,
        field: h.field,
        from: h.old_value || '∅',
        to: h.new_value || '∅',
      };
    });

  return {
    today: new Date().toISOString().slice(0, 10),
    totals: {
      activeRequisitions: active.length,
      activePositions: active.reduce((s, r) => s + r.new_positions, 0),
      stuck: activeSummary.filter((r) => r.stuck).length,
    },
    active: activeSummary,
    recentChanges,
  };
}

const BRIEFING_SYSTEM = `You are a recruiting operations assistant. Your job is to give the India Staffing team a tight daily briefing based on the JSON data provided.

Hard rules:
- Use only the data provided. Never invent names, numbers, or events.
- Keep the summary under 140 words.
- Prioritize signal over noise: highlight what moved in the last 48 hours, what's stuck, and what needs human follow-up.

Output format — reply with a SINGLE JSON object, no prose outside it:

{
  "markdown": "<3–5 bullet summary. Use '- ' bullets. **Bold** req titles and account names.>",
  "alerts": [
    { "requisitionId": "<id from data>", "severity": "high" | "medium" | "info", "message": "<≤12 words>" }
  ]
}

Alert guidance:
- "high": stuck for more than 2× the stage threshold, strong negative sentiment in recent status ("no hopes", "reject", "dropped out"), or close date already passed with no closure.
- "medium": stuck at or over the stage threshold, or sentiment flat for >1 week.
- "info": notable positive momentum (multiple closures, client select), worth celebrating.

Cap at 6 alerts total. Only include requisitionId values that actually appear in the data.`;

export async function runStaffingBriefing(
  input: StaffingBriefingInput,
  opts: { forceRefresh?: boolean } = {},
): Promise<StaffingBriefing> {
  if (!opts.forceRefresh) {
    const cached = readCachedBriefing();
    if (cached) return cached;
  }

  const client = getClient();
  if (!client) {
    return {
      markdown: '_Add your Anthropic API key in Settings to get an AI daily briefing._',
      generatedAt: new Date().toISOString(),
      alerts: [],
    };
  }

  const context = buildBriefingContext(input);
  // If there's effectively nothing going on, don't burn a Claude call.
  if (context.active.length === 0) {
    const empty: StaffingBriefing = {
      markdown: '_No active requisitions right now — briefing skipped._',
      generatedAt: new Date().toISOString(),
      alerts: [],
    };
    writeCachedBriefing(empty);
    return empty;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: [
        { type: 'text', text: BRIEFING_SYSTEM },
        {
          type: 'text',
          text: `DATA (JSON):\n${JSON.stringify(context)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: 'Write today\'s India staffing briefing per the format above.' },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    const raw = textBlock?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = null;
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
    }
    if (!parsed?.markdown) {
      return {
        markdown: raw || 'Claude returned an empty briefing. Try Regenerate.',
        generatedAt: new Date().toISOString(),
        alerts: [],
      };
    }

    const briefing: StaffingBriefing = {
      markdown: String(parsed.markdown),
      generatedAt: new Date().toISOString(),
      alerts: Array.isArray(parsed.alerts)
        ? (parsed.alerts as unknown[])
          .filter((a): a is { requisitionId: string; severity: string; message: string } =>
            !!a && typeof a === 'object' && 'requisitionId' in a && 'message' in a,
          )
          .map((a: { requisitionId: string; severity: string; message: string }) => ({
            requisitionId: String(a.requisitionId),
            severity: (['high', 'medium', 'info'] as const).includes(a.severity as 'high' | 'medium' | 'info')
              ? (a.severity as 'high' | 'medium' | 'info')
              : ('info' as const),
            message: String(a.message).slice(0, 200),
          }))
          .slice(0, 6)
        : [],
    };

    writeCachedBriefing(briefing);
    return briefing;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      markdown: `_AI briefing unavailable: ${msg.slice(0, 200)}_`,
      generatedAt: new Date().toISOString(),
      alerts: [],
    };
  }
}

/* ── India Staffing — Smart Query (ask anything about your pipeline) ────
 *
 * Scoped to India Staffing data only: accounts, requisitions, statuses,
 * audit history, and the computed funnel metrics. Uses the same Claude
 * infrastructure as the main dashboard Smart Query (Opus 4.7 + adaptive
 * thinking + prompt caching), but with a domain-aware system prompt that
 * knows how to reason about recruiting pipelines.
 */

export interface StaffingQueryInput {
  accounts: StaffingAccount[];
  requisitions: StaffingRequisition[];
  statuses: DailyStatus[];
  history: StaffingHistoryEntry[];
}

/** Compact JSON payload used for the Smart Query context. */
function buildStaffingQueryContext(input: StaffingQueryInput) {
  const { accounts, requisitions, statuses, history } = input;
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Unknown';

  const reqs = requisitions.map((r) => {
    const timing = computeStageTiming(r, history);
    const reqStatuses = statuses
      .filter((s) => s.requisition_id === r.id)
      .sort((a, b) => b.status_date.localeCompare(a.status_date));
    return {
      id: r.id,
      account: acctName(r.account_id),
      title: r.title,
      month: r.month,
      positions: r.new_positions,
      stage: r.stage,
      status: r.status_field,
      manualProb: r.probability || null,
      aiProb: r.ai_probability,
      startDate: r.start_date || null,
      closeByDate: r.close_by_date || null,
      expectedClosure: r.expected_closure || null,
      ageingDays: r.start_date
        ? Math.max(0, Math.floor((Date.now() - Date.parse(r.start_date)) / 86_400_000))
        : null,
      daysInCurrentStage: timing.daysInStage,
      stuckInStage: timing.isStuck,
      clientSpoc: r.client_spoc || null,
      department: r.department || null,
      anticipation: r.anticipation || null,
      latestStatus: reqStatuses[0]
        ? { date: reqStatuses[0].status_date, text: reqStatuses[0].status_text }
        : null,
      recentStatuses: reqStatuses.slice(0, 5).map((s) => ({
        date: s.status_date,
        text: s.status_text,
        anticipation: s.anticipation || undefined,
      })),
    };
  });

  // Per-account rollup — useful for "which account has the most stuck reqs?"
  const byAccount = new Map<string, { active: number; closed: number; lost: number; positions: number }>();
  for (const r of requisitions) {
    const key = acctName(r.account_id);
    const entry = byAccount.get(key) || { active: 0, closed: 0, lost: 0, positions: 0 };
    if (['Lost', 'Cancelled'].includes(r.status_field)) entry.lost++;
    else if (r.status_field === 'Closed') entry.closed++;
    else { entry.active++; entry.positions += r.new_positions; }
    byAccount.set(key, entry);
  }
  const accountRollup = [...byAccount.entries()].map(([name, s]) => ({
    account: name, activeReqs: s.active, closedReqs: s.closed, lostReqs: s.lost, activePositions: s.positions,
  }));

  // Recent audit-log activity (last 14 days) — useful for momentum questions
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const recentChanges = history
    .filter((h) => h.changed_at >= cutoff)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
    .slice(0, 80)
    .map((h) => {
      const req = requisitions.find((r) => r.id === h.requisition_id);
      return {
        at: h.changed_at.slice(0, 10),
        account: req ? acctName(req.account_id) : 'Unknown',
        reqTitle: req?.title || h.requisition_id,
        field: h.field,
        from: h.old_value,
        to: h.new_value,
      };
    });

  return {
    today: new Date().toISOString().slice(0, 10),
    totals: {
      totalReqs: requisitions.length,
      activeReqs: requisitions.filter((r) => !['Closed', 'Lost', 'Cancelled'].includes(r.status_field)).length,
      stuckReqs: requisitions.filter((r) => {
        if (['Closed', 'Lost', 'Cancelled'].includes(r.status_field)) return false;
        return computeStageTiming(r, history).isStuck;
      }).length,
    },
    accounts: accountRollup,
    reqs,
    recentChanges,
  };
}

const STAFFING_QUERY_SYSTEM = `You are a recruiting analytics assistant for the India Staffing team. Answer questions about the team's requisition pipeline accurately, using ONLY the JSON data provided.

Hard rules:
- Compute every number by actually counting/summing the data. Don't estimate.
- If the data can't answer the question, say so — don't invent account names, req titles, or numbers.
- Cite specific reqs ("**Ciklum – Java**", "**Paprima R2**") rather than vague groups where possible.
- Be concise. Under 200 words. Bullets preferred over prose for lists.

Domain vocabulary:
- "Active" reqs: status is Open / In Progress / On Hold (NOT Closed / Lost / Cancelled).
- "Archived" reqs: status is Closed, Lost, or Cancelled.
- "Stuck": daysInCurrentStage exceeds the stage's threshold (field stuckInStage === true).
- "Ageing": days since the start_date — how long the req has been open end-to-end.
- Stages in order: Sourcing → Profiles Shared → Interview → Shortlisted → Client Round → Closed/Selected → Onboarding.
- "No hopes", "reject", "dropped out" in status text = negative sentiment. "Select", "confirmed", "verbal offer" = positive.

How to answer common questions:
- "What's stuck?" → filter reqs where stuckInStage === true.
- "What closed recently?" → look in recentChanges for status_field transitions to Closed, or stage transitions to Onboarding.
- "Which account is strongest/weakest?" → use accountRollup. Weakest = high lostReqs relative to activeReqs, or high activePositions but no closedReqs.
- "Forecast" / "closure probability" questions → use aiProb (AI-derived) and manualProb (recruiter override). Effective prob = manualProb if set > 0 else aiProb.
- "What moved this week?" → recentChanges filtered to last 7 days.

Output format — reply with a single JSON object, no prose outside it:

{
  "answer": "<markdown text under 200 words. Use **bold** for key names/numbers. Use '- ' bullets for lists.>",
  "table": null | {
    "columns": ["<col header>", ...],
    "rows": [{"<col header>": <string|number>, ...}, ...]
  }
}

Include a table whenever the answer is a list of reqs, accounts, or time buckets. Skip it for single-number answers.`;

export async function runStaffingQuery(
  query: string,
  input: StaffingQueryInput,
): Promise<QueryResult> {
  const client = getClient();
  if (!client) {
    return { answer: 'Claude API key not configured. Go to Settings to add your Anthropic API key.' };
  }
  const context = buildStaffingQueryContext(input);
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: [
        { type: 'text', text: STAFFING_QUERY_SYSTEM },
        {
          type: 'text',
          text: `DATA (JSON):\n${JSON.stringify(context)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: query }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) return { answer: 'Claude returned an empty response. Try rephrasing.' };
    const parsed = parseClaudeJson(textBlock.text);
    if (!parsed) return { answer: textBlock.text };

    const result: QueryResult = { answer: parsed.answer };
    if (parsed.table && parsed.table.rows.length > 0) {
      result.columns = parsed.table.columns;
      result.data = parsed.table.rows;
    }
    return result;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { answer: 'Invalid Claude API key. Please check your key in Settings.' };
    if (err instanceof Anthropic.RateLimitError) return { answer: 'Rate limit reached. Please wait a moment and try again.' };
    if (err instanceof Anthropic.APIError) return { answer: `Claude API error (${err.status}): ${err.message.slice(0, 300)}` };
    return { answer: `Failed to reach Claude: ${err instanceof Error ? err.message : 'Network error'}.` };
  }
}

/** Suggested starter questions for the India Staffing Smart Query. */
export const STAFFING_SUGGESTED_QUERIES = [
  'Which reqs are at risk of missing their close date?',
  'What moved in the last 7 days?',
  'Which account has the weakest pipeline right now?',
  'Summarize Ciklum\'s open reqs',
  'Show me reqs stuck in Client Round',
  'What\'s my best shot at closing this month?',
  'Which reqs have had no status update in 10+ days?',
];
