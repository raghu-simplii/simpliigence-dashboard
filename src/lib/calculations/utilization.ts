import type { TeamMember, Role, Seniority, UtilizationSnapshot } from '../../types';

const ALL_ROLES: Role[] = ['salesforce_developer', 'technical_lead', 'business_analyst', 'architect', 'project_manager'];
const ALL_SENIORITY: Seniority[] = ['associate', 'consultant', 'senior', 'principal'];

export function calculateUtilization(members: TeamMember[], period: string): UtilizationSnapshot {
  const active = members.filter((m) => m.status !== 'notice_period' && m.status !== 'on_leave');
  const total = active.length;
  const deployed = active.filter((m) => m.status === 'deployed' || m.status === 'rolling_off').length;
  const bench = active.filter((m) => m.status === 'bench').length;

  // Weighted utilization: average of individual utilization percentages
  const weightedUtil = total > 0
    ? Math.round(active.reduce((sum, m) => sum + (m.utilizationPercent ?? (m.status === 'deployed' ? 100 : 0)), 0) / total)
    : 0;

  const byRole = {} as Record<Role, number>;
  for (const role of ALL_ROLES) {
    const rm = active.filter((m) => m.role === role);
    byRole[role] = rm.length > 0
      ? Math.round(rm.reduce((sum, m) => sum + (m.utilizationPercent ?? (m.status === 'deployed' ? 100 : 0)), 0) / rm.length)
      : 0;
  }

  const bySeniority = {} as Record<Seniority, number>;
  for (const sen of ALL_SENIORITY) {
    const sm = active.filter((m) => m.seniority === sen);
    bySeniority[sen] = sm.length > 0
      ? Math.round(sm.reduce((sum, m) => sum + (m.utilizationPercent ?? (m.status === 'deployed' ? 100 : 0)), 0) / sm.length)
      : 0;
  }

  return {
    period,
    totalMembers: total,
    deployedCount: deployed,
    benchCount: bench,
    utilizationPercent: weightedUtil,
    byRole,
    bySeniority,
  };
}
