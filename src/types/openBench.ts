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
  notes: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}
