import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { BenchResource, BenchUpdate } from '../types/openBench';

/* —— Seed data —— */
const SEED_RESOURCES: BenchResource[] = [
  { id: 'br-1', resource_name: 'Arun Kumar', years_of_experience: 8, visa_category: 'H1B', primary_skill: 'Salesforce', roles: 'SF Developer / SF Architect', job_priority: 'Primary', target_rate: 75, location: 'Dallas, TX', key_opportunities: '', notes: 'Available immediately', available: true, created_at: '2025-04-01', updated_at: '2025-04-01' },
  { id: 'br-2', resource_name: 'Priya Sharma', years_of_experience: 5, visa_category: 'L1', primary_skill: 'Java Full Stack', roles: 'Java Developer', job_priority: 'Primary', target_rate: 65, location: 'Chicago, IL', key_opportunities: '', notes: 'Available from April 15', available: true, created_at: '2025-04-01', updated_at: '2025-04-01' },
  { id: 'br-3', resource_name: 'Ravi Patel', years_of_experience: 10, visa_category: 'GC', primary_skill: 'Python AI/ML', roles: 'ML Engineer / Data Scientist', job_priority: 'Primary', target_rate: 90, location: 'San Francisco, CA', key_opportunities: '', notes: 'On bench since March 20', available: true, created_at: '2025-03-20', updated_at: '2025-04-01' },
  { id: 'br-4', resource_name: 'Sneha Reddy', years_of_experience: 3, visa_category: 'OPT', primary_skill: '.NET', roles: '.NET Developer', job_priority: 'Secondary', target_rate: 50, location: 'Atlanta, GA', key_opportunities: '', notes: 'OPT expires Aug 2025', available: true, created_at: '2025-04-01', updated_at: '2025-04-01' },
  { id: 'br-5', resource_name: 'Vikram Singh', years_of_experience: 12, visa_category: 'US Citizen', primary_skill: 'DevOps', roles: 'DevOps Lead / SRE', job_priority: 'Primary', target_rate: 95, location: 'New York, NY', key_opportunities: '', notes: 'Available immediately', available: true, created_at: '2025-03-25', updated_at: '2025-04-01' },
  { id: 'br-6', resource_name: 'Meena Iyer', years_of_experience: 6, visa_category: 'H4 EAD', primary_skill: 'QA Automation', roles: 'QA Lead / SDET', job_priority: 'Secondary', target_rate: 60, location: 'Seattle, WA', key_opportunities: '', notes: 'Selenium, Cypress expert', available: true, created_at: '2025-04-01', updated_at: '2025-04-01' },
];

/* —— Store —— */
interface OpenBenchState {
  resources: BenchResource[];
  /** Daily updates / submissions / notes per bench resource. */
  updates: BenchUpdate[];

  addResource: (res: Omit<BenchResource, 'id' | 'created_at' | 'updated_at'>) => BenchResource;
  updateResource: (id: string, patch: Partial<BenchResource>) => void;
  removeResource: (id: string) => void;

  /** Add a recruiter update against a bench resource. */
  addUpdate: (u: Omit<BenchUpdate, 'id' | 'created_at'>) => BenchUpdate;
  updateUpdate: (id: string, patch: Partial<BenchUpdate>) => void;
  removeUpdate: (id: string) => void;
  /** Get updates for a specific resource, newest first. */
  updatesFor: (resourceId: string) => BenchUpdate[];
}

export const useOpenBenchStore = create<OpenBenchState>()(
  persist(
    (set, get) => ({
      resources: SEED_RESOURCES,
      updates: [],

      addResource: (res) => {
        const now = new Date().toISOString();
        const r: BenchResource = { ...res, id: nanoid(), created_at: now, updated_at: now };
        set((s) => ({ resources: [...s.resources, r] }));
        return r;
      },

      updateResource: (id, patch) =>
        set((s) => ({
          resources: s.resources.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r,
          ),
        })),

      removeResource: (id) =>
        set((s) => ({
          resources: s.resources.filter((r) => r.id !== id),
          // Cascade delete any updates tied to this resource so localStorage doesn't bloat
          updates: s.updates.filter((u) => u.resource_id !== id),
        })),

      addUpdate: (input) => {
        const u: BenchUpdate = {
          ...input,
          id: nanoid(),
          created_at: new Date().toISOString(),
        };
        set((s) => ({ updates: [...s.updates, u] }));
        // Bump the resource's updated_at so "most recently updated" sort works
        set((s) => ({
          resources: s.resources.map((r) =>
            r.id === input.resource_id ? { ...r, updated_at: u.created_at } : r,
          ),
        }));
        return u;
      },

      updateUpdate: (id, patch) =>
        set((s) => ({
          updates: s.updates.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        })),

      removeUpdate: (id) =>
        set((s) => ({ updates: s.updates.filter((u) => u.id !== id) })),

      updatesFor: (resourceId) =>
        get().updates
          .filter((u) => u.resource_id === resourceId)
          .sort((a, b) => {
            // newest first by update_date, tiebreak by created_at
            const d = b.update_date.localeCompare(a.update_date);
            return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
          }),
    }),
    {
      name: 'simpliigence-open-bench',
      version: 3,
      // v3 adds `updates` field — non-destructive: existing resources are preserved.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persisted: any) => {
        if (!persisted) return { resources: SEED_RESOURCES, updates: [] };
        return {
          resources: persisted.resources || SEED_RESOURCES,
          updates: persisted.updates || [],
        };
      },
    },
  ),
);
