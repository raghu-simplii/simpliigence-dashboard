import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ID } from '../types';
import { nanoid } from 'nanoid';

interface ProjectState {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: ID, updates: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  getProject: (id: ID) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects,
            {
              ...project,
              id: nanoid(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: 'simpliigence-projects',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2 && Array.isArray(state.projects)) {
          state.projects = (state.projects as Record<string, unknown>[]).map((p) => ({
            ...p,
            contractValue: (p as Record<string, unknown>).contractValue ?? null,
            monthlyBudget: (p as Record<string, unknown>).monthlyBudget ?? null,
            billingType: (p as Record<string, unknown>).billingType ?? 'fixed',
          }));
        }
        return state as ProjectState;
      },
    }
  )
);
