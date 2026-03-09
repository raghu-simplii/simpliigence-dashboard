import type { ID, Timestamped } from './common';
import type { Role, Seniority, Specialization } from './team';

export type HiringStage =
  | 'sourcing'
  | 'screening'
  | 'technical_interview'
  | 'client_interview'
  | 'offer'
  | 'joined'
  | 'rejected'
  | 'withdrawn';

export interface StageTransition {
  from: HiringStage;
  to: HiringStage;
  date: string;
  notes: string;
}

export interface Candidate extends Timestamped {
  id: ID;
  name: string;
  email: string;
  phone: string;
  currentStage: HiringStage;
  targetRole: Role;
  targetSeniority: Seniority;
  specializations: Specialization[];
  targetProjectId: ID | null;
  isForTM: boolean;
  source: string;
  expectedJoinDate: string | null;
  stageHistory: StageTransition[];
  notes: string;
}
