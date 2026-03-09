import { Role, Seniority, Specialization } from './team';

export interface KPI {
  label: string;
  value: number | string;
  previousValue: number | string | null;
  unit: 'count' | 'percent' | 'days';
  trend: 'up' | 'down' | 'flat';
  trendIsPositive: boolean;
}

export interface SupplyDemandGap {
  role: Role;
  seniority: Seniority;
  specialization: Specialization;
  supply: number;
  demand: number;
  gap: number;
}

export interface UtilizationSnapshot {
  period: string;
  totalMembers: number;
  deployedCount: number;
  benchCount: number;
  utilizationPercent: number;
  byRole: Record<Role, number>;
  bySeniority: Record<Seniority, number>;
}
