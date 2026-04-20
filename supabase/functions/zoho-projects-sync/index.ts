/**
 * Supabase Edge Function: zoho-projects-sync
 *
 * Called by the dashboard's "Sync from Zoho" button. Proxies Zoho Projects
 * so the client never sees the OAuth refresh token or Zoho credentials.
 *
 * Required secrets (set with `supabase secrets set ...`):
 *   ZOHO_CLIENT_ID       — OAuth app client id
 *   ZOHO_CLIENT_SECRET   — OAuth app client secret
 *   ZOHO_REFRESH_TOKEN   — self-client refresh token with
 *                          ZohoProjects.projects.READ + ZohoProjects.milestones.READ
 *   ZOHO_PORTAL_ID       — numeric portal id, e.g. 60025924266
 *
 * Optional:
 *   ZOHO_DC              — data centre suffix ("in", "com", "eu", "au"). Default: "in".
 *                          (Simpliigence is on projects.zoho.in so "in".)
 *
 * Response shape (success):
 *   { projects: ZohoPipelineProject[], syncedAt: string, counts: {total, active, skipped} }
 *
 * Response shape (error): { error: string, detail?: string } with HTTP 4xx/5xx.
 *
 * The function filters to ACTIVE projects only — anything whose status name
 * is "Completed" or "On Hold" is skipped, matching the dashboard's filter.
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference lib="deno.ns" />

// @ts-expect-error Deno global is provided by the edge runtime
const env = (name: string) => Deno.env.get(name);

const ZOHO_DC = env('ZOHO_DC') || 'in';
const ZOHO_CLIENT_ID = env('ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = env('ZOHO_CLIENT_SECRET');
const ZOHO_REFRESH_TOKEN = env('ZOHO_REFRESH_TOKEN');
const ZOHO_PORTAL_ID = env('ZOHO_PORTAL_ID');

const ACCOUNTS_BASE = `https://accounts.zoho.${ZOHO_DC}`;
const PROJECTS_BASE = `https://projectsapi.zoho.${ZOHO_DC}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const SKIP_STATUSES = new Set(['Completed', 'On Hold']);

// ── Types minimally describing what we use from Zoho responses ──
interface ZohoOwner { first_name?: string; last_name?: string; full_name?: string; name?: string; email?: string }
interface ZohoStatus { name?: string; is_closed?: boolean }
interface ZohoProject {
  id: string | number;
  name: string;
  status?: ZohoStatus | string;
  owner?: ZohoOwner;
  start_date?: string;
  end_date?: string;
}
interface ZohoMilestone {
  id: string | number;
  name: string;
  start_date?: string;
  end_date?: string;
  completed_on?: string;
  status?: ZohoStatus;
  owner?: ZohoOwner;
}

// ── Helpers ──
function ownerName(o?: ZohoOwner): string {
  if (!o) return '';
  if (o.full_name) return o.full_name;
  if (o.name) return o.name;
  return `${o.first_name ?? ''} ${o.last_name ?? ''}`.trim();
}
function statusName(s?: ZohoStatus | string): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.name ?? '';
}

// ── Zoho API helpers ──
async function getAccessToken(): Promise<string> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Missing Zoho OAuth secrets (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)');
  }
  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const res = await fetch(`${ACCOUNTS_BASE}/oauth/v2/token?${params.toString()}`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho OAuth failed (${res.status}): ${text}`);
  }
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Zoho OAuth returned no access_token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function zohoGet<T>(accessToken: string, path: string): Promise<T> {
  const url = `${PROJECTS_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho GET ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return await res.json() as T;
}

// ── Main handler ──
// @ts-expect-error Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    if (!ZOHO_PORTAL_ID) {
      throw new Error('ZOHO_PORTAL_ID secret not set');
    }

    const accessToken = await getAccessToken();

    // Zoho v3 can return a raw array or an object with a projects/ids key. Handle both.
    const raw = await zohoGet<unknown>(
      accessToken,
      `/api/v3/portal/${ZOHO_PORTAL_ID}/projects?per_page=200`,
    );
    const projects: ZohoProject[] = Array.isArray(raw)
      ? raw as ZohoProject[]
      : ((raw as { projects?: ZohoProject[] }).projects ?? []);

    const active = projects.filter((p) => !SKIP_STATUSES.has(statusName(p.status)));

    // Phases are fetched in parallel but throttled — 9 concurrent is safe for
    // Zoho's rate limit (100 req/min on most plans) even for ~50 projects.
    const phaseLimit = 9;
    const enriched = await mapWithConcurrency(active, phaseLimit, async (p) => {
      let phases: unknown[] = [];
      try {
        const data = await zohoGet<{ milestones?: ZohoMilestone[] }>(
          accessToken,
          `/api/v3/portal/${ZOHO_PORTAL_ID}/projects/${p.id}/milestones?per_page=200`,
        );
        const milestones = data.milestones ?? [];
        phases = milestones
          .map((m) => ({
            id: String(m.id),
            name: m.name,
            startDate: m.start_date ?? '',
            endDate: m.end_date ?? '',
            status: statusName(m.status) || 'Active',
            isClosed: m.status?.is_closed ?? false,
            completedOn: m.completed_on ?? undefined,
            owner: ownerName(m.owner),
          }))
          .sort((a: { startDate: string }, b: { startDate: string }) =>
            a.startDate.localeCompare(b.startDate),
          );
      } catch (e) {
        // Swallow per-project phase errors so one bad project doesn't fail the whole sync.
        console.warn(`phases for project ${p.id} failed:`, (e as Error).message);
      }
      return {
        id: `zoho-${p.id}`,
        zohoId: String(p.id),
        name: p.name,
        status: statusName(p.status) || 'Active',
        owner: ownerName(p.owner),
        startDate: p.start_date ?? null,
        endDate: p.end_date ?? null,
        source: 'zoho' as const,
        resources: [],
        phases,
      };
    });

    const body = {
      projects: enriched,
      syncedAt: new Date().toISOString(),
      counts: {
        total: projects.length,
        active: enriched.length,
        skipped: projects.length - enriched.length,
      },
    };
    return new Response(JSON.stringify(body), { headers: corsHeaders });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error('[zoho-projects-sync]', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});

/** Map with bounded concurrency (avoids Promise.all fan-out). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
