import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ForecastAssignment, Month } from '../types/forecast';

interface ForecastState {
  assignments: ForecastAssignment[];
  weekDates: string[];

  /** Bulk-set from spreadsheet import (one-time or re-import). */
  setData: (assignments: ForecastAssignment[], weekDates: string[]) => void;
  clear: () => void;

  /** Add a new assignment row (employee × project). */
  addAssignment: (a: ForecastAssignment) => void;

  /** Update fields on an existing assignment by index. */
  updateAssignment: (index: number, updates: Partial<ForecastAssignment>) => void;

  /** Remove an assignment by index. */
  removeAssignment: (index: number) => void;

  /** Batch-remove all assignments for a given employee name. */
  removeEmployee: (employeeName: string) => void;

  /** Update a specific month's hours for an employee×project pair. */
  updateMonthlyHours: (employeeName: string, project: string, month: Month, hours: number) => void;

  /** Rename an employee across all their assignment rows. */
  renameEmployee: (oldName: string, newName: string) => void;

  /** Update role for all assignments belonging to an employee. */
  updateEmployeeRole: (employeeName: string, role: string) => void;

  /** Update rate card for all assignments belonging to an employee. */
  updateEmployeeRate: (employeeName: string, rate: number | null) => void;

  /** Update SI/Contractor flags for all assignments belonging to an employee. */
  updateEmployeeType: (employeeName: string, isSI: boolean, isContractor: boolean) => void;
}

export const useForecastStore = create<ForecastState>()(
  persist(
    (set) => ({
      assignments: [],
      weekDates: [],

      setData: (assignments, weekDates) => set({ assignments, weekDates }),
      clear: () => set({ assignments: [], weekDates: [] }),

      addAssignment: (a) =>
        set((s) => ({ assignments: [...s.assignments, a] })),

      updateAssignment: (index, updates) =>
        set((s) => ({
          assignments: s.assignments.map((a, i) => (i === index ? { ...a, ...updates } : a)),
        })),

      removeAssignment: (index) =>
        set((s) => ({
          assignments: s.assignments.filter((_, i) => i !== index),
        })),

      removeEmployee: (employeeName) =>
        set((s) => ({
          assignments: s.assignments.filter(
            (a) => a.employeeName.toLowerCase() !== employeeName.toLowerCase(),
          ),
        })),

      updateMonthlyHours: (employeeName, project, month, hours) =>
        set((s) => ({
          assignments: s.assignments.map((a) => {
            if (a.employeeName === employeeName && a.project === project) {
              return { ...a, monthlyTotals: { ...a.monthlyTotals, [month]: hours } };
            }
            return a;
          }),
        })),

      renameEmployee: (oldName, newName) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === oldName ? { ...a, employeeName: newName } : a,
          ),
        })),

      updateEmployeeRole: (employeeName, role) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName ? { ...a, role } : a,
          ),
        })),

      updateEmployeeRate: (employeeName, rate) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName ? { ...a, rateCard: rate } : a,
          ),
        })),

      updateEmployeeType: (employeeName, isSI, isContractor) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName ? { ...a, isSI, isContractor } : a,
          ),
        })),
    }),
    {
      name: 'simpliigence-forecast',
      version: 2,
      migrate: () => ({ assignments: [], weekDates: [] }),
    },
  ),
);
