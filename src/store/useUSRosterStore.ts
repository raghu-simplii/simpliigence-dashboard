import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { USRosterMember } from '../types/usRoster';
import { db } from '../lib/supabaseSync';

interface USRosterState {
  members: USRosterMember[];

  addMember: (m: Omit<USRosterMember, 'id' | 'created_at' | 'updated_at'>) => USRosterMember;
  updateMember: (id: string, patch: Partial<USRosterMember>) => void;
  removeMember: (id: string) => void;

  _setFromSupabase: (members: USRosterMember[]) => void;
}

export const useUSRosterStore = create<USRosterState>()(
  persist(
    (set, get) => ({
      members: [],

      addMember: (input) => {
        const now = new Date().toISOString();
        const m: USRosterMember = { ...input, id: nanoid(), created_at: now, updated_at: now };
        set((s) => ({ members: [...s.members, m] }));
        db.upsertUSRosterMember(m);
        return m;
      },

      updateMember: (id, patch) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id ? { ...m, ...patch, updated_at: new Date().toISOString() } : m,
          ),
        }));
        const updated = get().members.find((m) => m.id === id);
        if (updated) db.upsertUSRosterMember(updated);
      },

      removeMember: (id) => {
        set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
        db.deleteUSRosterMember(id);
      },

      _setFromSupabase: (members) => set({ members }),
    }),
    { name: 'simpliigence-us-roster', version: 1 },
  ),
);
