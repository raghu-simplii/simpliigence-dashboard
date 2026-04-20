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
}

function buildDataContext(assignments: ForecastAssignment[]): DataContext {
  const employees = deriveEmployeeSummaries(assignments);
  const projects = deriveProjectSummaries(assignments);
  const roundRecord = (r: Record<Month, number>): Record<Month, number> =>
    MONTHS.reduce((acc, m) => {
      acc[m] = Math.round(r[m] || 0);
      return acc;
    }, {} as Record<Month, number>);

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
  };
}

/* ── Prompts ─────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a data analytics assistant for Simpliigence's resource management dashboard.

You answer questions about a team's forecasted hours, by employee, by project, by month. Your only source of truth is the JSON data provided in this message. Do not use outside knowledge.

Accuracy rules (non-negotiable):
- Compute every number by actually summing the monthly values in the data. Do not estimate.
- If the answer cannot be derived from the data, say exactly that — never invent employee names, project names, roles, or numbers.
- If the question is about India Staffing, Zoho project status, financials, or anything other than forecasted hours and loaded cost, reply that the Smart Query currently sees only the forecast/team data.

Domain rules:
- Full-time capacity = 160 hours/month per person (the meta.capacityHoursPerMonth field).
- Utilization % = (actual hours in period) / (160 × number of months in period) × 100.
- Loaded cost is pre-computed per project in USD in the field "loadedCostUSD". Project cost = sum of (employee hours on project × rateCardUSDPerHour). If a question mixes projects, sum the pre-computed loadedCostUSD values.
- Quarters: Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep, Q4=Oct–Dec. "H1" = Jan–Jun.

Output format — ALWAYS reply with a single JSON object matching this exact schema, and nothing else (no prose before or after, no markdown fences):

{
  "answer": "<markdown-formatted text, under 200 words. Use **bold** for key numbers and names. Use '- ' bullets for lists.>",
  "table": null | {
    "columns": ["<col header>", ...],
    "rows": [{"<col header>": <cell value>, ...}, ...]
  }
}

Return a table when you're listing/comparing multiple rows (people, projects, months); return null for single-number answers. Every row object must use the exact strings from "columns" as its keys.`;

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
): Promise<QueryResult> {
  const client = getClient();
  if (!client) {
    return { answer: 'Claude API key not configured. Go to Settings to add your Anthropic API key.' };
  }

  const dataContext = buildDataContext(assignments);
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
