/** India Staffing Dashboard types */

export interface StaffingAccount {
  id: string;
  name: string;
  created_at: string;
}

export interface StaffingRequisition {
  id: string;
  account_id: string;
  account_name?: string;
  title: string;
  month: string;
  new_positions: number;
  backfills: number;
  expected_closure: string;
  anticipation: string;
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
  backfills: number;
  totalPositions: number;
  expectedClosure: string;
  status: string;
  anticipation: string;
  closureProb: number;
  risk: RiskLevel;
  stage: PipelineStage;
  velocity: number;
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
