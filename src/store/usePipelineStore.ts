import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PipelineProject, PipelineResource } from '../types/forecast';

interface PipelineState {
  projects: PipelineProject[];
  lastZohoSync: string | null;

  /** Replace all Zoho-sourced projects (preserves manual ones). */
  setZohoProjects: (projects: PipelineProject[]) => void;

  /** Add a manually-created pipeline project. */
  addProject: (project: PipelineProject) => void;

  /** Update an existing project. */
  updateProject: (id: string, updates: Partial<PipelineProject>) => void;

  /** Remove a project. */
  removeProject: (id: string) => void;

  /** Update resource estimates for a project. */
  setResources: (projectId: string, resources: PipelineResource[]) => void;
}

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      projects: [],
      lastZohoSync: null,

      setZohoProjects: (zohoProjects) =>
        set((s) => {
          const manual = s.projects.filter((p) => p.source === 'manual');
          // Merge: keep manual projects, replace all zoho-sourced ones
          // Preserve resource estimates from existing zoho projects
          const existingZoho = new Map(
            s.projects.filter((p) => p.source === 'zoho').map((p) => [p.zohoId, p]),
          );
          const merged = zohoProjects.map((zp) => {
            const existing = existingZoho.get(zp.zohoId);
            if (existing && existing.resources.length > 0) {
              return { ...zp, resources: existing.resources };
            }
            return zp;
          });
          return {
            projects: [...manual, ...merged],
            lastZohoSync: new Date().toISOString(),
          };
        }),

      addProject: (project) =>
        set((s) => ({ projects: [...s.projects, project] })),

      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        })),

      setResources: (projectId, resources) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, resources } : p,
          ),
        })),
    }),
    {
      name: 'simpliigence-pipeline',
      version: 1,
    },
  ),
);
