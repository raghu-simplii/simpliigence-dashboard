import type { HiringStage, SelectOption } from '../types';

export const HIRING_STAGES: SelectOption<HiringStage>[] = [
  { label: 'Sourcing', value: 'sourcing' },
  { label: 'Screening', value: 'screening' },
  { label: 'Technical Interview', value: 'technical_interview' },
  { label: 'Client Interview', value: 'client_interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Joined', value: 'joined' },
];

export const ACTIVE_STAGES: HiringStage[] = [
  'sourcing',
  'screening',
  'technical_interview',
  'client_interview',
  'offer',
];

export const STAGE_LABELS: Record<HiringStage, string> = {
  sourcing: 'Sourcing',
  screening: 'Screening',
  technical_interview: 'Technical',
  client_interview: 'Client Interview',
  offer: 'Offer',
  joined: 'Joined',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STAGE_COLORS: Record<HiringStage, string> = {
  sourcing: '#94a3b8',
  screening: '#3b82f6',
  technical_interview: '#8b5cf6',
  client_interview: '#f59e0b',
  offer: '#10b981',
  joined: '#059669',
  rejected: '#ef4444',
  withdrawn: '#6b7280',
};

export const CANDIDATE_SOURCES: SelectOption[] = [
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Naukri', value: 'naukri' },
  { label: 'Referral', value: 'referral' },
  { label: 'Agency', value: 'agency' },
  { label: 'Zoho Recruit', value: 'zoho' },
  { label: 'Direct', value: 'direct' },
];
