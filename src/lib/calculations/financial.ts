import type {
  TeamMember, Project, Candidate, RateCard, HiringBudget,
  FinancialSnapshot, ProjectFinancialSummary,
} from '../../types';
import { differenceInMonths, parseISO } from 'date-fns';

// ── Currency helpers ───────────────────────────────────

export function formatINR(inr: number): string {
  if (inr === 0) return '0';
  const abs = Math.abs(inr);
  const sign = inr < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(2)}L`;
  return `${sign}${abs.toLocaleString('en-IN')}`;
}

export function inrToUsd(inr: number, exchangeRate: number): number {
  if (exchangeRate <= 0) return 0;
  return Math.round((inr / exchangeRate) * 100) / 100;
}

export function formatDual(inr: number, exchangeRate: number): string {
  const primary = `₹${formatINR(inr)}`;
  if (exchangeRate <= 0) return primary;
  const usd = inrToUsd(inr, exchangeRate);
  return `${primary} ($${usd.toLocaleString('en-US')})`;
}

// ── Member cost/billing resolution ─────────────────────

export function getMemberMonthlyCTC(
  member: TeamMember,
  rateCards: RateCard[]
): number {
  if (member.ctcMonthly !== null && member.ctcMonthly > 0) return member.ctcMonthly;
  const card = rateCards.find(
    (rc) => rc.role === member.role && rc.seniority === member.seniority
  );
  return card?.monthlyCTC ?? 0;
}

export function getMemberMonthlyBilling(
  member: TeamMember,
  rateCards: RateCard[]
): number {
  if (member.billingRateMonthly !== null && member.billingRateMonthly > 0)
    return member.billingRateMonthly;
  const card = rateCards.find(
    (rc) => rc.role === member.role && rc.seniority === member.seniority
  );
  return card?.monthlyBillingRate ?? 0;
}

// ── Main financial snapshot ────────────────────────────

export function calculateFinancialSnapshot(
  members: TeamMember[],
  _projects: Project[],
  candidates: Candidate[],
  rateCards: RateCard[],
  hiringBudgets: HiringBudget[]
): FinancialSnapshot {
  const benchMembers = members.filter((m) => m.status === 'bench');
  const benchCostMonthly = benchMembers.reduce(
    (sum, m) => sum + getMemberMonthlyCTC(m, rateCards),
    0
  );

  const activeMembers = members.filter((m) => m.status !== 'notice_period');
  const totalMonthlyCost = activeMembers.reduce(
    (sum, m) => sum + getMemberMonthlyCTC(m, rateCards),
    0
  );

  const deployedMembers = members.filter(
    (m) => m.status === 'deployed' || m.status === 'rolling_off'
  );
  const totalMonthlyRevenue = deployedMembers.reduce(
    (sum, m) => {
      const billing = getMemberMonthlyBilling(m, rateCards);
      const util = (m.utilizationPercent ?? 100) / 100;
      return sum + billing * util;
    },
    0
  );

  const revenuePerHead =
    deployedMembers.length > 0 ? totalMonthlyRevenue / deployedMembers.length : 0;

  const overallMarginPercent =
    totalMonthlyRevenue > 0
      ? Math.round(((totalMonthlyRevenue - totalMonthlyCost) / totalMonthlyRevenue) * 100)
      : 0;

  const hiringBudgetAllocated = hiringBudgets.reduce(
    (sum, b) => sum + b.allocatedAmount,
    0
  );

  const joinedCandidates = candidates.filter((c) => c.currentStage === 'joined');
  const hiringBudgetSpent = joinedCandidates.reduce((sum, c) => {
    const card = rateCards.find(
      (rc) => rc.role === c.targetRole && rc.seniority === c.targetSeniority
    );
    return sum + (card?.monthlyCTC ?? 0) * 12;
  }, 0);

  return {
    benchCostMonthly,
    benchMemberCount: benchMembers.length,
    hiringBudgetAllocated,
    hiringBudgetSpent,
    hiringBudgetRemaining: hiringBudgetAllocated - hiringBudgetSpent,
    totalMonthlyRevenue,
    totalMonthlyCost,
    overallMarginPercent,
    revenuePerHead,
  };
}

// ── Per-project financials ─────────────────────────────

export function calculateProjectFinancials(
  project: Project,
  members: TeamMember[],
  rateCards: RateCard[]
): ProjectFinancialSummary {
  const assignedMembers = members.filter(
    (m) => m.currentProjectId === project.id
  );

  const totalTeamCostMonthly = assignedMembers.reduce(
    (sum, m) => sum + getMemberMonthlyCTC(m, rateCards),
    0
  );

  const start = project.startDate ? parseISO(project.startDate) : new Date();
  const end = project.endDate ? parseISO(project.endDate) : new Date();
  const durationMonths = Math.max(1, differenceInMonths(end, start) || 1);

  const totalTeamCostOverDuration = totalTeamCostMonthly * durationMonths;

  let estimatedRevenue = 0;
  if (project.billingType === 'fixed' && project.contractValue) {
    estimatedRevenue = project.contractValue;
  } else if (project.billingType === 'monthly' && project.monthlyBudget) {
    estimatedRevenue = project.monthlyBudget * durationMonths;
  } else if (project.contractValue) {
    estimatedRevenue = project.contractValue;
  }

  const marginAmount = estimatedRevenue - totalTeamCostOverDuration;
  const marginPercent =
    estimatedRevenue > 0
      ? Math.round((marginAmount / estimatedRevenue) * 100)
      : 0;

  return {
    projectId: project.id,
    projectName: project.name,
    clientName: project.clientName,
    budgetValue: project.contractValue ?? 0,
    totalTeamCostMonthly,
    totalTeamCostOverDuration,
    estimatedRevenue,
    marginAmount,
    marginPercent,
    headcount: assignedMembers.length,
    durationMonths,
  };
}

export function calculateAllProjectFinancials(
  projects: Project[],
  members: TeamMember[],
  rateCards: RateCard[]
): ProjectFinancialSummary[] {
  return projects
    .filter((p) => !['completed', 'cancelled'].includes(p.status))
    .map((p) => calculateProjectFinancials(p, members, rateCards))
    .sort((a, b) => b.marginPercent - a.marginPercent);
}
