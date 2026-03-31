/**
 * Claude-powered Smart Query Engine.
 * Sends team/project data + user question to Claude API, returns structured answers.
 */
import type { ForecastAssignment, Month } from '../types/forecast';
import { deriveEmployeeSummaries, deriveProjectSummaries } from './parseSpreadsheet';
import type { QueryResult } from './queryEngine';

const MONTHS: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LOCALSTORAGE_KEY = 'simpliigence-claude-api-key';

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

function buildDataContext(assignments: ForecastAssignment[]): string {
  const employees = deriveEmployeeSummaries(assignments);
  const projects = deriveProjectSummaries(assignments);

  // Build compact employee table
  const empLines = employees.map((e) => {
    const hrs = MONTHS.map((m) => e.monthlyHours[m] || 0);
    const total = e.totalHours;
    return `${e.name}|${e.role || 'N/A'}|${e.rateCard ?? 'N/A'}|${e.isSI ? 'SI' : e.isContractor ? 'Contractor' : 'Employee'}|${e.projects.join(',')}|${hrs.join(',')}|${total}`;
  });

  // Build compact project table
  const projLines = projects.map((p) => {
    const hrs = MONTHS.map((m) => p.monthlyHours[m] || 0);
    return `${p.name}|${p.employees.length}|${hrs.join(',')}|${p.totalHours}|${Math.round(p.loadedCost)}`;
  });

  return `EMPLOYEES (Name|Role|Rate$/hr|Type|Projects|Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec|TotalHrs):
${empLines.join('\n')}

PROJECTS (Name|TeamSize|Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec|TotalHrs|LoadedCost$):
${projLines.join('\n')}

CAPACITY: 160 hours/month per person.
Year: 2026.
${employees.length} employees, ${projects.length} projects, ${assignments.length} assignments total.`;
}

export async function runClaudeQuery(
  query: string,
  assignments: ForecastAssignment[],
): Promise<QueryResult> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return { answer: 'Claude API key not configured. Go to Settings to add your Anthropic API key.' };
  }

  const dataContext = buildDataContext(assignments);

  const systemPrompt = `You are a smart analytics assistant for a resource management dashboard. You have access to team allocation data.

Answer the user's question accurately based ONLY on the data provided. Be concise and direct. Use numbers from the data — do not estimate or guess.

Format rules:
- Use **bold** for key numbers and names
- Use bullet points (- ) for lists
- Keep answers under 200 words
- If you show a table, return it in the "table" field of your JSON response
- Always calculate totals by summing the actual monthly values from the data

IMPORTANT: Respond with valid JSON in this exact format:
{
  "answer": "Your markdown-formatted answer text here",
  "table": null or { "columns": ["Col1", "Col2"], "rows": [{"Col1": "val", "Col2": 123}] }
}

Only use the "table" field when a table adds real value (e.g. listing employees, comparing projects). For simple single-number answers, use null for table.`;

  const userMessage = `DATA:
${dataContext}

QUESTION: ${query}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) {
        return { answer: 'Invalid Claude API key. Please check your key in Settings.' };
      }
      return { answer: `Claude API error (${response.status}): ${errText.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { answer: text };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const result: QueryResult = { answer: parsed.answer || text };

      if (parsed.table && parsed.table.columns && parsed.table.rows) {
        result.columns = parsed.table.columns;
        result.data = parsed.table.rows;
      }

      return result;
    } catch {
      // If JSON parsing fails, return raw text
      return { answer: text };
    }
  } catch (err) {
    return { answer: `Failed to reach Claude API: ${err instanceof Error ? err.message : 'Network error'}. Check your internet connection.` };
  }
}
