import { Role, Seniority, Specialization } from './team';

export interface ZohoPosition {
  zohoId: string;
  title: string;
  clientName: string;
  skills: Specialization[];
  role: Role;
  seniority: Seniority;
  postedDate: string;
  filledDate: string | null;
  status: 'open' | 'filled' | 'closed' | 'on_hold';
  daysOpen: number;
}

export interface SkillDemandMetric {
  skill: Specialization;
  role: Role;
  totalPositions: number;
  filledPositions: number;
  fillRatePercent: number;
  avgDaysToFill: number;
  demandFrequency: number;
  openNow: number;
  confidenceScore: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  trend: 'rising' | 'stable' | 'declining';
}

export interface TMSyncState {
  lastSyncAt: string | null;
  isConnected: boolean;
  positionCount: number;
  error: string | null;
}
