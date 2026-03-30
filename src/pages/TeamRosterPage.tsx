import { Fragment, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, Badge } from '../components/ui';
import { MONTHS, emptyMonthRecord } from '../types/forecast';
import type { Month, ForecastAssignment } from '../types/forecast';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

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
    else onSave(String(value));
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

/* ─── Add Resource form ────────────────────────────────── */
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
    onAdd({
      employeeName: name.trim(),
      notes: '',
      role: finalRole,
      rateCard: rate ? parseFloat(rate) : null,
      isSI: type === 'si',
      isContractor: type === 'contractor',
      project: finalProject.trim(),
      weeklyHours: {},
      monthlyTotals: emptyMonthRecord(),
    });
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Resource</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Role</label>
          <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Select...</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__custom__">+ Custom role</option>
          </select>
          {role === '__custom__' && <input className="w-full mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Custom role..." value={customRole} onChange={(e) => setCustomRole(e.target.value)} />}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rate ($/hr)</label>
          <input type="number" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type</label>
          <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as 'employee' | 'si' | 'contractor')}>
            <option value="employee">Employee</option>
            <option value="si">SI</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Project *</label>
          <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
            <option value="__custom__">+ Custom project</option>
          </select>
          {project === '__custom__' && <input className="w-full mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Custom project..." value={customProject} onChange={(e) => setCustomProject(e.target.value)} />}
        </div>
        <div className="col-span-2 flex items-end gap-2">
          <button onClick={handleSubmit} disabled={!canSubmit} className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">Add Resource</button>
          <button onClick={onCancel} className="px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Employee group: one row per project ────────────────────── */
interface EmployeeGroup {
  name: string;
  role: string;
  rateCard: number | null;
  isSI: boolean;
  isContractor: boolean;
  assignments: ForecastAssignment[];
  totalHours: number;
}

function groupAssignments(assignments: ForecastAssignment[]): EmployeeGroup[] {
  const map = new Map<string, ForecastAssignment[]>();
  for (const a of assignments) {
    const key = a.employeeName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return [...map.entries()]
    .map(([name, assgns]) => {
      const first = assgns[0];
      const totalHours = assgns.reduce(
        (sum, a) => sum + MONTHS.reduce((s, m) => s + a.monthlyTotals[m], 0),
        0,
      );
      return {
        name,
        role: first.role,
        rateCard: first.rateCard,
        isSI: first.isSI,
        isContractor: first.isContractor,
        assignments: assgns,
        totalHours,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ─── Main Page ──────────────────────────────────────────────── */

type EditingCell = { empName: string; project: string; field: string } | null;

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

  const groups = useMemo(() => groupAssignments(assignments), [assignments]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [expandedEmp, setExpandedEmp] = useState<Set<string>>(new Set());
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const roles = useMemo(() => [...new Set(groups.map((g) => g.role).filter(Boolean))].sort(), [groups]);
  const allProjects = useMemo(
    () => [...new Set(assignments.map((a) => a.project))].sort(),
    [assignments],
  );

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter && g.role !== roleFilter) return false;
      if (projectFilter && !g.assignments.some((a) => a.project === projectFilter)) return false;
      return true;
    });
  }, [groups, search, roleFilter, projectFilter]);

  const toggleExpand = useCallback((name: string) => {
    setExpandedEmp((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const isEditing = useCallback(
    (empName: string, project: string, field: string) =>
      editing?.empName === empName && editing?.project === project && editing?.field === field,
    [editing],
  );

  const handleHoursSave = useCallback(
    (empName: string, project: string, month: Month, val: string) => {
      const hrs = parseFloat(val) || 0;
      updateMonthlyHours(empName, project, month, hrs);
      setEditing(null);
    },
    [updateMonthlyHours],
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
      if (!isSI && !isContractor) updateEmployeeType(empName, true, false);
      else if (isSI) updateEmployeeType(empName, false, true);
      else updateEmployeeType(empName, false, false);
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
    (empName: string, projectName: string) => {
      const existing = assignments.find((a) => a.employeeName === empName);
      addAssignment({
        employeeName: empName,
        notes: '',
        role: existing?.role ?? '',
        rateCard: existing?.rateCard ?? null,
        isSI: existing?.isSI ?? false,
        isContractor: existing?.isContractor ?? false,
        project: projectName,
        weeklyHours: {},
        monthlyTotals: emptyMonthRecord(),
      });
      setAddingProjectFor(null);
      setExpandedEmp((prev) => new Set(prev).add(empName));
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

  const handleRemoveAssignment = useCallback(
    (empName: string, project: string) => {
      const idx = assignments.findIndex(
        (a) => a.employeeName === empName && a.project === project,
      );
      if (idx >= 0) useForecastStore.getState().removeAssignment(idx);
    },
    [assignments],
  );

  return (
    <>
      <PageHeader
        title="Team Roster"
        subtitle={`${groups.length} team members · ${allProjects.length} projects · ${assignments.length} allocations`}
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
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => setShowAddForm((v) => !v)} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90">
            + Add Resource
          </button>
        </div>

        {showAddForm && (
          <AddResourceForm roles={roles} projects={allProjects} onAdd={handleAddResource} onCancel={() => setShowAddForm(false)} />
        )}

        <p className="text-xs text-slate-400 mb-3">
          Click any cell to edit. Expand a resource to see and edit hours per project.
        </p>

        {confirmDelete && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
            <span className="text-sm text-red-700">Remove <strong>{confirmDelete}</strong> and all their project assignments?</span>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteEmployee(confirmDelete)} className="px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1 text-sm font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-2 w-6" />
                <th className="pb-3 pr-4 font-semibold text-slate-600">Name</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Role</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600">Rate</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600">Type</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600">Projects</th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-3 pr-1 font-semibold text-slate-600 text-right w-14 text-xs">{m}</th>
                ))}
                <th className="pb-3 font-semibold text-slate-600 text-right">Total</th>
                <th className="pb-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const isExpanded = expandedEmp.has(g.name);
                const empTotals: Record<Month, number> = { ...emptyMonthRecord() };
                for (const a of g.assignments) {
                  for (const m of MONTHS) empTotals[m] += a.monthlyTotals[m];
                }

                return (
                  <Fragment key={g.name}>
                    {/* Employee summary row */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50 group">
                      {/* Expand toggle */}
                      <td className="py-2 pr-2">
                        <button onClick={() => toggleExpand(g.name)} className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>

                      {/* Name */}
                      <td className="py-2 pr-4 font-medium text-slate-800 cursor-pointer min-w-[130px]"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'name' })}
                      >
                        {isEditing(g.name, '', 'name') ? (
                          <InlineInput value={g.name} onSave={(v) => handleNameSave(g.name, v)} />
                        ) : (
                          <span className="hover:text-primary">{g.name}</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-2 pr-4 text-slate-600 text-xs cursor-pointer min-w-[90px]"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'role' })}
                      >
                        {isEditing(g.name, '', 'role') ? (
                          <InlineInput value={g.role} onSave={(v) => handleRoleSave(g.name, v)} />
                        ) : (
                          <span className="hover:text-primary">{g.role || '—'}</span>
                        )}
                      </td>

                      {/* Rate */}
                      <td className="py-2 pr-3 text-slate-600 cursor-pointer"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'rate' })}
                      >
                        {isEditing(g.name, '', 'rate') ? (
                          <InlineInput value={g.rateCard ?? 0} type="number" onSave={(v) => handleRateSave(g.name, v)} className="w-16" />
                        ) : (
                          <span className="hover:text-primary text-xs">{g.rateCard ? `$${g.rateCard}` : '—'}</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-2 pr-3">
                        <button onClick={() => handleTypeCycle(g.name, g.isSI, g.isContractor)} title="Click to change">
                          {g.isContractor ? <Badge variant="warning">Contractor</Badge> : g.isSI ? <Badge variant="info">SI</Badge> : <Badge variant="neutral">Employee</Badge>}
                        </button>
                      </td>

                      {/* Projects count */}
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {g.assignments.length} project{g.assignments.length !== 1 ? 's' : ''}
                      </td>

                      {/* Monthly totals (sum across projects) */}
                      {MONTHS.map((m) => (
                        <td key={m} className="py-2 pr-1 text-right tabular-nums">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            empTotals[m] > 0
                              ? empTotals[m] >= 160 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                              : 'text-slate-300'
                          }`}>
                            {empTotals[m] > 0 ? empTotals[m] : '—'}
                          </span>
                        </td>
                      ))}

                      {/* Total */}
                      <td className="py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          g.totalHours >= 800 ? 'text-green-600 bg-green-50' :
                          g.totalHours >= 400 ? 'text-blue-600 bg-blue-50' :
                          g.totalHours > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'
                        }`}>
                          {g.totalHours.toLocaleString()}
                        </span>
                      </td>

                      {/* Delete */}
                      <td className="py-2 text-center">
                        <button onClick={() => setConfirmDelete(g.name)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity" title="Remove resource">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded: per-project rows */}
                    {isExpanded && g.assignments.map((a) => {
                      const projTotal = MONTHS.reduce((s, m) => s + a.monthlyTotals[m], 0);
                      return (
                        <tr key={`${g.name}-${a.project}`} className="border-b border-slate-50 bg-slate-50/50">
                          <td />
                          <td colSpan={4} className="py-1.5 pl-6 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded font-medium">{a.project}</span>
                              {g.assignments.length > 1 && (
                                <button
                                  onClick={() => handleRemoveAssignment(g.name, a.project)}
                                  className="text-slate-300 hover:text-red-400"
                                  title="Remove this project allocation"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td />
                          {MONTHS.map((m) => (
                            <td
                              key={m}
                              className="py-1.5 pr-1 text-right tabular-nums cursor-pointer"
                              onClick={() => setEditing({ empName: g.name, project: a.project, field: m })}
                            >
                              {isEditing(g.name, a.project, m) ? (
                                <InlineInput
                                  value={a.monthlyTotals[m]}
                                  type="number"
                                  onSave={(v) => handleHoursSave(g.name, a.project, m as Month, v)}
                                  className="w-14 text-right text-xs"
                                />
                              ) : (
                                <span className={`inline-block px-1 py-0.5 rounded text-[11px] hover:ring-1 hover:ring-primary/30 ${
                                  a.monthlyTotals[m] > 0 ? 'text-slate-600' : 'text-slate-300'
                                }`}>
                                  {a.monthlyTotals[m] > 0 ? a.monthlyTotals[m] : '—'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="py-1.5 text-right">
                            <span className="text-xs text-slate-500 font-medium">{projTotal > 0 ? projTotal : '—'}</span>
                          </td>
                          <td />
                        </tr>
                      );
                    })}

                    {/* Add project row */}
                    {isExpanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <td />
                        <td colSpan={5} className="py-1.5 pl-6">
                          {addingProjectFor === g.name ? (
                            <div className="flex items-center gap-2">
                              <select
                                className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) handleAddProject(g.name, e.target.value);
                                }}
                              >
                                <option value="">Select project...</option>
                                {allProjects
                                  .filter((p) => !g.assignments.some((a) => a.project === p))
                                  .map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__new__">+ New project</option>
                              </select>
                              <button onClick={() => setAddingProjectFor(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingProjectFor(g.name)}
                              className="text-xs text-primary/60 hover:text-primary font-medium flex items-center gap-1"
                            >
                              <Plus size={12} /> Add project
                            </button>
                          )}
                        </td>
                        {MONTHS.map((m) => <td key={m} />)}
                        <td />
                        <td />
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              {groups.length === 0
                ? 'No team data yet. Import a spreadsheet or add resources manually.'
                : 'No matches for the current filters.'}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
