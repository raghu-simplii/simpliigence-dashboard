import type { ID } from './common';
import type { Role, Seniority } from './team';

export interface RateCard {
  id: ID;
  role: Role;
  seniority: Seniority;
  monthlyCTC: number;
  monthlyBillingRate: number;
}

export interface HiringBudget {
  id: ID;
  period: string;
  allocatedAmount: number;
  notes: string;
}

export interface FinancialSettings {
  exchangeRate: number;
  displayCurrency: 'inr' | 'usd';
}

export interface FinancialSnapshot {
  benchCostMonthly: number;
  benchMemberCount: number;
  hiringBudgetAllocated: number;
  hiringBudgetSpent: number;
  hiringBudgetRemaining: number;
  totalMonthlyRevenue: number;
  totalMonthlyCost: number;
  overallMarginPercent: number;
  revenuePerHead: number;
}

export interface ProjectFinancialSummary {
  projectId: ID;
  projectName: string;
  clientName: string;
  budgetValue: number;
  totalTeamCostMonthly: number;
  totalTeamCostOverDuration: number;
  estimatedRevenue: number;
  marginAmount: number;
  marginPercent: number;
  headcount: number;
  durationMonths: number;
}
