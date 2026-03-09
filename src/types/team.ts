import { ID, Timestamped } from './common';

export type Role =
  | 'salesforce_developer'
  | 'technical_lead'
  | 'business_analyst'
  | 'architect'
  | 'project_manager';

export type Seniority = 'associate' | 'consultant' | 'senior' | 'principal';

export type Specialization =
  | 'apex'
  | 'lwc'
  | 'flows'
  | 'health_cloud'
  | 'financial_services_cloud'
  | 'vlocity'
  | 'cpq'
  | 'marketing_cloud'
  | 'data_cloud';

export type MemberStatus =
  | 'deployed'
  | 'bench'
  | 'rolling_off'
  | 'notice_period'
  | 'on_leave';

export interface TeamMember extends Timestamped {
  id: ID;
  name: string;
  email: string;
  role: Role;
  seniority: Seniority;
  specializations: Specialization[];
  status: MemberStatus;
  currentProjectId: ID | null;
  availableFrom: string | null;
  benchSince: string | null;
  notes: string;
  ctcMonthly: number | null;
  billingRateMonthly: number | null;
  utilizationPercent: number;  // 0–100; 40h/week = 100%
}
