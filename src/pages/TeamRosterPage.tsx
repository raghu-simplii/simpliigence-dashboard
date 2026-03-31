import { Fragment, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, Badge } from '../components/ui';
import { MONTHS, emptyMonthRecord } from '../types/forecast';
import type { Month, ForecastAssignment } from '../types/forecast';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';

/* ─── week date helpers ────────────────────────────────── */
function getWeeksInMonth(year: number, monthIdx: number): string[] {
  const weeks: string[] = [];
  // Find first Monday on or before the 1st of the month
  const first = new Date(year, monthIdx, 1);
  const day = first.getDay();
  // Go to previous Monday (week start)
  const startOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(year, monthIdx, 1 + startOffset);

  // Generate weeks that overlap with this month
  const d = new Date(weekStart);
  while (d.getMonth() <= monthIdx || (d.getMonth() === 11 && monthIdx === 0)) {
    // Include week if it overlaps with the target month
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (d.getMonth() === monthIdx || weekEnd.getMonth() === monthIdx) {
      weeks.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 7);
    // Stop if we've gone past the month
    if (d.getMonth() > monthIdx && d.getFullYear() >= year) break;
    if (d.getFullYear() > year) break;
    if (weeks.length >= 6) break; // safety
  }
  return weeks;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function getMonthFromWeek(dateStr: string): Month {
  const d = new Date(dateStr + 'T00:00:00');
  return MONTHS[d.getMonth()];
}

/** Distribute monthly hours evenly across weeks for display when weeklyHours is empty */
function getWeeklyHoursForAssignment(
  a: ForecastAssignment,
  weekDates: string[],
): Record<string, number> {
  // If weeklyHours has data for any of these weeks, use it
  const hasWeeklyData = weekDates.some((w) => (a.weeklyHours[w] ?? 0) > 0);
  if (hasWeeklyData) {
    const result: Record<string, number> = {};
    for (const w of weekDates) result[w] = a.weeklyHours[w] ?? 0;
    return result;
  }
  // Otherwise distribute monthly hours across weeks in that month
  const result: Record<string, number> = {};
  const monthWeekCounts: Record<string, number> = {};
  for (const w of weekDates) {
    const m = getMonthFromWeek(w);
    monthWeekCounts[m] = (monthWeekCounts[m] ?? 0) + 1;
  }
  for (const w of weekDates) {
    const m = getMonthFromWeek(w);
    const total = a.monthlyTotals[m] ?? 0;
    const count = monthWeekCounts[m] ?? 1;
    result[w] = Math.round(total / count);
  }
  return result;
}

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
  const [monthlyHrs, setMonthlyHrs] = useState<Record<Month, string>>(() => {
    const m: Record<string, string> = {};
    for (const mo of MONTHS) m[mo] = '';
    return m as Record<Month, string>;
  });

  const finalRole = role === '__custom__' ? customRole : role;
  const finalProject = project === '__custom__' ? customProject : project;
  const canSubmit = name.trim() && finalProject.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const mt = emptyMonthRecord();
    for (const mo of MONTHS) {
      const v = parseFloat(monthlyHrs[mo]);
      if (!isNaN(v) && v > 0) mt[mo] = v;
    }
    onAdd({
      id: '',  // Will be assigned by store
      employeeName: name.trim(),
      notes: '',
      role: finalRole,
      rateCard: rate ? parseFloat(rate) : null,
      isSI: type === 'si',
      isContractor: type === 'contractor',
      project: finalProject.trim(),
      weeklyHours: {},
      monthlyTotals: mt,
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
      {/* Monthly hours row */}
      <div className="mt-3 pt-3 border-t border-primary/10">
        <label className="block text-xs text-slate-500 mb-2">Monthly Hours (optional)</label>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {MONTHS.map((mo) => (
            <div key={mo} className="text-center">
              <span className="block text-[10px] text-slate-400 mb-0.5">{mo}</span>
              <input
                type="number"
                min="0"
                className="w-full rounded border border-slate-300 px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="0"
                value={monthlyHrs[mo]}
                onChange={(e) => setMonthlyHrs((prev) => ({ ...prev, [mo]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Employee group ────────────────────────────────────── */
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
      return { name, role: first.role, rateCard: first.rateCard, isSI: first.isSI, isContractor: first.isContractor, assignments: assgns, totalHours };
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
    updateWeeklyHours,
    renameEmployee,
    updateEmployeeRole,
    updateEmployeeRate,
    updateEmployeeType,
  } = useForecastStore();

  const groups = useMemo(() => groupAssignments(assignments), [assignments]);
  const now = new Date();
  const currentMonthIdx = now.getMonth();

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(currentMonthIdx);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [expandedEmp, setExpandedEmp] = useState<Set<string>>(new Set());
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selectedMonth = MONTHS[selectedMonthIdx];
  const currentYear = now.getFullYear();
  const weekDates = useMemo(() => getWeeksInMonth(currentYear, selectedMonthIdx), [currentYear, selectedMonthIdx]);

  const roles = useMemo(() => [...new Set(groups.map((g) => g.role).filter(Boolean))].sort(), [groups]);
  const allProjects = useMemo(() => [...new Set(assignments.map((a) => a.project))].sort(), [assignments]);

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

  const handleWeekHoursSave = useCallback(
    (empName: string, project: string, weekDate: string, val: string) => {
      const hrs = parseFloat(val) || 0;
      updateWeeklyHours(empName, project, weekDate, hrs);
      setEditing(null);
    },
    [updateWeeklyHours],
  );

  const handleNameSave = useCallback(
    (oldName: string, newVal: string) => {
      if (newVal && newVal !== oldName) renameEmployee(oldName, newVal);
      setEditing(null);
    },
    [renameEmployee],
  );

  const handleRoleSave = useCallback(
    (empName: string, val: string) => { updateEmployeeRole(empName, val); setEditing(null); },
    [updateEmployeeRole],
  );

  const handleRateSave = useCallback(
    (empName: string, val: string) => { updateEmployeeRate(empName, parseFloat(val) > 0 ? parseFloat(val) : null); setEditing(null); },
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
    (a: ForecastAssignment) => { addAssignment(a); setShowAddForm(false); },
    [addAssignment],
  );

  const handleAddProject = useCallback(
    (empName: string, projectName: string) => {
      const existing = assignments.find((a) => a.employeeName === empName);
      addAssignment({
        id: '',  // Will be assigned by store
        employeeName: empName, notes: '', role: existing?.role ?? '',
        rateCard: existing?.rateCard ?? null, isSI: existing?.isSI ?? false,
        isContractor: existing?.isContractor ?? false, project: projectName,
        weeklyHours: {}, monthlyTotals: emptyMonthRecord(),
      });
      setAddingProjectFor(null);
      setExpandedEmp((prev) => new Set(prev).add(empName));
    },
    [assignments, addAssignment],
  );

  const handleDeleteEmployee = useCallback(
    (empName: string) => { removeEmployee(empName); setConfirmDelete(null); },
    [removeEmployee],
  );

  const handleRemoveAssignment = useCallback(
    (empName: string, project: string) => {
      const idx = assignments.findIndex((a) => a.employeeName === empName && a.project === project);
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
          <input type="text" placeholder="Search by name..." className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => setShowAddForm((v) => !v)} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90">+ Add Resource</button>
        </div>

        {showAddForm && <AddResourceForm roles={roles} projects={allProjects} onAdd={handleAddResource} onCancel={() => setShowAddForm(false)} />}

        {/* Month selector */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedMonthIdx(Math.max(0, selectedMonthIdx - 1))}
            disabled={selectedMonthIdx === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => setSelectedMonthIdx(i)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  i === selectedMonthIdx
                    ? 'bg-primary text-white'
                    : i === currentMonthIdx
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedMonthIdx(Math.min(11, selectedMonthIdx + 1))}
            disabled={selectedMonthIdx === 11}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Showing weeks in <strong>{selectedMonth} {currentYear}</strong>. Click any hour cell to edit. Expand a resource to see hours by project.
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
                <th className="pb-3 pr-3 font-semibold text-slate-600 min-w-[140px]">Name</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600 min-w-[100px]">Role</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600 w-16">Rate</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600 w-20">Type</th>
                <th className="pb-3 pr-3 font-semibold text-slate-600 w-16">Projects</th>
                {weekDates.map((w) => (
                  <th key={w} className="pb-3 pr-1 font-semibold text-slate-600 text-center w-16">
                    <div className="text-[10px] leading-tight">{formatWeekLabel(w)}</div>
                  </th>
                ))}
                <th className="pb-3 font-semibold text-slate-600 text-right w-16">{selectedMonth}</th>
                <th className="pb-3 font-semibold text-slate-600 text-right w-16">Year</th>
                <th className="pb-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const isExpanded = expandedEmp.has(g.name);

                // Compute weekly totals across all projects
                const empWeeklyTotals: Record<string, number> = {};
                for (const w of weekDates) empWeeklyTotals[w] = 0;
                for (const a of g.assignments) {
                  const weeklyForA = getWeeklyHoursForAssignment(a, weekDates);
                  for (const w of weekDates) empWeeklyTotals[w] += weeklyForA[w] ?? 0;
                }
                const monthTotal = g.assignments.reduce((s, a) => s + (a.monthlyTotals[selectedMonth] ?? 0), 0);

                return (
                  <Fragment key={g.name}>
                    {/* Employee summary row */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50 group">
                      <td className="py-2 pr-2">
                        <button onClick={() => toggleExpand(g.name)} className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>

                      <td className="py-2 pr-3 font-medium text-slate-800 cursor-pointer"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'name' })}
                      >
                        {isEditing(g.name, '', 'name') ? (
                          <InlineInput value={g.name} onSave={(v) => handleNameSave(g.name, v)} />
                        ) : (
                          <span className="hover:text-primary">{g.name}</span>
                        )}
                      </td>

                      <td className="py-2 pr-3 text-slate-600 text-xs cursor-pointer"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'role' })}
                      >
                        {isEditing(g.name, '', 'role') ? (
                          <InlineInput value={g.role} onSave={(v) => handleRoleSave(g.name, v)} />
                        ) : (
                          <span className="hover:text-primary">{g.role || '—'}</span>
                        )}
                      </td>

                      <td className="py-2 pr-3 text-slate-600 cursor-pointer text-xs"
                        onClick={() => setEditing({ empName: g.name, project: '', field: 'rate' })}
                      >
                        {isEditing(g.name, '', 'rate') ? (
                          <InlineInput value={g.rateCard ?? 0} type="number" onSave={(v) => handleRateSave(g.name, v)} className="w-14" />
                        ) : (
                          <span className="hover:text-primary">{g.rateCard ? `$${g.rateCard}` : '—'}</span>
                        )}
                      </td>

                      <td className="py-2 pr-3">
                        <button onClick={() => handleTypeCycle(g.name, g.isSI, g.isContractor)} title="Click to change">
                          {g.isContractor ? <Badge variant="warning">Contractor</Badge> : g.isSI ? <Badge variant="info">SI</Badge> : <Badge variant="neutral">Employee</Badge>}
                        </button>
                      </td>

                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {g.assignments.length}
                      </td>

                      {/* Weekly totals (summary, not directly editable — expand to edit per project) */}
                      {weekDates.map((w) => (
                        <td
                          key={w}
                          className="py-2 pr-1 text-center tabular-nums cursor-pointer"
                          onClick={() => {
                            if (g.assignments.length === 1) {
                              setEditing({ empName: g.name, project: g.assignments[0].project, field: w });
                              setExpandedEmp((prev) => new Set(prev).add(g.name));
                            } else {
                              toggleExpand(g.name);
                            }
                          }}
                          title={g.assignments.length === 1 ? 'Click to edit' : 'Click to expand projects'}
                        >
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            empWeeklyTotals[w] > 0
                              ? empWeeklyTotals[w] >= 40 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                              : 'text-slate-300'
                          }`}>
                            {empWeeklyTotals[w] > 0 ? empWeeklyTotals[w] : '—'}
                          </span>
                        </td>
                      ))}

                      <td className="py-2 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                          monthTotal >= 160 ? 'text-green-600 bg-green-50' : monthTotal > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-300'
                        }`}>
                          {monthTotal > 0 ? monthTotal : '—'}
                        </span>
                      </td>

                      <td className="py-2 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                          g.totalHours >= 800 ? 'text-green-600 bg-green-50' : g.totalHours >= 400 ? 'text-blue-600 bg-blue-50' : g.totalHours > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-300'
                        }`}>
                          {g.totalHours > 0 ? g.totalHours.toLocaleString() : '—'}
                        </span>
                      </td>

                      <td className="py-2 text-center">
                        <button onClick={() => setConfirmDelete(g.name)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity" title="Remove resource">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded: per-project rows with editable weekly cells */}
                    {isExpanded && g.assignments.map((a) => {
                      const weeklyForA = getWeeklyHoursForAssignment(a, weekDates);
                      const projMonthTotal = a.monthlyTotals[selectedMonth] ?? 0;
                      const projYearTotal = MONTHS.reduce((s, m) => s + (a.monthlyTotals[m] ?? 0), 0);

                      return (
                        <tr key={`${g.name}-${a.project}`} className="border-b border-slate-50 bg-slate-50/50">
                          <td />
                          <td colSpan={4} className="py-1.5 pl-6 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded font-medium">{a.project}</span>
                              {g.assignments.length > 1 && (
                                <button onClick={() => handleRemoveAssignment(g.name, a.project)} className="text-slate-300 hover:text-red-400" title="Remove this project allocation">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td />

                          {weekDates.map((w) => (
                            <td
                              key={w}
                              className="py-1.5 pr-1 text-center tabular-nums cursor-pointer"
                              onClick={() => setEditing({ empName: g.name, project: a.project, field: w })}
                            >
                              {isEditing(g.name, a.project, w) ? (
                                <InlineInput
                                  value={weeklyForA[w] ?? 0}
                                  type="number"
                                  onSave={(v) => handleWeekHoursSave(g.name, a.project, w, v)}
                                  className="w-12 text-center text-xs"
                                />
                              ) : (
                                <span className={`inline-block px-1 py-0.5 rounded text-[11px] hover:ring-1 hover:ring-primary/30 ${
                                  (weeklyForA[w] ?? 0) > 0 ? 'text-slate-600' : 'text-slate-300'
                                }`}>
                                  {(weeklyForA[w] ?? 0) > 0 ? weeklyForA[w] : '—'}
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="py-1.5 text-right">
                            <span className="text-xs text-slate-500 font-medium">{projMonthTotal > 0 ? projMonthTotal : '—'}</span>
                          </td>
                          <td className="py-1.5 text-right">
                            <span className="text-xs text-slate-400">{projYearTotal > 0 ? projYearTotal : '—'}</span>
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
                              <select className="rounded border border-slate-300 px-1.5 py-0.5 text-xs" defaultValue=""
                                onChange={(e) => { if (e.target.value) handleAddProject(g.name, e.target.value); }}
                              >
                                <option value="">Select project...</option>
                                {allProjects.filter((p) => !g.assignments.some((a) => a.project === p)).map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__new__">+ New project</option>
                              </select>
                              <button onClick={() => setAddingProjectFor(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingProjectFor(g.name)} className="text-xs text-primary/60 hover:text-primary font-medium flex items-center gap-1">
                              <Plus size={12} /> Add project
                            </button>
                          )}
                        </td>
                        {weekDates.map((w) => <td key={w} />)}
                        <td /><td /><td />
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {/* ── Totals row ─────────────────────── */}
              {filtered.length > 0 && (() => {
                const grandWeekly: Record<string, number> = {};
                for (const w of weekDates) grandWeekly[w] = 0;
                let grandMonth = 0;
                let grandYear = 0;
                for (const g of filtered) {
                  for (const a of g.assignments) {
                    const wk = getWeeklyHoursForAssignment(a, weekDates);
                    for (const w of weekDates) grandWeekly[w] += wk[w] ?? 0;
                  }
                  grandMonth += g.assignments.reduce((s, a) => s + (a.monthlyTotals[selectedMonth] ?? 0), 0);
                  grandYear += g.totalHours;
                }
                return (
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                    <td />
                    <td className="py-2.5 pr-3 text-slate-700">Total ({filtered.length})</td>
                    <td /><td /><td /><td />
                    {weekDates.map((w) => (
                      <td key={w} className="py-2.5 pr-1 text-center tabular-nums">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${grandWeekly[w] > 0 ? 'text-slate-800 bg-slate-200' : 'text-slate-300'}`}>
                          {grandWeekly[w] > 0 ? grandWeekly[w] : '—'}
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold text-slate-800 bg-slate-200">{grandMonth > 0 ? grandMonth.toLocaleString() : '—'}</span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold text-slate-800 bg-slate-200">{grandYear > 0 ? grandYear.toLocaleString() : '—'}</span>
                    </td>
                    <td />
                  </tr>
                );
              })()}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              {groups.length === 0 ? 'No team data yet. Import a spreadsheet or add resources manually.' : 'No matches for the current filters.'}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
