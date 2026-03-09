/**
 * Seed data derived from "List of all Employees (1).xlsx" – Forecasting Hrs sheet.
 * Captures 23 unique employees across 8 client projects with current utilization
 * status as of the week of March 9 2026.
 */
import { nanoid } from 'nanoid';
import type { Project, ProjectType, ProjectStatus } from '../types/project';
import type { TeamMember, Role, Seniority } from '../types/team';

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */
const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/*  Projects                                                           */
/* ------------------------------------------------------------------ */
interface ProjectSeed {
  key: string;          // lookup key
  name: string;
  client: string;
  type: ProjectType;
  status: ProjectStatus;
  billingType: 'fixed' | 'monthly';
  startDate: string;
}

const PROJECT_SEEDS: ProjectSeed[] = [
  { key: 'AboveAll',    name: 'AboveAll',    client: 'AboveAll',    type: 'tm_ongoing',      status: 'active',    billingType: 'monthly', startDate: '2025-12-01' },
  { key: 'Copeland',    name: 'Copeland',    client: 'Copeland',    type: 'tm_6m',           status: 'active',    billingType: 'monthly', startDate: '2026-01-05' },
  { key: 'CoolAir',     name: 'CoolAir',     client: 'CoolAir',     type: 'tm_ongoing',      status: 'active',    billingType: 'monthly', startDate: '2025-12-01' },
  { key: 'Waratah',     name: 'Waratah',     client: 'Waratah',     type: 'fixed_12w',       status: 'completed', billingType: 'fixed',   startDate: '2025-12-29' },
  { key: 'LLI',         name: 'LLI',         client: 'LLI',         type: 'tm_ongoing',      status: 'active',    billingType: 'monthly', startDate: '2026-01-05' },
  { key: 'Concierge',   name: 'Concierge',   client: 'Concierge',   type: 'tm_6m',           status: 'active',    billingType: 'monthly', startDate: '2026-01-05' },
  { key: 'Protectolite', name: 'Protectolite', client: 'Protectolite', type: 'fixed_12w',    status: 'completed', billingType: 'fixed',   startDate: '2026-02-09' },
  { key: 'Matheson',    name: 'Matheson',    client: 'Matheson',    type: 'tm_ongoing',      status: 'active',    billingType: 'monthly', startDate: '2026-01-12' },
];

/* ------------------------------------------------------------------ */
/*  Employees                                                          */
/* ------------------------------------------------------------------ */
interface EmployeeSeed {
  name: string;
  role: Role;
  seniority: Seniority;
  rateUSD: number;          // billing rate $/hr from spreadsheet
  weeklyHours: number;      // actual hours/week from Forecasting Hrs (week of Mar 9)
  status: 'deployed' | 'bench';
  primaryProject: string | null;   // key into PROJECT_SEEDS
  isContractor: boolean;
  notes: string;
}

const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  // --- DEPLOYED (20) --- weeklyHours from spreadsheet "Forecasting Hrs" week of Mar 9 2026
  { name: 'Kamalapuram Balaji',        role: 'salesforce_developer', seniority: 'senior',     rateUSD: 31,  weeklyHours: 40, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: '' },
  { name: 'Sailendraraj Singh',        role: 'salesforce_developer', seniority: 'senior',     rateUSD: 30,  weeklyHours: 20, status: 'deployed', primaryProject: 'AboveAll',  isContractor: false, notes: '50% utilized' },
  { name: 'Pooja Sharma',              role: 'business_analyst',     seniority: 'senior',     rateUSD: 30,  weeklyHours: 30, status: 'deployed', primaryProject: 'AboveAll',  isContractor: false, notes: '75% utilized' },
  { name: 'Syed Mohaseen',             role: 'business_analyst',     seniority: 'senior',     rateUSD: 30,  weeklyHours: 40, status: 'deployed', primaryProject: 'AboveAll',  isContractor: false, notes: 'Also on Matheson' },
  { name: 'Anupama',                   role: 'technical_lead',       seniority: 'principal',  rateUSD: 45,  weeklyHours: 17, status: 'deployed', primaryProject: 'Copeland',  isContractor: false, notes: 'Also on CoolAir, Matheson — 42% utilized' },
  { name: 'Vasanth',                   role: 'technical_lead',       seniority: 'principal',  rateUSD: 45,  weeklyHours: 20, status: 'deployed', primaryProject: 'LLI',       isContractor: false, notes: 'Also on CoolAir, Copeland — 50% utilized' },
  { name: 'Shivam',                    role: 'business_analyst',     seniority: 'senior',     rateUSD: 30,  weeklyHours: 40, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: 'Also on Copeland' },
  { name: 'Pallavi',                   role: 'technical_lead',       seniority: 'principal',  rateUSD: 45,  weeklyHours: 30, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: '75% utilized' },
  { name: 'Sandeep',                   role: 'salesforce_developer', seniority: 'consultant', rateUSD: 18,  weeklyHours: 40, status: 'deployed', primaryProject: 'Copeland',  isContractor: false, notes: '' },
  { name: 'B Chaithanya Kumar Reddy',  role: 'salesforce_developer', seniority: 'senior',     rateUSD: 31,  weeklyHours: 40, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: '' },
  { name: 'Kokila',                    role: 'salesforce_developer', seniority: 'consultant', rateUSD: 20,  weeklyHours: 40, status: 'deployed', primaryProject: 'LLI',       isContractor: false, notes: '' },
  { name: 'Arprit',                    role: 'salesforce_developer', seniority: 'consultant', rateUSD: 20,  weeklyHours: 40, status: 'deployed', primaryProject: 'LLI',       isContractor: false, notes: '' },
  { name: 'Thushar',                   role: 'project_manager',      seniority: 'principal',  rateUSD: 60,  weeklyHours: 20, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: 'US Resources — 50% utilized' },
  { name: 'Pawan Angad Thote',         role: 'salesforce_developer', seniority: 'senior',     rateUSD: 30,  weeklyHours: 30, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: '75% utilized' },
  { name: 'Shikhar Sharma',            role: 'salesforce_developer', seniority: 'consultant', rateUSD: 18,  weeklyHours: 20, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: 'Also on Concierge — 50% utilized' },
  { name: 'Joseph Sunil Joseph',       role: 'business_analyst',     seniority: 'senior',     rateUSD: 30,  weeklyHours: 10, status: 'deployed', primaryProject: 'Concierge', isContractor: false, notes: '25% utilized' },
  { name: 'Sudarsanam Anu Sai Kumar',  role: 'salesforce_developer', seniority: 'consultant', rateUSD: 20,  weeklyHours: 0,  status: 'bench',   primaryProject: 'Matheson',  isContractor: false, notes: 'Assigned to Matheson but 0h this week' },
  { name: 'Sourabh Pradhan',           role: 'salesforce_developer', seniority: 'consultant', rateUSD: 18,  weeklyHours: 40, status: 'deployed', primaryProject: 'CoolAir',   isContractor: false, notes: '' },
  { name: 'Sujatha',                   role: 'salesforce_developer', seniority: 'consultant', rateUSD: 30,  weeklyHours: 5,  status: 'deployed', primaryProject: 'Matheson',  isContractor: true,  notes: 'Contractor — 12% utilized' },
  { name: 'Rahul',                     role: 'salesforce_developer', seniority: 'consultant', rateUSD: 45,  weeklyHours: 20, status: 'deployed', primaryProject: 'CoolAir',   isContractor: true,  notes: 'Contractor — 50% utilized' },
  // --- BENCH (3) --- 0 hours this week
  { name: 'Sunil C',                   role: 'salesforce_developer', seniority: 'consultant', rateUSD: 20,  weeklyHours: 0,  status: 'bench',    primaryProject: null,        isContractor: false, notes: 'Previously on AboveAll' },
  { name: 'Vinod',                     role: 'salesforce_developer', seniority: 'consultant', rateUSD: 0,   weeklyHours: 0,  status: 'bench',    primaryProject: null,        isContractor: false, notes: '' },
  { name: 'Bhanu Prakash',             role: 'business_analyst',     seniority: 'associate',  rateUSD: 18,  weeklyHours: 0,  status: 'bench',    primaryProject: null,        isContractor: false, notes: 'Previously on LLI' },
];

/* ------------------------------------------------------------------ */
/*  Exchange rate for billing conversion                               */
/* ------------------------------------------------------------------ */
const EXCHANGE_RATE = 83.5; // INR per 1 USD
const HRS_PER_MONTH = 160;

/* ------------------------------------------------------------------ */
/*  Build & Load                                                       */
/* ------------------------------------------------------------------ */
export function buildSeedData() {
  const ts = now();

  // 1. Build projects (with generated IDs)
  const projectIdMap: Record<string, string> = {};
  const projects: Project[] = PROJECT_SEEDS.map((ps) => {
    const id = nanoid();
    projectIdMap[ps.key] = id;
    return {
      id,
      name: ps.name,
      clientName: ps.client,
      type: ps.type,
      status: ps.status,
      startDate: ps.startDate,
      endDate: null,
      staffingRequirements: [],
      notes: '',
      contractValue: null,
      monthlyBudget: null,
      billingType: ps.billingType,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  // 2. Build team members
  const members: TeamMember[] = EMPLOYEE_SEEDS.map((es) => {
    const billingMonthly = es.rateUSD > 0
      ? Math.round(es.rateUSD * HRS_PER_MONTH * EXCHANGE_RATE)
      : null;

    // Utilization: weeklyHours / 40 * 100, capped at 100
    const utilPct = Math.min(100, Math.round((es.weeklyHours / 40) * 100));

    return {
      id: nanoid(),
      name: es.name,
      email: '',
      role: es.role,
      seniority: es.seniority,
      specializations: [],
      status: es.status,
      currentProjectId: es.primaryProject ? (projectIdMap[es.primaryProject] ?? null) : null,
      availableFrom: es.status === 'bench' ? new Date().toISOString().split('T')[0] : '',
      benchSince: es.status === 'bench' ? new Date().toISOString().split('T')[0] : null,
      notes: es.notes,
      ctcMonthly: null,           // use rate-card fallback
      billingRateMonthly: billingMonthly,
      utilizationPercent: utilPct,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  return { projects, members };
}

/**
 * Write seed data directly into the Zustand-persist localStorage keys
 * and reload the page to hydrate stores.
 */
export function loadSeedIntoStores() {
  const { projects, members } = buildSeedData();

  // Team store (version 3 — matches current persist schema with utilizationPercent)
  localStorage.setItem(
    'simpliigence-team',
    JSON.stringify({ state: { members }, version: 3 }),
  );

  // Project store (version 2)
  localStorage.setItem(
    'simpliigence-projects',
    JSON.stringify({ state: { projects }, version: 2 }),
  );

  // Force page reload so Zustand picks up the new data
  window.location.reload();
}
