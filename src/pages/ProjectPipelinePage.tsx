import { useState, useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
import { useProjectStore } from '../store';
import type { Project, ProjectType, ProjectStatus, StaffingRequirement, Role, Seniority, Specialization } from '../types';
import { PROJECT_TYPES, PROJECT_STATUSES, PROJECT_TYPE_LABELS, ROLES, SENIORITY_LEVELS, SPECIALIZATIONS, PRIORITY_OPTIONS, BILLING_TYPE_OPTIONS } from '../constants';
import { formatINR } from '../lib/calculations/financial';
import { Button, StatusBadge, Badge, Drawer, Input, Select, MultiSelect, Textarea, EmptyState, ConfirmDialog } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { nanoid } from 'nanoid';

const emptyForm = (): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', clientName: '', type: 'fixed_12w', status: 'pipeline',
  startDate: '', endDate: null, staffingRequirements: [], notes: '',
  contractValue: null, monthlyBudget: null, billingType: 'fixed',
});

const emptyReq = (): StaffingRequirement => ({
  id: nanoid(), role: 'salesforce_developer', seniority: 'consultant',
  specializations: [], count: 1, filledCount: 0, assignedMemberIds: [], priority: 'medium',
});

export default function ProjectPipelinePage() {
  const { projects, addProject, updateProject, deleteProject } = useProjectStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterType && p.type !== filterType) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, filterType, filterStatus]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (p: Project) => {
    setForm({ name: p.name, clientName: p.clientName, type: p.type, status: p.status, startDate: p.startDate, endDate: p.endDate, staffingRequirements: p.staffingRequirements, notes: p.notes, contractValue: p.contractValue ?? null, monthlyBudget: p.monthlyBudget ?? null, billingType: p.billingType ?? 'fixed' });
    setEditingId(p.id);
    setDrawerOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) { updateProject(editingId, form); }
    else { addProject(form); }
    setDrawerOpen(false);
  };

  const addReq = () => setForm({ ...form, staffingRequirements: [...form.staffingRequirements, emptyReq()] });
  const removeReq = (id: string) => setForm({ ...form, staffingRequirements: form.staffingRequirements.filter((r) => r.id !== id) });
  const updateReq = (id: string, updates: Partial<StaffingRequirement>) =>
    setForm({ ...form, staffingRequirements: form.staffingRequirements.map((r) => r.id === id ? { ...r, ...updates } : r) });

  const totalUnfilled = (p: Project) =>
    p.staffingRequirements.reduce((sum, r) => sum + (r.count - r.filledCount), 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${projects.length} projects`}
        action={<Button onClick={openAdd}>+ New Project</Button>}
      />

      <div className="flex gap-3 mb-4">
        <Select options={[{ label: 'All Types', value: '' }, ...PROJECT_TYPES]} value={filterType} onChange={(e) => setFilterType(e.target.value)} />
        <Select options={[{ label: 'All Status', value: '' }, ...PROJECT_STATUSES]} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="No projects in the pipeline"
          description="Add your first project to start tracking staffing needs."
          action={<Button onClick={openAdd}>+ New Project</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">End</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Value</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unfilled</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.clientName}</td>
                  <td className="px-4 py-3"><Badge variant="info">{PROJECT_TYPE_LABELS[p.type]}</Badge></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{p.startDate || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.endDate || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{p.contractValue ? `₹${formatINR(p.contractValue)}` : '-'}</td>
                  <td className="px-4 py-3">
                    {totalUnfilled(p) > 0 ? (
                      <Badge variant="danger">{totalUnfilled(p)} open</Badge>
                    ) : (
                      <Badge variant="success">Staffed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-primary hover:underline text-sm mr-3">Edit</button>
                    <button onClick={() => setConfirmDelete(p.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit Project' : 'New Project'} width="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={PROJECT_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProjectType })} />
            <Select label="Status" options={PROJECT_STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value || null })} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Financials (₹)</h4>
            <div className="grid grid-cols-3 gap-4">
              <Select label="Billing Type" options={BILLING_TYPE_OPTIONS} value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value as 'fixed' | 'monthly' })} />
              <Input label="Contract Value" type="number" placeholder="Total value" value={form.contractValue ?? ''} onChange={(e) => setForm({ ...form, contractValue: e.target.value ? Number(e.target.value) : null })} />
              <Input label="Monthly Budget" type="number" placeholder="For T&M" value={form.monthlyBudget ?? ''} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-800">Staffing Requirements</h4>
              <Button size="sm" variant="secondary" onClick={addReq}>+ Add Role</Button>
            </div>
            {form.staffingRequirements.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-lg p-4 mb-3">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Select label="Role" options={ROLES} value={req.role} onChange={(e) => updateReq(req.id, { role: e.target.value as Role })} />
                  <Select label="Seniority" options={SENIORITY_LEVELS} value={req.seniority} onChange={(e) => updateReq(req.id, { seniority: e.target.value as Seniority })} />
                  <Select label="Priority" options={PRIORITY_OPTIONS} value={req.priority} onChange={(e) => updateReq(req.id, { priority: e.target.value as StaffingRequirement['priority'] })} />
                </div>
                <MultiSelect label="Required Skills" options={SPECIALIZATIONS} value={req.specializations} onChange={(v) => updateReq(req.id, { specializations: v as Specialization[] })} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input label="Count Needed" type="number" min={1} value={req.count} onChange={(e) => updateReq(req.id, { count: parseInt(e.target.value) || 1 })} />
                  <Input label="Filled" type="number" min={0} value={req.filledCount} onChange={(e) => updateReq(req.id, { filledCount: parseInt(e.target.value) || 0 })} />
                </div>
                <button onClick={() => removeReq(req.id)} className="text-red-500 text-xs mt-2 hover:underline">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={save}>{editingId ? 'Update' : 'Create Project'}</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Project?"
        message="This will permanently remove this project and its staffing requirements."
        onConfirm={() => { if (confirmDelete) deleteProject(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
