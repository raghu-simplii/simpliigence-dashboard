/** India Staffing Dashboard types */

export interface StaffingAccount {
  id: string;
  name: string;
  created_at: string;
}

export type StaffingStatus =
  | 'Open'
  | 'In Progress'
  | 'On Hold'
  | 'Closed'
  | 'Lost'
  | 'Cancelled';

/** Statuses that move a requisition into the archive (out of the main list) */
export const ARCHIVED_STATUSES: StaffingStatus[] = ['Closed', 'Lost', 'Cancelled'];

export interface StaffingRequisition {
  id: string;
  account_id: string;
  account_name?: string;
  title: string;
  month: string;
  new_positions: number;
  expected_closure: string;
  /** ISO date (YYYY-MM-DD) when the requisition opened — drives Ageing calculation */
  start_date: string;
  /** ISO date (YYYY-MM-DD) for planned closure */
  close_by_date: string;
  status_field: StaffingStatus;
  stage: PipelineStage;
  anticipation: string;
  client_spoc: string;
  department: string;
  /** Manually entered probability (0–100). 0 or null means "use AI probability". */
  probability: number;
  /** AI-derived probability (0–100). Re-calculated automatically from status text + anticipation. */
  ai_probability: number;
  created_at: string;
  updated_at: string;
}

export interface DailyStatus {
  id: string;
  requisition_id: string;
  status_date: string;
  status_text: string;
  anticipation: string;
  created_at: string;
}

/** Audit log — one row per field change on a requisition */
export interface StaffingHistoryEntry {
  id: string;
  requisition_id: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_at: string;
  changed_by: string;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export type PipelineStage =
  | 'Sourcing'
  | 'Profiles Shared'
  | 'Interview'
  | 'Shortlisted'
  | 'Client Round'
  | 'Closed/Selected'
  | 'Onboarding';

export interface StaffingRow {
  id: string;
  month: string;
  account: string;
  account_id: string;
  requisition: string;
  newPositions: number;
  expectedClosure: string;
  startDate: string;
  closeByDate: string;
  /** Ageing in days (today - start_date). 0 if no start date. */
  ageing: number;
  statusField: StaffingStatus;
  status: string;
  anticipation: string;
  /** Manual Prob (0 = auto / fall back to AI) */
  probability: number;
  /** AI-derived probability */
  aiProbability: number;
  /** Effective probability used for forecasts: manual if set, else AI */
  closureProb: number;
  risk: RiskLevel;
  stage: PipelineStage;
  velocity: number;
  clientSpoc: string;
  department: string;
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
] as const;

export const STAGE_COLORS: Record<PipelineStage, string> = {
  'Onboarding': '#10b981',
  'Closed/Selected': '#22c55e',
  'Client Round': '#3b82f6',
  'Shortlisted': '#8b5cf6',
  'Interview': '#f59e0b',
  'Profiles Shared': '#06b6d4',
  'Sourcing': '#94a3b8',
};
