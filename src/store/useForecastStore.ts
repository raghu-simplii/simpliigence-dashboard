import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ForecastAssignment, Month } from '../types/forecast';
import { MONTHS } from '../types/forecast';

/** Given a weeklyHours map, recompute monthlyTotals. */
function recalcMonthlyFromWeekly(weeklyHours: Record<string, number>): Record<Month, number> {
  const totals: Record<string, number> = {};
  for (const m of MONTHS) totals[m] = 0;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const [dateStr, hrs] of Object.entries(weeklyHours)) {
    if (!hrs) continue;
    const d = new Date(dateStr + 'T00:00:00');
    const monthIdx = d.getMonth();
    totals[monthNames[monthIdx]] += hrs;
  }
  return totals as Record<Month, number>;
}

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

  /** Update weekly hours for an employee×project and recalculate monthly totals. */
  updateWeeklyHours: (employeeName: string, project: string, weekDate: string, hours: number) => void;

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

      setData: (incoming, weekDates) =>
        set((s) => {
          // Preserve manually-edited and manually-added assignments during sync.
          // Manual edits take priority over spreadsheet data for matching rows.
          const manualAdded = s.assignments.filter((a) => a._manuallyAdded);
          const manualEdited = new Map<string, ForecastAssignment>();
          for (const a of s.assignments) {
            if (a._manuallyEdited) {
              // Use the original key if available (handles renames), else current key
              const key = a._originalKey || `${a.employeeName}|||${a.project}`;
              manualEdited.set(key.toLowerCase(), a);
            }
          }

          // Merge: for each incoming row, use the manual edit if it exists
          const merged = incoming.map((row) => {
            const key = `${row.employeeName}|||${row.project}`.toLowerCase();
            const override = manualEdited.get(key);
            if (override) {
              manualEdited.delete(key); // consumed
              return override;
            }
            return row;
          });

          // Append any manual edits that didn't match (renamed rows) + manually added rows
          const leftoverEdits = Array.from(manualEdited.values());
          const finalAssignments = [...merged, ...leftoverEdits, ...manualAdded];

          return { assignments: finalAssignments, weekDates };
        }),
      clear: () => set({ assignments: [], weekDates: [] }),

      addAssignment: (a) =>
        set((s) => ({ assignments: [...s.assignments, { ...a, _manuallyAdded: true }] })),

      updateAssignment: (index, updates) =>
        set((s) => ({
          assignments: s.assignments.map((a, i) =>
            i === index ? { ...a, ...updates, _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` } : a,
          ),
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
              return { ...a, monthlyTotals: { ...a.monthlyTotals, [month]: hours }, _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` };
            }
            return a;
          }),
        })),

      updateWeeklyHours: (employeeName, project, weekDate, hours) =>
        set((s) => ({
          assignments: s.assignments.map((a) => {
            if (a.employeeName === employeeName && a.project === project) {
              const newWeekly = { ...a.weeklyHours, [weekDate]: hours };
              return { ...a, weeklyHours: newWeekly, monthlyTotals: recalcMonthlyFromWeekly(newWeekly), _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` };
            }
            return a;
          }),
        })),

      renameEmployee: (oldName, newName) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === oldName
              ? { ...a, employeeName: newName, _manuallyEdited: true, _originalKey: a._originalKey || `${oldName}|||${a.project}` }
              : a,
          ),
        })),

      updateEmployeeRole: (employeeName, role) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName
              ? { ...a, role, _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` }
              : a,
          ),
        })),

      updateEmployeeRate: (employeeName, rate) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName
              ? { ...a, rateCard: rate, _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` }
              : a,
          ),
        })),

      updateEmployeeType: (employeeName, isSI, isContractor) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.employeeName === employeeName
              ? { ...a, isSI, isContractor, _manuallyEdited: true, _originalKey: a._originalKey || `${a.employeeName}|||${a.project}` }
              : a,
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
