import type { Role, Seniority, Specialization, MemberStatus, SelectOption } from '../types';

export const ROLES: SelectOption<Role>[] = [
  { label: 'Salesforce Developer', value: 'salesforce_developer' },
  { label: 'Technical Lead', value: 'technical_lead' },
  { label: 'Business Analyst', value: 'business_analyst' },
  { label: 'Architect', value: 'architect' },
  { label: 'Project Manager', value: 'project_manager' },
];

export const SENIORITY_LEVELS: SelectOption<Seniority>[] = [
  { label: 'Associate', value: 'associate' },
  { label: 'Consultant', value: 'consultant' },
  { label: 'Senior', value: 'senior' },
  { label: 'Principal', value: 'principal' },
];

export const SPECIALIZATIONS: SelectOption<Specialization>[] = [
  { label: 'Apex', value: 'apex' },
  { label: 'LWC', value: 'lwc' },
  { label: 'Flows', value: 'flows' },
  { label: 'Health Cloud', value: 'health_cloud' },
  { label: 'Financial Services Cloud', value: 'financial_services_cloud' },
  { label: 'Vlocity', value: 'vlocity' },
  { label: 'CPQ', value: 'cpq' },
  { label: 'Marketing Cloud', value: 'marketing_cloud' },
  { label: 'Data Cloud', value: 'data_cloud' },
];

export const MEMBER_STATUSES: SelectOption<MemberStatus>[] = [
  { label: 'Deployed', value: 'deployed' },
  { label: 'Bench', value: 'bench' },
  { label: 'Rolling Off', value: 'rolling_off' },
  { label: 'Notice Period', value: 'notice_period' },
  { label: 'On Leave', value: 'on_leave' },
];

export const ROLE_LABELS: Record<Role, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
) as Record<Role, string>;

export const SENIORITY_LABELS: Record<Seniority, string> = Object.fromEntries(
  SENIORITY_LEVELS.map((s) => [s.value, s.label])
) as Record<Seniority, string>;

export const SPECIALIZATION_LABELS: Record<Specialization, string> = Object.fromEntries(
  SPECIALIZATIONS.map((s) => [s.value, s.label])
) as Record<Specialization, string>;

export const STATUS_LABELS: Record<MemberStatus, string> = Object.fromEntries(
  MEMBER_STATUSES.map((s) => [s.value, s.label])
) as Record<MemberStatus, string>;
