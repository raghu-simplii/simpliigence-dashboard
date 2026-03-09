import type { ID, Timestamped } from './common';
import type { Role, Seniority, Specialization } from './team';

export type ProjectType = 'fixed_6w' | 'fixed_12w' | 'fixed_6m' | 'tam' | 'tm_ongoing' | 'tm_6m';

export type ProjectStatus =
  | 'pipeline'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export interface StaffingRequirement {
  id: ID;
  role: Role;
  seniority: Seniority;
  specializations: Specialization[];
  count: number;
  filledCount: number;
  assignedMemberIds: ID[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface Project extends Timestamped {
  id: ID;
  name: string;
  clientName: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  staffingRequirements: StaffingRequirement[];
  notes: string;
  contractValue: number | null;
  monthlyBudget: number | null;
  billingType: 'fixed' | 'monthly';
}
