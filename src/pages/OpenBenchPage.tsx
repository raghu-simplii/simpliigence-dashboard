// @ts-nocheck
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Users, Plus, Trash2, Pencil, UserCheck, DollarSign,
  Briefcase, Shield, Search, Filter,
} from 'lucide-react';
import { useOpenBenchStore } from '../store/useOpenBenchStore';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, StatCard } from '../components/ui';
import type { VisaCategory, JobPriority } from '../types/openBench';

/* ââ Editable Cell Component ââ */
function EditableCell({ value, onSave, type = 'text', options, className = '', displayContent }: {
  value: string | number;
  onSave: (val: string | number) => void;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  className?: string;
  displayContent?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && type !== 'select') inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const final = type === 'number' ? Number(draft) : draft;
    if (final !== value) onSave(final);
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') commit();
    if (e.key === 'Escape') cancel();
  };

  if (!editing) {
    return (
      <div
        className={`group cursor-pointer rounded px-1 -mx-1 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-h-[24px] flex items-center ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to edit"
      >
        {displayContent || <span>{String(value) || '\u00A0'}</span>}
        <Pencil size={10} className="ml-1 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <select ref={inputRef as any} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown}
        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea ref={inputRef as any} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[48px]" />
    );
  }

  return (
    <input ref={inputRef as any} type={type} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown}
      className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
  );
}

/* ââ Constants ââ */
const VISA_CATEGORIES: VisaCategory[] = ['H1B','L1','L2 EAD','H4 EAD','GC','GC EAD','US Citizen','OPT','CPT','TN','Other'];
const JOB_PRIORITIES: JobPriority[] = ['Primary', 'Secondary'];

const VISA_COLORS: Record<string, string> = {
  'H1B': '#3b82f6', 'L1': '#8b5cf6', 'L2 EAD': '#a78bfa', 'H4 EAD': '#c084fc',
  'GC': '#10b981', 'GC EAD': '#34d399', 'US Citizen': '#059669',
  'OPT': '#f59e0b', 'CPT': '#fbbf24', 'TN': '#06b6d4', 'Other': '#94a3b8',
};

/* ââ Main Component ââ */
export default function OpenBenchPage() {
  const { resources, addResource, updateResource, removeResource } = useOpenBenchStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisa, setFilterVisa] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [sortField, setSortField] = useState<string>('resource_name');
  const [sortAsc, setSortAsc] = useState(true);

  // New resource form
  const [newName, setNewName] = useState('');
  const [newYOE, setNewYOE] = useState<number>(0);
  const [newVisa, setNewVisa] = useState<VisaCategory>('H1B');
  const [newSkill, setNewSkill] = useState('');
  const [newRoles, setNewRoles] = useState('');
  const [newPriority, setNewPriority] = useState<JobPriority>('Primary');
  const [newRate, setNewRate] = useState<number>(0);
  const [newNotes, setNewNotes] = useState('');

  /* ââ Derived data ââ */
  const filteredResources = useMemo(() => {
    let data = resources.filter(r => r.available);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(r =>
        r.resource_name.toLowerCase().includes(q) ||
        r.primary_skill.toLowerCase().includes(q) ||
        r.roles.toLowerCase().includes(q)
      );
    }
    if (filterVisa !== 'All') data = data.filter(r => r.visa_category === filterVisa);
    if (filterPriority !== 'All') data = data.filter(r => r.job_priority === filterPriority);

    data.sort((a, b) => {
      const av = a[sortField as keyof typeof a];
      const bv = b[sortField as keyof typeof b];
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [resources, searchTerm, filterVisa, filterPriority, sortField, sortAsc]);

  // Stats
  const totalBench = resources.filter(r => r.available).length;
  const avgYOE = totalBench > 0 ? (resources.filter(r => r.available).reduce((s, r) => s + r.years_of_experience, 0) / totalBench).toFixed(1) : '0';
  const avgRate = totalBench > 0 ? Math.round(resources.filter(r => r.available).reduce((s, r) => s + r.target_rate, 0) / totalBench) : 0;
  const primaryCount = resources.filter(r => r.available && r.job_priority === 'Primary').length;

  // Visa distribution
  const visaDist = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.filter(r => r.available).forEach(r => { counts[r.visa_category] = (counts[r.visa_category] || 0) + 1; });
    return counts;
  }, [resources]);

  // Skill distribution
  const skillDist = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.filter(r => r.available).forEach(r => { counts[r.primary_skill] = (counts[r.primary_skill] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [resources]);

  const handleAdd = () => {
    if (!newName || !newSkill) return;
    addResource({
      resource_name: newName,
      years_of_experience: newYOE,
      visa_category: newVisa,
      primary_skill: newSkill,
      roles: newRoles,
      job_priority: newPriority,
      target_rate: newRate,
      notes: newNotes,
      available: true,
    });
    setNewName(''); setNewYOE(0); setNewVisa('H1B'); setNewSkill(''); setNewRoles('');
    setNewPriority('Primary'); setNewRate(0); setNewNotes('');
    setShowAddForm(false);
  };

  const handleCellSave = useCallback((id: string, field: string, val: string | number) => {
    updateResource(id, { [field]: val });
  }, [updateResource]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort(field)}>
      {label} {sortField === field && (sortAsc ? 'â' : 'â')}
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Open Bench Resources"
        subtitle="Resources available for assignment"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="On Bench" value={totalBench} icon={<Users size={20} />} subtitle="Available resources" />
        <StatCard label="Avg Experience" value={`${avgYOE} yrs`} icon={<Briefcase size={20} />} subtitle="Years" />
        <StatCard label="Avg Target Rate" value={`$${avgRate}/hr`} icon={<DollarSign size={20} />} subtitle="Hourly" />
        <StatCard label="Primary Jobs" value={primaryCount} icon={<UserCheck size={20} />} subtitle={`of ${totalBench} total`} />
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Shield size={16} /> Visa Distribution
            </h3>
            <div className="flex gap-1 items-end h-24">
              {Object.entries(visaDist).map(([visa, count]) => {
                const maxCount = Math.max(...Object.values(visaDist), 1);
                const height = Math.max((count / maxCount) * 100, 8);
                return (
                  <div key={visa} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600">{count}</span>
                    <div className="w-full rounded-t" style={{ height: `${height}%`, background: VISA_COLORS[visa] || '#94a3b8' }} />
                    <span className="text-[8px] text-slate-400 text-center leading-tight">{visa}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Briefcase size={16} /> Skill Distribution
            </h3>
            <div className="space-y-1.5">
              {skillDist.map(([skill, count]) => (
                <div key={skill} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-28 truncate">{skill}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-primary/70 h-full rounded-full" style={{ width: `${(count / totalBench) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, skill, role..."
            className="text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 bg-white w-56" />
        </div>
        <select value={filterVisa} onChange={e => setFilterVisa(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="All">All Visas</option>
          {VISA_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="All">All Priority</option>
          {JOB_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">
          <Plus size={14} /> Add Resource
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">New Bench Resource</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Resource Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Years of Experience</label>
                <input type="number" value={newYOE} onChange={e => setNewYOE(Number(e.target.value))}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Visa Category</label>
                <select value={newVisa} onChange={e => setNewVisa(e.target.value as VisaCategory)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                  {VISA_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Primary Skill</label>
                <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. Salesforce"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Roles</label>
                <input value={newRoles} onChange={e => setNewRoles(e.target.value)} placeholder="e.g. SF Developer / Architect"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Primary / Secondary</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as JobPriority)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                  {JOB_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Target Rate ($/hr)</label>
                <input type="number" value={newRate} onChange={e => setNewRate(Number(e.target.value))}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Notes</label>
                <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90">Save</button>
              <button onClick={() => setShowAddForm(false)} className="text-xs text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {/* Resources Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <SortHeader field="resource_name" label="Resource Name" />
                <SortHeader field="years_of_experience" label="YOE" />
                <SortHeader field="visa_category" label="Visa" />
                <SortHeader field="primary_skill" label="Primary Skill" />
                <th className="px-3 py-2 text-left font-semibold">Roles</th>
                <SortHeader field="job_priority" label="Priority" />
                <SortHeader field="target_rate" label="Target Rate" />
                <th className="px-3 py-2 text-left font-semibold">Notes</th>
                <th className="px-3 py-2 text-center font-semibold w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-blue-50/30">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    <EditableCell value={r.resource_name} onSave={v => handleCellSave(r.id, 'resource_name', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={r.years_of_experience} type="number" onSave={v => handleCellSave(r.id, 'years_of_experience', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={r.visa_category} type="select" options={VISA_CATEGORIES}
                      onSave={v => handleCellSave(r.id, 'visa_category', v)}
                      displayContent={
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: VISA_COLORS[r.visa_category] || '#94a3b8' }} />
                          {r.visa_category}
                        </span>
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={r.primary_skill} onSave={v => handleCellSave(r.id, 'primary_skill', v)} />
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <EditableCell value={r.roles} onSave={v => handleCellSave(r.id, 'roles', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={r.job_priority} type="select" options={JOB_PRIORITIES}
                      onSave={v => handleCellSave(r.id, 'job_priority', v)}
                      displayContent={
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.job_priority === 'Primary' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.job_priority}
                        </span>
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell value={r.target_rate} type="number" onSave={v => handleCellSave(r.id, 'target_rate', v)}
                      displayContent={<span className="font-semibold text-green-700">${r.target_rate}/hr</span>}
                    />
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <EditableCell value={r.notes} type="textarea" onSave={v => handleCellSave(r.id, 'notes', v)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => removeResource(r.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove from bench">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredResources.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No resources found matching filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
