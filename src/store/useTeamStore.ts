import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamMember, ID } from '../types';
import { nanoid } from 'nanoid';

interface TeamState {
  members: TeamMember[];
  addMember: (member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMember: (id: ID, updates: Partial<TeamMember>) => void;
  deleteMember: (id: ID) => void;
  getMember: (id: ID) => TeamMember | undefined;
  setMembers: (members: TeamMember[]) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: [],

      addMember: (member) =>
        set((state) => ({
          members: [
            ...state.members,
            {
              ...member,
              id: nanoid(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
          ),
        })),

      deleteMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        })),

      getMember: (id) => get().members.find((m) => m.id === id),

      setMembers: (members) => set({ members }),
    }),
    {
      name: 'simpliigence-team',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2 && Array.isArray(state.members)) {
          state.members = (state.members as Record<string, unknown>[]).map((m) => ({
            ...m,
            ctcMonthly: (m as Record<string, unknown>).ctcMonthly ?? null,
            billingRateMonthly: (m as Record<string, unknown>).billingRateMonthly ?? null,
          }));
        }
        if (version < 3 && Array.isArray(state.members)) {
          state.members = (state.members as Record<string, unknown>[]).map((m) => ({
            ...m,
            utilizationPercent: (m as Record<string, unknown>).status === 'deployed' ? 100 : 0,
          }));
        }
        return state as unknown as TeamState;
      },
    }
  )
);
