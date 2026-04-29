import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { IndiaRosterMember } from '../types/indiaRoster';
import { db } from '../lib/supabaseSync';

interface IndiaRosterState {
  members: IndiaRosterMember[];

  addMember: (m: Omit<IndiaRosterMember, 'id' | 'created_at' | 'updated_at'>) => IndiaRosterMember;
  updateMember: (id: string, patch: Partial<IndiaRosterMember>) => void;
  removeMember: (id: string) => void;

  /** Hydrate from Supabase (called by App init + realtime). */
  _setFromSupabase: (members: IndiaRosterMember[]) => void;
}

export const useIndiaRosterStore = create<IndiaRosterState>()(
  persist(
    (set, get) => ({
      members: [],

      addMember: (input) => {
        const now = new Date().toISOString();
        const m: IndiaRosterMember = { ...input, id: nanoid(), created_at: now, updated_at: now };
        set((s) => ({ members: [...s.members, m] }));
        db.upsertIndiaRosterMember(m);
        return m;
      },

      updateMember: (id, patch) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id ? { ...m, ...patch, updated_at: new Date().toISOString() } : m,
          ),
        }));
        const updated = get().members.find((m) => m.id === id);
        if (updated) db.upsertIndiaRosterMember(updated);
      },

      removeMember: (id) => {
        set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
        db.deleteIndiaRosterMember(id);
      },

      _setFromSupabase: (members) => set({ members }),
    }),
    { name: 'simpliigence-india-roster', version: 1 },
  ),
);
