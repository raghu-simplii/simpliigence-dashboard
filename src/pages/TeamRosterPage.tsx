import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, Badge } from '../components/ui';
import { deriveEmployeeSummaries } from '../lib/parseSpreadsheet';
import { MONTHS, emptyMonthRecord } from '../types/forecast';
import type { Month, ForecastAssignment } from '../types/forecast';

/* ─── tiny inline-edit input ─────────────────────────────────── */
function InlineInput({
  value,
  onSave,
  type = 'text',
  className = '',
  selectOnFocus = true,
}: {
  value: string | number;
  onSave: (v: string) => void;
  type?: 'text' | 'number';
  className?: string;
  selectOnFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    ref.current?.focus();
    if (selectOnFocus) ref.current?.select();
  }, [selectOnFocus]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== String(value)) onSave(trimmed);
    else onSave(String(value)); // signal close without change
  };

  return (
    <input
      ref={ref}
      type={type}
      className={`w-full rounded border border-primary/40 bg-white px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 ${className}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onSave(String(value));
      }}
    />
  );
}

/* ─── Add Resource modal/form ────────────────────────────────── */
function AddResourceForm({
  roles,
  projects,
  onAdd,
  onCancel,
}: {
  roles: string[];
  projects: string[];
  onAdd: (a: ForecastAssignment) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState<'employee' | 'si' | 'contractor'>('employee');
  const [project, setProject] = useState('');
  const [customProject, setCustomProject] = useState('');

  const finalRole = role === '__custom__' ? customRole : role;
  const finalProject = project === '__custom__' ? customProject : project;

  const canSubmit = name.trim() && finalProject.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const assignment: ForecastAssignment = {
      employeeName: name.trim(),
      notes: '',
      role: finalRole,
      rateCard: rate ? parseFloat(rate) : null,
      isSI: type === 'si',
      isContractor: type === 'contractor',
      project: finalProject.trim(),
      weeklyHours: {},
      monthlyTotals: emptyMonthRecord(),
    };
    onAdd(assignment);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Resource</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Role</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Select...</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            <option value="__custom__">+ Custom role</option>
          </select>
          {role === '__custom__' && (
            <input
              className="w-full mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Custom role..."
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rate ($/hr)</label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as 'employee' | 'si' | 'contractor')}
          >
            <option value="employee">Employee</option>
            <option value="si">SI</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Project *</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">Select...</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            <option value="__custom__">+ Custom project</option>
          </select>
          {project === '__custom__' && (
            <input
              className="w-full mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Custom project name..."
              value={customProject}
              onChange={(e) => setCustomProject(e.target.value)}
            />
          )}
        </div>
        <div className="col-span-2 flex items-end gap-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Resource
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Project Row (for existing employee) ────────────────── */
function AddProjectRow({
  projects,
  onAdd,
  onCancel,
}: {
  projects: string[];
  onAdd: (project: string) => void;
  onCancel: () => void;
}) {
  const [project, setProject] = useState('');
  const [custom, setCustom] = useState('');
  const finalProject = project === '__custom__' ? custom : project;

  return (
    <div className="flex items-center gap-2 mt-1">
      <select
        className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
        value={project}
        onChange={(e) => setProject(e.target.value)}
      >
        <option value="">Select project...</option>
        {projects.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        <option value="__custom__">+ New</option>
      </select>
      {project === '__custom__' && (
        <input
          className="rounded border border-slate-300 px-1.5 py-0.5 text-xs w-24"
          placeholder="Name..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
      <button
        onClick={() => finalProject && onAdd(finalProject)}
        disabled={!finalProject}
        className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-30"
      >
        Add
      </button>
      <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

type EditingCell = { empName: string; field: string } | null;

export default function TeamRosterPage() {
  const assignments = useForecastStore((s) => s.assignments);
  const {
    addAssignment,
    removeEmployee,
    updateMonthlyHours,
    renameEmployee,
    updateEmployeeRole,
    updateEmployeeRate,
    updateEmployeeType,
  } = useForecastStore();

  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const roles = useMemo(() => [...new Set(employees.map((e) => e.role).filter(Boolean))].sort(), [employees]);
  const allProjects = useMemo(() => [...new Set(employees.flatMap((e) => e.projects))].sort(), [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter && e.role !== roleFilter) return false;
      if (projectFilter && !e.projects.includes(projectFilter)) return false;
      return true;
    });
  }, [employees, search, roleFilter, projectFilter]);

  /* ─── edit helpers ─────────────── */
  const isEditing = useCallback(
    (empName: string, field: string) =>
      editing?.empName === empName && editing?.field === field,
    [editing],
  );

  const handleHoursSave = useCallback(
    (empName: string, month: Month, val: string) => {
      const hrs = parseFloat(val) || 0;
      // Find which project(s) this employee is on. Spread hours across first project for simplicity.
      const empAssignments = assignments.filter((a) => a.employeeName === empName);
      if (empAssignments.length === 1) {
        updateMonthlyHours(empName, empAssignments[0].project, month, hrs);
      } else if (empAssignments.length > 1) {
        // Distribute: set hours on first project row, zero others
        const totalNow = empAssignments.reduce((s, a) => s + a.monthlyTotals[month], 0);
        if (totalNow === 0) {
          // All zero — put all hours on first project
          updateMonthlyHours(empName, empAssignments[0].project, month, hrs);
        } else {
          // Scale proportionally
          for (const a of empAssignments) {
            const ratio = totalNow > 0 ? a.monthlyTotals[month] / totalNow : 1 / empAssignments.length;
            updateMonthlyHours(empName, a.project, month, Math.round(hrs * ratio));
          }
        }
      }
      setEditing(null);
    },
    [assignments, updateMonthlyHours],
  );

  const handleNameSave = useCallback(
    (oldName: string, newVal: string) => {
      if (newVal && newVal !== oldName) renameEmployee(oldName, newVal);
      setEditing(null);
    },
    [renameEmployee],
  );

  const handleRoleSave = useCallback(
    (empName: string, val: string) => {
      updateEmployeeRole(empName, val);
      setEditing(null);
    },
    [updateEmployeeRole],
  );

  const handleRateSave = useCallback(
    (empName: string, val: string) => {
      const rate = parseFloat(val);
      updateEmployeeRate(empName, rate > 0 ? rate : null);
      setEditing(null);
    },
    [updateEmployeeRate],
  );

  const handleTypeCycle = useCallback(
    (empName: string, isSI: boolean, isContractor: boolean) => {
      // cycle: Employee → SI → Contractor → Employee
      if (!isSI && !isContractor) {
        updateEmployeeType(empName, true, false);
      } else if (isSI) {
        updateEmployeeType(empName, false, true);
      } else {
        updateEmployeeType(empName, false, false);
      }
    },
    [updateEmployeeType],
  );

  const handleAddResource = useCallback(
    (a: ForecastAssignment) => {
      addAssignment(a);
      setShowAddForm(false);
    },
    [addAssignment],
  );

  const handleAddProject = useCallback(
    (empName: string, project: string) => {
      const existing = assignments.find((a) => a.employeeName === empName);
      const a: ForecastAssignment = {
        employeeName: empName,
        notes: '',
        role: existing?.role ?? '',
        rateCard: existing?.rateCard ?? null,
        isSI: existing?.isSI ?? false,
        isContractor: existing?.isContractor ?? false,
        project,
        weeklyHours: {},
        monthlyTotals: emptyMonthRecord(),
      };
      addAssignment(a);
      setAddingProjectFor(null);
    },
    [assignments, addAssignment],
  );

  const handleDeleteEmployee = useCallback(
    (empName: string) => {
      removeEmployee(empName);
      setConfirmDelete(null);
    },
    [removeEmployee],
  );

  const capacityColor = (hours: number) => {
    if (hours >= 800) return 'text-green-600 bg-green-50';
    if (hours >= 400) return 'text-blue-600 bg-blue-50';
    if (hours > 0) return 'text-amber-600 bg-amber-50';
    return 'text-slate-400 bg-slate-50';
  };

  return (
    <>
      <PageHeader
        title="Team Roster"
        subtitle={`${employees.length} team members across ${allProjects.length} projects`}
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name..."
            className="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90"
          >
            + Add Resource
          </button>
        </div>

        {/* Add Resource Form */}
        {showAddForm && (
          <AddResourceForm
            roles={roles}
            projects={allProjects}
            onAdd={handleAddResource}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Help text */}
        <p className="text-xs text-slate-400 mb-3">
          Click any cell to edit. Changes are saved automatically and update all dashboard pages.
        </p>

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
            <span className="text-sm text-red-700">
              Remove <strong>{confirmDelete}</strong> and all their project assignments?
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteEmployee(confirmDelete)}
                className="px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1 text-sm font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-600">Name</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Role</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Rate ($/hr)</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Type</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Projects</th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-3 pr-2 font-semibold text-slate-600 text-right w-16">
                    {m}
                  </th>
                ))}
                <th className="pb-3 font-semibold text-slate-600 text-right">Total</th>
                <th className="pb-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.name} className="border-b border-slate-100 hover:bg-slate-50 group">
                  {/* Name */}
                  <td
                    className="py-2 pr-4 font-medium text-slate-800 cursor-pointer min-w-[140px]"
                    onClick={() => setEditing({ empName: e.name, field: 'name' })}
                  >
                    {isEditing(e.name, 'name') ? (
                      <InlineInput
                        value={e.name}
                        onSave={(v) => handleNameSave(e.name, v)}
                      />
                    ) : (
                      <span className="hover:text-primary">{e.name}</span>
                    )}
                  </td>

                  {/* Role */}
                  <td
                    className="py-2 pr-4 text-slate-600 text-xs cursor-pointer min-w-[100px]"
                    onClick={() => setEditing({ empName: e.name, field: 'role' })}
                  >
                    {isEditing(e.name, 'role') ? (
                      <InlineInput
                        value={e.role}
                        onSave={(v) => handleRoleSave(e.name, v)}
                      />
                    ) : (
                      <span className="hover:text-primary">{e.role || '—'}</span>
                    )}
                  </td>

                  {/* Rate */}
                  <td
                    className="py-2 pr-4 text-slate-600 cursor-pointer"
                    onClick={() => setEditing({ empName: e.name, field: 'rate' })}
                  >
                    {isEditing(e.name, 'rate') ? (
                      <InlineInput
                        value={e.rateCard ?? 0}
                        type="number"
                        onSave={(v) => handleRateSave(e.name, v)}
                        className="w-20"
                      />
                    ) : (
                      <span className="hover:text-primary">
                        {e.rateCard ? `$${e.rateCard}` : '—'}
                      </span>
                    )}
                  </td>

                  {/* Type — click to cycle */}
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleTypeCycle(e.name, e.isSI, e.isContractor)}
                      title="Click to change type"
                    >
                      {e.isContractor ? (
                        <Badge variant="warning">Contractor</Badge>
                      ) : e.isSI ? (
                        <Badge variant="info">SI</Badge>
                      ) : (
                        <Badge variant="neutral">Employee</Badge>
                      )}
                    </button>
                  </td>

                  {/* Projects */}
                  <td className="py-2 pr-4 min-w-[140px]">
                    <div className="flex flex-wrap gap-1">
                      {e.projects.map((p) => (
                        <span
                          key={p}
                          className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded"
                        >
                          {p}
                        </span>
                      ))}
                      {addingProjectFor === e.name ? (
                        <AddProjectRow
                          projects={allProjects}
                          onAdd={(p) => handleAddProject(e.name, p)}
                          onCancel={() => setAddingProjectFor(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setAddingProjectFor(e.name)}
                          className="text-xs text-primary/60 hover:text-primary font-medium px-1"
                          title="Add project"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Monthly hours — editable */}
                  {MONTHS.map((m) => (
                    <td
                      key={m}
                      className="py-2 pr-2 text-right tabular-nums cursor-pointer"
                      onClick={() => setEditing({ empName: e.name, field: m })}
                    >
                      {isEditing(e.name, m) ? (
                        <InlineInput
                          value={e.monthlyHours[m]}
                          type="number"
                          onSave={(v) => handleHoursSave(e.name, m, v)}
                          className="w-16 text-right"
                        />
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium hover:ring-1 hover:ring-primary/30 ${
                            e.monthlyHours[m] > 0
                              ? e.monthlyHours[m] >= 160
                                ? 'bg-green-50 text-green-700'
                                : 'bg-blue-50 text-blue-700'
                              : 'text-slate-300'
                          }`}
                        >
                          {e.monthlyHours[m] > 0 ? e.monthlyHours[m] : '—'}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* Total */}
                  <td className="py-2 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${capacityColor(e.totalHours)}`}
                    >
                      {e.totalHours.toLocaleString()}
                    </span>
                  </td>

                  {/* Delete */}
                  <td className="py-2 text-center">
                    <button
                      onClick={() => setConfirmDelete(e.name)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                      title="Remove resource"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              {employees.length === 0
                ? 'No team data yet. Import a spreadsheet or add resources manually.'
                : 'No matches for the current filters.'}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
