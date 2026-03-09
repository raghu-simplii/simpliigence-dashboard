import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Candidate, HiringStage, ID } from '../types';
import { nanoid } from 'nanoid';

interface CandidateState {
  candidates: Candidate[];
  addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCandidate: (id: ID, updates: Partial<Candidate>) => void;
  deleteCandidate: (id: ID) => void;
  advanceStage: (id: ID, to: HiringStage, notes?: string) => void;
}

export const useCandidateStore = create<CandidateState>()(
  persist(
    (set) => ({
      candidates: [],

      addCandidate: (candidate) =>
        set((state) => ({
          candidates: [
            ...state.candidates,
            {
              ...candidate,
              id: nanoid(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateCandidate: (id, updates) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteCandidate: (id) =>
        set((state) => ({
          candidates: state.candidates.filter((c) => c.id !== id),
        })),

      advanceStage: (id, to, notes = '') =>
        set((state) => ({
          candidates: state.candidates.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              currentStage: to,
              stageHistory: [
                ...c.stageHistory,
                { from: c.currentStage, to, date: new Date().toISOString(), notes },
              ],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),
    }),
    { name: 'simpliigence-candidates', version: 1 }
  )
);
