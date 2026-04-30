import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { BenchResource, BenchUpdate } from '../types/openBench';
import { db } from '../lib/supabaseSync';

/* —— No demo seed ——
 * IMPORTANT: This array MUST stay empty.
 * Background: previously this seeded six demo rows (Arun Kumar, Priya
 * Sharma, Ravi Patel, etc.). When a user's localStorage was empty AND
 * Supabase was empty (e.g. after a forced clear), Zustand fell back to
 * this seed and the auto-sync pushed it up to Supabase, clobbering real
 * data. Never restore demo seeds here — Supabase is the source of truth,
 * populated via the dashboard UI or scheduled syncs. */
const SEED_RESOURCES: BenchResource[] = [];

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

  /** Internal: hydrated by App.tsx on init + realtime callbacks */
  _setFromSupabase: (resources: BenchResource[], updates: BenchUpdate[]) => void;
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
        db.upsertOpenBenchResource(r);
        return r;
      },

      updateResource: (id, patch) => {
        set((s) => ({
          resources: s.resources.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r,
          ),
        }));
        const updated = get().resources.find((r) => r.id === id);
        if (updated) db.upsertOpenBenchResource(updated);
      },

      removeResource: (id) => {
        set((s) => ({
          resources: s.resources.filter((r) => r.id !== id),
          // Cascade locally — Supabase cascades server-side via deleteOpenBenchResource
          updates: s.updates.filter((u) => u.resource_id !== id),
        }));
        db.deleteOpenBenchResource(id);
      },

      addUpdate: (input) => {
        const u: BenchUpdate = {
          ...input,
          id: nanoid(),
          created_at: new Date().toISOString(),
        };
        set((s) => ({ updates: [...s.updates, u] }));
        db.upsertOpenBenchUpdate(u);
        // Bump the resource's updated_at so "most recently updated" sort works
        const stamp = u.created_at;
        set((s) => ({
          resources: s.resources.map((r) =>
            r.id === input.resource_id ? { ...r, updated_at: stamp } : r,
          ),
        }));
        const bumped = get().resources.find((r) => r.id === input.resource_id);
        if (bumped) db.upsertOpenBenchResource(bumped);
        return u;
      },

      updateUpdate: (id, patch) => {
        set((s) => ({
          updates: s.updates.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
        const updated = get().updates.find((u) => u.id === id);
        if (updated) db.upsertOpenBenchUpdate(updated);
      },

      removeUpdate: (id) => {
        set((s) => ({ updates: s.updates.filter((u) => u.id !== id) }));
        db.deleteOpenBenchUpdate(id);
      },

      updatesFor: (resourceId) =>
        get().updates
          .filter((u) => u.resource_id === resourceId)
          .sort((a, b) => {
            // newest first by update_date, tiebreak by created_at
            const d = b.update_date.localeCompare(a.update_date);
            return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
          }),

      _setFromSupabase: (resources, updates) => set({ resources, updates }),
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
