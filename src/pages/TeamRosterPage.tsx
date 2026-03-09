import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { useTeamStore, useFinancialStore } from '../store';
import { useProjectStore } from '../store';
import type { TeamMember, Role, Seniority, Specialization, MemberStatus } from '../types';
import { ROLES, SENIORITY_LEVELS, SPECIALIZATIONS, MEMBER_STATUSES, ROLE_LABELS, SENIORITY_LABELS, SPECIALIZATION_LABELS } from '../constants';
import { Button, StatusBadge, Badge, Drawer, Input, Select, MultiSelect, Textarea, EmptyState, ConfirmDialog } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { formatINR, getMemberMonthlyCTC } from '../lib/calculations/financial';

const emptyForm = (): Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', email: '', role: 'salesforce_developer', seniority: 'consultant',
  specializations: [], status: 'bench', currentProjectId: null,
  availableFrom: null, benchSince: null, notes: '',
  ctcMonthly: null, billingRateMonthly: null, utilizationPercent: 0,
});

export default function TeamRosterPage() {
  const { members, addMember, updateMember, deleteMember } = useTeamStore();
  const { projects } = useProjectStore();
  const { rateCards } = useFinancialStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (filterRole && m.role !== filterRole) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [members, filterRole, filterStatus, search]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (m: TeamMember) => {
    setForm({ name: m.name, email: m.email, role: m.role, seniority: m.seniority, specializations: m.specializations, status: m.status, currentProjectId: m.currentProjectId, availableFrom: m.availableFrom, benchSince: m.benchSince, notes: m.notes, ctcMonthly: m.ctcMonthly ?? null, billingRateMonthly: m.billingRateMonthly ?? null, utilizationPercent: m.utilizationPercent ?? 0 });
    setEditingId(m.id);
    setDrawerOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) { updateMember(editingId, form); }
    else { addMember(form); }
    setDrawerOpen(false);
  };

  const projectName = (id: string | null) => {
    if (!id) return '-';
    return projects.find((p) => p.id === id)?.name || '-';
  };

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle={`${members.length} team members`}
        action={<Button onClick={openAdd}>+ Add Player</Button>}
      />

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select options={[{ label: 'All Roles', value: '' }, ...ROLES]} value={filterRole} onChange={(e) => setFilterRole(e.target.value)} />
        <Select options={[{ label: 'All Status', value: '' }, ...MEMBER_STATUSES]} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No players on the roster yet"
          description="Add your first team member to get started."
          action={<Button onClick={openAdd}>+ Add Player</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Seniority</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Skills</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Util %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">CTC/mo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Available</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[m.role]}</td>
                  <td className="px-4 py-3 text-slate-600">{SENIORITY_LABELS[m.seniority]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.specializations.slice(0, 3).map((s) => (
                        <Badge key={s} variant="info">{SPECIALIZATION_LABELS[s]}</Badge>
                      ))}
                      {m.specializations.length > 3 && <Badge variant="neutral">+{m.specializations.length - 3}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${(m.utilizationPercent ?? 0) < 50 ? 'text-amber-600' : (m.utilizationPercent ?? 0) < 100 ? 'text-blue-600' : 'text-emerald-600'}`}>{m.utilizationPercent ?? 0}%</td>
                  <td className="px-4 py-3 text-right text-slate-600 tabular-nums">₹{formatINR(getMemberMonthlyCTC(m, rateCards))}</td>
                  <td className="px-4 py-3 text-slate-600">{projectName(m.currentProjectId)}</td>
                  <td className="px-4 py-3 text-slate-600">{m.availableFrom || (m.status === 'bench' ? 'Now' : '-')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(m)} className="text-primary hover:underline text-sm mr-3">Edit</button>
                    <button onClick={() => setConfirmDelete(m.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit Team Member' : 'Add Team Member'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          <Select label="Role" options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} />
          <Select label="Seniority" options={SENIORITY_LEVELS} value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value as Seniority })} />
          <MultiSelect label="Specializations" options={SPECIALIZATIONS} value={form.specializations} onChange={(v) => setForm({ ...form, specializations: v as Specialization[] })} />
          <Select label="Status" options={MEMBER_STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })} />
          <Select
            label="Current Project"
            options={projects.filter((p) => ['active', 'confirmed'].includes(p.status)).map((p) => ({ label: p.name, value: p.id }))}
            value={form.currentProjectId || ''}
            onChange={(e) => setForm({ ...form, currentProjectId: e.target.value || null })}
            placeholder="None"
          />
          <Input label="Available From" type="date" value={form.availableFrom || ''} onChange={(e) => setForm({ ...form, availableFrom: e.target.value || null })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Input label="Utilization %" type="number" placeholder="0–100 (40h/wk = 100%)" value={form.utilizationPercent} onChange={(e) => setForm({ ...form, utilizationPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Financials (₹/month)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monthly CTC" type="number" placeholder="Uses rate card if empty" value={form.ctcMonthly ?? ''} onChange={(e) => setForm({ ...form, ctcMonthly: e.target.value ? Number(e.target.value) : null })} />
              <Input label="Billing Rate" type="number" placeholder="Uses rate card if empty" value={form.billingRateMonthly ?? ''} onChange={(e) => setForm({ ...form, billingRateMonthly: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={save}>{editingId ? 'Update' : 'Add Member'}</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove from Roster?"
        message="This will permanently delete this team member."
        onConfirm={() => { if (confirmDelete) deleteMember(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
