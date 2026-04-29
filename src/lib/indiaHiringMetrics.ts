/**
 * Deterministic metrics for India Hiring Forecast.
 *
 * No AI here — just measured facts derived from:
 *   • India Roster (size, role mix, growth trends)
 *   • India Staffing requisitions + statuses + audit log
 *     (demand trends, skill demand, time-to-close, velocity)
 *
 * The AI prediction layer (claudeQuery.runIndiaHiringForecast) takes the
 * output of this file as its input context.
 */
import type { IndiaRosterMember } from '../types/indiaRoster';
import type { StaffingRequisition, DailyStatus, StaffingHistoryEntry, PipelineStage } from '../types/staffing';

const DAY_MS = 86_400_000;
const today = () => Date.now();

export interface RosterGrowthBucket {
  /** ISO date — first day of the month */
  monthStart: string;
  /** Headcount at start of this month (people whose start_date <= monthStart) */
  headcount: number;
  /** People who joined this month */
  joined: number;
}

export interface SkillDemand {
  skill: string;
  /** How many active requisitions mention this skill in the title */
  reqCount: number;
  /** Sum of new_positions across those reqs */
  positions: number;
  /** Distinct accounts demanding this skill */
  accountCount: number;
}

export interface ClientDemand {
  account: string;
  activeReqs: number;
  positions: number;
  /** Reqs closed-as-Closed in the last 90 days for this account */
  recentClosures: number;
}

export interface StageVelocity {
  fromStage: PipelineStage | 'created';
  toStage: PipelineStage | 'Closed';
  /** Median days observed between transitions of this kind */
  medianDays: number;
  /** Sample size */
  observations: number;
}

export interface ClosureTimeline {
  /** ISO date (YYYY-MM-DD) — first day of the bucket */
  weekStart: string;
  /** Reqs whose status_field flipped to 'Closed' in this bucket */
  closures: number;
  /** Reqs whose status_field flipped to 'Lost' or 'Cancelled' */
  losses: number;
}

export interface IndiaHiringMetrics {
  roster: {
    total: number;
    billable: number;
    bench: number;
    notice: number;
    onLeave: number;
    /** Last 6 months of headcount + joins */
    monthlyGrowth: RosterGrowthBucket[];
    /** Net add over the trailing 90 days */
    netAdd90d: number;
    /** Average time someone has been on the team (days) */
    avgTenureDays: number;
    /** Role bucket counts (used for "we have N seniors but most demand is for juniors") */
    roleMix: Array<{ role: string; count: number }>;
  };
  demand: {
    activeReqs: number;
    activePositions: number;
    closingSoon: number;
    /** Top skills inferred from requisition titles (free-text contains these tokens) */
    topSkills: SkillDemand[];
    /** Per-account demand */
    byAccount: ClientDemand[];
    /** Last 12 weeks of closures + losses */
    closureTimeline: ClosureTimeline[];
    /** Median days from req creation to first stage advance */
    medianFirstAdvanceDays: number | null;
    /** Median days from creation to Closed (only counts won closures) */
    medianTimeToCloseDays: number | null;
  };
  /** Generated at — useful for "this brief was computed N minutes ago" */
  computedAt: string;
}

/* ──────────────────────────────────────────────────────────────────── */

const SKILL_PATTERNS: Array<{ skill: string; regex: RegExp }> = [
  { skill: 'Salesforce',         regex: /\b(salesforce|sf|sfdc|apex|lwc|vlocity|cpq)\b/i },
  { skill: 'Java',               regex: /\b(java|spring|jvm)\b/i },
  { skill: 'Python / AI',        regex: /\b(python|ai|ml|llm|gen[ai\s]*|machine\s*learning)\b/i },
  { skill: '.NET',               regex: /\b(\.net|dotnet|c#|aspnet)\b/i },
  { skill: 'Full Stack',         regex: /\b(full\s*stack|fullstack|fsl)\b/i },
  { skill: 'DevOps',             regex: /\b(devops|sre|kubernetes|k8s|aws|azure|gcp)\b/i },
  { skill: 'QA / Test',          regex: /\b(qa|sdet|automation|test|cypress|selenium|accelq)\b/i },
  { skill: 'Architect',          regex: /\barchitect\b/i },
  { skill: 'Data',               regex: /\b(data\s*engineer|etl|snowflake|databricks)\b/i },
  { skill: 'Product Owner',      regex: /\b(product\s*owner|po|ba|business\s*analyst)\b/i },
];

function extractSkills(text: string): string[] {
  const hits: string[] = [];
  for (const { skill, regex } of SKILL_PATTERNS) {
    if (regex.test(text)) hits.push(skill);
  }
  return hits;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/* ──────────────────────────────────────────────────────────────────── */

export function computeIndiaHiringMetrics(input: {
  roster: IndiaRosterMember[];
  requisitions: StaffingRequisition[];
  statuses: DailyStatus[];
  history: StaffingHistoryEntry[];
}): IndiaHiringMetrics {
  const { roster, requisitions, statuses, history } = input;
  void statuses; // (reserved for future sentiment analysis)

  /* ── Roster metrics ─────────────────────────── */
  const total = roster.length;
  const billable = roster.filter((r) => r.status === 'Billable').length;
  const bench = roster.filter((r) => r.status === 'Bench').length;
  const notice = roster.filter((r) => r.status === 'Notice').length;
  const onLeave = roster.filter((r) => r.status === 'On Leave').length;

  // 6-month rolling headcount + joins
  const now = new Date();
  const monthlyGrowth: RosterGrowthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().slice(0, 10);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
    const headcount = roster.filter((r) => r.start_date && r.start_date <= monthStart).length;
    const joined = roster.filter((r) => r.start_date && r.start_date >= monthStart && r.start_date < monthEnd).length;
    monthlyGrowth.push({ monthStart, headcount, joined });
  }

  // Net add 90d
  const cutoff90 = new Date(today() - 90 * DAY_MS).toISOString().slice(0, 10);
  const netAdd90d = roster.filter((r) => r.start_date >= cutoff90).length;

  // Avg tenure
  const tenures = roster
    .filter((r) => r.start_date)
    .map((r) => Math.max(0, Math.floor((today() - Date.parse(r.start_date)) / DAY_MS)));
  const avgTenureDays = tenures.length ? Math.round(tenures.reduce((s, v) => s + v, 0) / tenures.length) : 0;

  // Role mix
  const roleCounts = new Map<string, number>();
  for (const r of roster) {
    const k = r.role || 'Unspecified';
    roleCounts.set(k, (roleCounts.get(k) || 0) + 1);
  }
  const roleMix = [...roleCounts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  /* ── Demand metrics ─────────────────────────── */
  const ARCHIVED = ['Closed', 'Lost', 'Cancelled'];
  const activeReqs = requisitions.filter((r) => !ARCHIVED.includes(r.status_field));
  const activePositions = activeReqs.reduce((s, r) => s + (r.new_positions || 0), 0);

  // Closing soon = close_by_date within 14 days
  const cutoff14 = new Date(today() + 14 * DAY_MS).toISOString().slice(0, 10);
  const closingSoon = activeReqs.filter((r) => r.close_by_date && r.close_by_date <= cutoff14).length;

  // Skill demand inferred from titles
  const skillStats = new Map<string, { reqCount: number; positions: number; accounts: Set<string> }>();
  for (const r of activeReqs) {
    const skills = extractSkills(r.title);
    for (const skill of skills) {
      const entry = skillStats.get(skill) || { reqCount: 0, positions: 0, accounts: new Set<string>() };
      entry.reqCount += 1;
      entry.positions += r.new_positions || 0;
      entry.accounts.add(r.account_id);
      skillStats.set(skill, entry);
    }
  }
  const topSkills: SkillDemand[] = [...skillStats.entries()]
    .map(([skill, s]) => ({ skill, reqCount: s.reqCount, positions: s.positions, accountCount: s.accounts.size }))
    .sort((a, b) => b.positions - a.positions)
    .slice(0, 6);

  // By-account demand
  const cutoff90Stamp = today() - 90 * DAY_MS;
  const accountStats = new Map<string, ClientDemand>();
  for (const r of activeReqs) {
    const k = r.account_id;
    const entry = accountStats.get(k) || { account: k, activeReqs: 0, positions: 0, recentClosures: 0 };
    entry.activeReqs += 1;
    entry.positions += r.new_positions || 0;
    accountStats.set(k, entry);
  }
  // Recent closures per account from history (status_field → Closed)
  for (const h of history) {
    if (h.field !== 'status_field' || h.new_value !== 'Closed') continue;
    if (Date.parse(h.changed_at) < cutoff90Stamp) continue;
    const req = requisitions.find((r) => r.id === h.requisition_id);
    if (!req) continue;
    const entry = accountStats.get(req.account_id) || { account: req.account_id, activeReqs: 0, positions: 0, recentClosures: 0 };
    entry.recentClosures += 1;
    accountStats.set(req.account_id, entry);
  }
  const byAccount = [...accountStats.values()].sort((a, b) => b.positions - a.positions);

  // Closure timeline — last 12 weeks
  const closureTimeline: ClosureTimeline[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(today() - i * 7 * DAY_MS);
    start.setHours(0, 0, 0, 0);
    // Snap to Monday
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    const weekStart = start.toISOString().slice(0, 10);
    const weekEnd = new Date(start.getTime() + 7 * DAY_MS).toISOString().slice(0, 10);
    let closures = 0;
    let losses = 0;
    for (const h of history) {
      if (h.field !== 'status_field') continue;
      if (h.changed_at.slice(0, 10) < weekStart || h.changed_at.slice(0, 10) >= weekEnd) continue;
      if (h.new_value === 'Closed') closures += 1;
      if (h.new_value === 'Lost' || h.new_value === 'Cancelled') losses += 1;
    }
    closureTimeline.push({ weekStart, closures, losses });
  }

  // Time-to-first-advance: days from req.created_at to first stage change in history
  const firstAdvances: number[] = [];
  for (const r of requisitions) {
    const firstStageChange = history
      .filter((h) => h.requisition_id === r.id && h.field === 'stage')
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at))[0];
    if (firstStageChange && r.created_at) {
      const days = Math.max(0, (Date.parse(firstStageChange.changed_at) - Date.parse(r.created_at)) / DAY_MS);
      if (Number.isFinite(days)) firstAdvances.push(days);
    }
  }
  const medianFirstAdvanceDays = median(firstAdvances);

  // Time-to-close: days from req.created_at to status_field → Closed
  const closeTimes: number[] = [];
  for (const h of history) {
    if (h.field !== 'status_field' || h.new_value !== 'Closed') continue;
    const req = requisitions.find((r) => r.id === h.requisition_id);
    if (!req?.created_at) continue;
    const days = (Date.parse(h.changed_at) - Date.parse(req.created_at)) / DAY_MS;
    if (Number.isFinite(days) && days >= 0) closeTimes.push(days);
  }
  const medianTimeToCloseDays = median(closeTimes);

  return {
    roster: { total, billable, bench, notice, onLeave, monthlyGrowth, netAdd90d, avgTenureDays, roleMix },
    demand: {
      activeReqs: activeReqs.length,
      activePositions,
      closingSoon,
      topSkills,
      byAccount,
      closureTimeline,
      medianFirstAdvanceDays,
      medianTimeToCloseDays,
    },
    computedAt: new Date().toISOString(),
  };
}
