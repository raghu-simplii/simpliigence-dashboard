/** Open Bench Resources types */

export type VisaCategory =
  | 'H1B'
  | 'L1'
  | 'L2 EAD'
  | 'H4 EAD'
  | 'GC'
  | 'GC EAD'
  | 'US Citizen'
  | 'OPT'
  | 'CPT'
  | 'TN'
  | 'Other';

export type JobPriority = 'Primary' | 'Secondary';

export interface BenchResource {
  id: string;
  resource_name: string;
  years_of_experience: number;
  visa_category: VisaCategory;
  primary_skill: string;
  roles: string;
  job_priority: JobPriority;
  target_rate: number;
  location: string;
  key_opportunities: string;
  notes: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

/** Type of recruiter update logged against a bench resource. */
export type BenchUpdateType =
  | 'Submission'   // Profile submitted to a client/role
  | 'Interview'    // Interview scheduled / completed
  | 'Feedback'     // Client/recruiter feedback received
  | 'Note';        // General note (default)

export const BENCH_UPDATE_TYPES: BenchUpdateType[] = [
  'Submission', 'Interview', 'Feedback', 'Note',
];

export const BENCH_UPDATE_TYPE_COLORS: Record<BenchUpdateType, string> = {
  Submission: '#3b82f6',  // blue
  Interview:  '#8b5cf6',  // violet
  Feedback:   '#10b981',  // emerald
  Note:       '#94a3b8',  // slate
};

/** A single recruiter update / note logged against a bench resource. */
export interface BenchUpdate {
  id: string;
  resource_id: string;
  /** ISO date (YYYY-MM-DD) when the activity happened — defaults to today */
  update_date: string;
  /** Free-text body of the update */
  update_text: string;
  /** Type of activity — drives the colored badge in the UI */
  type: BenchUpdateType;
  /** Optional context: client name + role the update relates to */
  client_or_role: string;
  /** Optional recruiter name for attribution */
  recruiter: string;
  /** ISO timestamp when the entry was created */
  created_at: string;
}
