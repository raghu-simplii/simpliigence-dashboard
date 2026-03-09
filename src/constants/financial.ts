import type { Role, Seniority, SelectOption } from '../types';

export const DEFAULT_RATE_CARDS: Array<{
  role: Role;
  seniority: Seniority;
  monthlyCTC: number;
  monthlyBillingRate: number;
}> = [
  { role: 'salesforce_developer', seniority: 'associate',  monthlyCTC: 50000,   monthlyBillingRate: 150000 },
  { role: 'salesforce_developer', seniority: 'consultant', monthlyCTC: 80000,   monthlyBillingRate: 225000 },
  { role: 'salesforce_developer', seniority: 'senior',     monthlyCTC: 120000,  monthlyBillingRate: 350000 },
  { role: 'salesforce_developer', seniority: 'principal',  monthlyCTC: 175000,  monthlyBillingRate: 500000 },
  { role: 'technical_lead',       seniority: 'associate',  monthlyCTC: 60000,   monthlyBillingRate: 175000 },
  { role: 'technical_lead',       seniority: 'consultant', monthlyCTC: 100000,  monthlyBillingRate: 275000 },
  { role: 'technical_lead',       seniority: 'senior',     monthlyCTC: 150000,  monthlyBillingRate: 425000 },
  { role: 'technical_lead',       seniority: 'principal',  monthlyCTC: 200000,  monthlyBillingRate: 575000 },
  { role: 'business_analyst',     seniority: 'associate',  monthlyCTC: 45000,   monthlyBillingRate: 125000 },
  { role: 'business_analyst',     seniority: 'consultant', monthlyCTC: 70000,   monthlyBillingRate: 200000 },
  { role: 'business_analyst',     seniority: 'senior',     monthlyCTC: 110000,  monthlyBillingRate: 300000 },
  { role: 'business_analyst',     seniority: 'principal',  monthlyCTC: 160000,  monthlyBillingRate: 450000 },
  { role: 'architect',            seniority: 'associate',  monthlyCTC: 70000,   monthlyBillingRate: 200000 },
  { role: 'architect',            seniority: 'consultant', monthlyCTC: 120000,  monthlyBillingRate: 325000 },
  { role: 'architect',            seniority: 'senior',     monthlyCTC: 180000,  monthlyBillingRate: 500000 },
  { role: 'architect',            seniority: 'principal',  monthlyCTC: 250000,  monthlyBillingRate: 700000 },
  { role: 'project_manager',      seniority: 'associate',  monthlyCTC: 50000,   monthlyBillingRate: 150000 },
  { role: 'project_manager',      seniority: 'consultant', monthlyCTC: 85000,   monthlyBillingRate: 250000 },
  { role: 'project_manager',      seniority: 'senior',     monthlyCTC: 130000,  monthlyBillingRate: 375000 },
  { role: 'project_manager',      seniority: 'principal',  monthlyCTC: 185000,  monthlyBillingRate: 525000 },
];

export const DEFAULT_EXCHANGE_RATE = 83.5;

export const BILLING_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Fixed Price', value: 'fixed' },
  { label: 'Monthly Billing', value: 'monthly' },
];
