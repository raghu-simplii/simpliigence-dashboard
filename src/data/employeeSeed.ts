/**
 * Seed data from "List of all Employees.xlsx" – Forecasting Hrs sheet.
 * Used for first-visit experience before Dropbox sync is configured.
 */
import { nanoid } from 'nanoid';
import type { ForecastAssignment, Month } from '../types/forecast';

type MH = Record<Month, number>;
const mh = (jan: number, feb: number, mar: number, apr: number, may: number, jun: number): MH => ({
  Jan: jan, Feb: feb, Mar: mar, Apr: apr, May: may, Jun: jun,
  Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
});

interface SeedRow {
  name: string;
  role: string;
  rate: number | null;
  isSI: boolean;
  isContractor: boolean;
  project: string;
  monthly: MH;
}

const SEED_ROWS: SeedRow[] = [
  // AboveAll
  { name: 'Kamalapuram Balaji', role: 'Developer', rate: 9, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(136, 48, 42, 0, 0, 0) },
  { name: 'Sailendraraj Singh', role: 'Developer', rate: 15, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(144, 119.5, 92, 0, 0, 0) },
  { name: 'Pooja Sharma', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(120, 146.5, 59, 0, 0, 0) },
  { name: 'Sunil C', role: 'Quality Assurance', rate: 10, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(96.5, 34.5, 5, 0, 0, 0) },
  { name: 'Syed Mohaseen Elahi Hossain', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(108, 17, 0, 0, 0, 0) },
  { name: 'Vinod', role: 'Quality Assurance', rate: 22.5, isSI: false, isContractor: false, project: 'AboveAll', monthly: mh(41.5, 41, 0, 0, 0, 0) },
  { name: 'Mohan', role: 'Developer', rate: 22.5, isSI: false, isContractor: false, project: 'AboveAll', monthly: mh(80, 120, 0, 0, 0, 0) },
  { name: 'Shikhar Sharma', role: 'Developer', rate: 9, isSI: false, isContractor: false, project: 'AboveAll', monthly: mh(0, 3.5, 0, 0, 0, 0) },
  { name: 'Pallavi', role: 'Architect', rate: 22.5, isSI: false, isContractor: false, project: 'AboveAll', monthly: mh(3, 12, 0, 0, 0, 0) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(40, 40, 15, 0, 0, 0) },
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: true, isContractor: false, project: 'AboveAll', monthly: mh(21, 18.5, 6.5, 0, 0, 0) },

  // Copeland
  { name: 'Shivam', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'Copeland', monthly: mh(80, 47, 5, 0, 0, 0) },
  { name: 'Pallavi', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'Copeland', monthly: mh(73, 45, 10, 0, 0, 0) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: false, isContractor: false, project: 'Copeland', monthly: mh(30, 40, 10, 0, 0, 0) },
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: false, isContractor: false, project: 'Copeland', monthly: mh(3, 0, 0, 0, 0, 0) },
  { name: 'Sandeep', role: 'Developer', rate: 9, isSI: true, isContractor: false, project: 'Copeland', monthly: mh(144, 129, 28, 0, 0, 0) },

  // Waratah
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: true, isContractor: false, project: 'Waratah', monthly: mh(5, 0, 0, 0, 0, 0) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'Waratah', monthly: mh(15, 0, 0, 0, 0, 0) },
  { name: 'B Chaithanya Kumar Reddy', role: 'Senior Developer', rate: 9, isSI: true, isContractor: false, project: 'Waratah', monthly: mh(48, 0, 0, 0, 0, 0) },

  // LLI
  { name: 'Bhanu Prakash', role: 'Business Analyst', rate: 9, isSI: true, isContractor: false, project: 'LLI', monthly: mh(76, 85, 60, 40, 40, 40) },
  { name: 'Kokila', role: 'Team Lead', rate: 10, isSI: true, isContractor: false, project: 'LLI', monthly: mh(122, 141, 186, 160, 160, 160) },
  { name: 'Arprit', role: 'Senior Developer', rate: 10, isSI: true, isContractor: false, project: 'LLI', monthly: mh(137, 140, 187, 160, 160, 160) },
  { name: 'Syed Mohaseen Elahi Hossain', role: 'Business Analyst', rate: 15, isSI: false, isContractor: false, project: 'LLI', monthly: mh(0, 2, 163, 160, 160, 160) },
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: true, isContractor: false, project: 'LLI', monthly: mh(17.5, 12.5, 44, 40, 40, 40) },

  // CoolAir
  { name: 'Shivam', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(44, 82.5, 100, 80, 60, 60) },
  { name: 'Pallavi', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(1, 56, 110, 80, 80, 80) },
  { name: 'Thushar', role: 'Quality Assurance', rate: 30, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(0, 52, 65, 80, 60, 0) },
  { name: 'Pawan Angad Thote', role: 'Senior Developer', rate: 15, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(0, 104, 154, 120, 90, 10) },
  { name: 'B Chaithanya Kumar Reddy', role: 'Senior Developer', rate: 15.5, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(0, 15, 168, 144, 60, 70) },
  { name: 'Kamalapuram Balaji', role: 'Developer', rate: 15.5, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(0, 88, 150, 160, 120, 10) },
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(10.5, 12, 23.5, 20, 20, 20) },
  { name: 'Shikhar Sharma', role: 'Developer', rate: 9, isSI: false, isContractor: false, project: 'CoolAir', monthly: mh(0, 36, 105, 0, 0, 0) },
  { name: 'Sunil C', role: 'Quality Assurance', rate: 10, isSI: false, isContractor: false, project: 'CoolAir', monthly: mh(0, 49.5, 100, 80, 60, 0) },
  { name: 'Vinod', role: 'Quality Assurance', rate: 22.5, isSI: false, isContractor: false, project: 'CoolAir', monthly: mh(0, 2, 50, 40, 30, 0) },
  { name: 'Sandeep', role: 'Developer', rate: 9, isSI: false, isContractor: false, project: 'CoolAir', monthly: mh(0, 0, 32, 0, 0, 0) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'CoolAir', monthly: mh(40, 20, 25, 20, 20, 20) },

  // Concierge
  { name: 'Shikhar Sharma', role: 'Developer', rate: 9, isSI: true, isContractor: false, project: 'Concierge', monthly: mh(160, 0, 5, 0, 0, 0) },
  { name: 'Joseph Sunil Joseph', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'Concierge', monthly: mh(144, 144, 160, 120, 120, 120) },
  { name: 'Sourabh Pradhan', role: 'Developer', rate: 9, isSI: true, isContractor: false, project: 'Concierge', monthly: mh(155, 154, 200, 160, 160, 0) },

  // Protectolite
  { name: 'Pooja Sharma', role: 'Business Analyst', rate: 15, isSI: false, isContractor: false, project: 'Protectolite', monthly: mh(0, 20, 50, 0, 0, 0) },

  // Matheson
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: true, isContractor: false, project: 'Matheson', monthly: mh(6.5, 1, 11, 0, 0, 0) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: true, isContractor: false, project: 'Matheson', monthly: mh(6, 6, 5, 0, 0, 0) },
  { name: 'Syed Mohaseen Elahi Hossain', role: 'Business Analyst', rate: 15, isSI: true, isContractor: false, project: 'Matheson', monthly: mh(36, 34.5, 0, 0, 0, 0) },
  { name: 'Sujatha', role: 'Architect', rate: 15, isSI: false, isContractor: true, project: 'Matheson', monthly: mh(113, 3, 0, 0, 0, 0) },
  { name: 'Sudarsanam Anu Sai Kumar', role: 'Developer', rate: 10, isSI: true, isContractor: false, project: 'Matheson', monthly: mh(14.67, 64.5, 54, 0, 0, 0) },

  // Waratah (contractor)
  { name: 'Sujatha', role: 'Architect', rate: 15, isSI: false, isContractor: true, project: 'Waratah', monthly: mh(113, 3, 0, 0, 0, 0) },

  // CoolAir (contractor)
  { name: 'Rahul', role: 'Senior Developer', rate: 22.5, isSI: false, isContractor: true, project: 'CoolAir', monthly: mh(20, 16, 100, 80, 0, 0) },

  // QUData
  { name: 'Vasanth', role: 'Manager', rate: 22.5, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 10, 10, 10, 2.5) },
  { name: 'Anupama', role: 'Architect', rate: 22.5, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 40, 40, 40, 10) },
  { name: 'Pooja Sharma', role: 'Business Analyst', rate: 15, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 60, 80, 80, 50) },
  { name: 'Mohan', role: 'Developer', rate: 22.5, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 120, 160, 160, 100) },
  { name: 'Sailendraraj Singh', role: 'Developer', rate: 15, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 100, 160, 160, 100) },
  { name: 'B Chaithanya Kumar Reddy', role: 'Senior Developer', rate: 15.5, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 40, 80, 80, 0) },
  { name: 'Shivam', role: 'Business Analyst', rate: 15, isSI: false, isContractor: false, project: 'QUData', monthly: mh(0, 0, 8, 0, 0, 0) },
];

export function buildSeedAssignments(): ForecastAssignment[] {
  return SEED_ROWS.map((r) => ({
    id: nanoid(),
    employeeName: r.name,
    notes: '',
    role: r.role,
    rateCard: r.rate,
    isSI: r.isSI,
    isContractor: r.isContractor,
    project: r.project,
    weeklyHours: {},
    monthlyTotals: r.monthly,
  }));
}

export async function loadSeedIntoStores(): Promise<void> {
  const { db } = await import('../lib/supabaseSync');
  const assignments = buildSeedAssignments();
  // Write to Supabase
  await db.replaceAllAssignments(assignments, []);
  // Reload page to pick up new data
  window.location.reload();
}
