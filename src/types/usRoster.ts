/** US Roster types — full US FTE list (billable + bench + allocated).
 *  Superset of Open Bench (which only shows the available subset). */

import type { VisaCategory } from './openBench';

export type USRosterStatus = 'Billable' | 'Bench' | 'On Leave' | 'Notice';

export const US_ROSTER_STATUSES: USRosterStatus[] = [
  'Billable', 'Bench', 'On Leave', 'Notice',
];

export const US_ROSTER_STATUS_COLORS: Record<USRosterStatus, string> = {
  Billable:   '#10b981',
  Bench:      '#f59e0b',
  'On Leave': '#94a3b8',
  Notice:     '#ef4444',
};

export interface USRosterMember {
  id: string;
  name: string;
  /** Role classification — same vocabulary as the India Roster */
  role: string;
  /** Current project allocation. Empty = unallocated / on bench. */
  project: string;
  status: USRosterStatus;
  /** Visa category — important context for US team allocation */
  visa_category: VisaCategory;
  /** Internal cost per hour (USD) — used for margin */
  cost_per_hour: number;
  /** Bill rate per hour (USD) — used for margin */
  bill_rate: number;
  /** ISO date when the person joined */
  start_date: string;
  /** Free-text skills */
  skills: string;
  /** US-specific: state/city like "Dallas, TX" */
  location: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function calcUSMarginPercent(m: Pick<USRosterMember, 'cost_per_hour' | 'bill_rate'>): number {
  if (!m.bill_rate || m.bill_rate <= 0) return 0;
  return Math.round(((m.bill_rate - m.cost_per_hour) / m.bill_rate) * 100);
}

export function calcUSMarginAbsolute(m: Pick<USRosterMember, 'cost_per_hour' | 'bill_rate'>): number {
  return Math.round((m.bill_rate - m.cost_per_hour) * 100) / 100;
}
