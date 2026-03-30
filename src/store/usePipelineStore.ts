import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ZohoPipelineProject, PipelineResource } from '../types/forecast';
import { db } from '../lib/supabaseSync';

interface PipelineState {
  projects: ZohoPipelineProject[];
  lastZohoSync: string | null;

  /** Replace all Zoho-sourced projects (preserves manual ones). */
  setZohoProjects: (projects: ZohoPipelineProject[]) => void;

  /** Add a manually-created pipeline project. */
  addProject: (project: ZohoPipelineProject) => void;

  /** Update an existing project. */
  updateProject: (id: string, updates: Partial<ZohoPipelineProject>) => void;

  /** Remove a project. */
  removeProject: (id: string) => void;

  /** Update resource estimates for a project. */
  setResources: (projectId: string, resources: PipelineResource[]) => void;
}

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      projects: [],
      lastZohoSync: null,

      setZohoProjects: (zohoProjects) => {
        set((s) => {
          const manual = s.projects.filter((p) => p.source === 'manual');
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
        });
        db.replacePipelineProjects(get().projects);
      },

      addProject: (project) => {
        set((s) => ({ projects: [...s.projects, project] }));
        db.upsertPipelineProject(project);
      },

      updateProject: (id, updates) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        const updated = get().projects.find((p) => p.id === id);
        if (updated) db.upsertPipelineProject(updated);
      },

      removeProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        }));
        db.deletePipelineProject(id);
      },

      setResources: (projectId, resources) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, resources } : p,
          ),
        }));
        const updated = get().projects.find((p) => p.id === projectId);
        if (updated) db.upsertPipelineProject(updated);
      },
    }),
    {
      name: 'simpliigence-pipeline',
      version: 2,
      migrate: (persisted: unknown) => {
        const old = persisted as Record<string, unknown> | null;
        return {
          projects: (old?.projects as ZohoPipelineProject[]) ?? [],
          lastZohoSync: (old?.lastZohoSync as string) ?? null,
        };
      },
    },
  ),
);
