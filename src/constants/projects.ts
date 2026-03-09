import type { ProjectType, ProjectStatus, SelectOption } from '../types';

export const PROJECT_TYPES: SelectOption<ProjectType>[] = [
  { label: 'Fixed - 6 Weeks', value: 'fixed_6w' },
  { label: 'Fixed - 12 Weeks', value: 'fixed_12w' },
  { label: 'Fixed - 6 Months', value: 'fixed_6m' },
  { label: 'T&M / Staffing', value: 'tam' },
];

export const PROJECT_STATUSES: SelectOption<ProjectStatus>[] = [
  { label: 'Pipeline', value: 'pipeline' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = Object.fromEntries(
  PROJECT_TYPES.map((p) => [p.value, p.label])
) as Record<ProjectType, string>;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_STATUSES.map((p) => [p.value, p.label])
) as Record<ProjectStatus, string>;

export const PRIORITY_OPTIONS: SelectOption[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];
