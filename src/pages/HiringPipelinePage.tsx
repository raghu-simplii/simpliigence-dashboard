import { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { useCandidateStore } from '../store';
import type { Candidate, HiringStage, Role, Seniority, Specialization } from '../types';
import { HIRING_STAGES, ACTIVE_STAGES, STAGE_LABELS, STAGE_COLORS, CANDIDATE_SOURCES, ROLES, SENIORITY_LEVELS, SPECIALIZATIONS, ROLE_LABELS } from '../constants';
import { Button, Badge, Drawer, Input, Select, MultiSelect, Textarea, EmptyState, ConfirmDialog } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';

const emptyForm = (): Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', email: '', phone: '', currentStage: 'sourcing',
  targetRole: 'salesforce_developer', targetSeniority: 'consultant',
  specializations: [], targetProjectId: null, isForTM: false,
  source: 'linkedin', expectedJoinDate: null, stageHistory: [], notes: '',
});

export default function HiringPipelinePage() {
  const { candidates, addCandidate, updateCandidate, deleteCandidate, advanceStage } = useCandidateStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const activeCandidates = useMemo(() =>
    candidates.filter((c) => !['rejected', 'withdrawn'].includes(c.currentStage)),
    [candidates]
  );

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of ACTIVE_STAGES) {
      counts[stage] = activeCandidates.filter((c) => c.currentStage === stage).length;
    }
    counts['joined'] = candidates.filter((c) => c.currentStage === 'joined').length;
    return counts;
  }, [activeCandidates, candidates]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filterStage && c.currentStage !== filterStage) return false;
      if (filterRole && c.targetRole !== filterRole) return false;
      return true;
    });
  }, [candidates, filterStage, filterRole]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (c: Candidate) => {
    setForm({ name: c.name, email: c.email, phone: c.phone, currentStage: c.currentStage, targetRole: c.targetRole, targetSeniority: c.targetSeniority, specializations: c.specializations, targetProjectId: c.targetProjectId, isForTM: c.isForTM, source: c.source, expectedJoinDate: c.expectedJoinDate, stageHistory: c.stageHistory, notes: c.notes });
    setEditingId(c.id);
    setDrawerOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) { updateCandidate(editingId, form); }
    else { addCandidate(form); }
    setDrawerOpen(false);
  };

  const getNextStage = (current: HiringStage, isForTM: boolean): HiringStage | null => {
    const flow: HiringStage[] = isForTM
      ? ['sourcing', 'screening', 'technical_interview', 'client_interview', 'offer', 'joined']
      : ['sourcing', 'screening', 'technical_interview', 'offer', 'joined'];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };

  return (
    <div>
      <PageHeader
        title="Draft Board"
        subtitle={`${activeCandidates.length} active candidates`}
        action={<Button onClick={openAdd}>+ Add Candidate</Button>}
      />

      {/* Funnel */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[...ACTIVE_STAGES, 'joined' as HiringStage].map((stage) => (
          <div
            key={stage}
            className="flex-1 min-w-[120px] bg-white rounded-xl border border-slate-200 p-4 text-center"
          >
            <div className="text-2xl font-bold text-slate-900">{funnelCounts[stage] || 0}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">{STAGE_LABELS[stage]}</div>
            <div className="h-1.5 rounded-full mt-2" style={{ backgroundColor: STAGE_COLORS[stage] }} />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <Select options={[{ label: 'All Stages', value: '' }, ...HIRING_STAGES]} value={filterStage} onChange={(e) => setFilterStage(e.target.value)} />
        <Select options={[{ label: 'All Roles', value: '' }, ...ROLES]} value={filterRole} onChange={(e) => setFilterRole(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={48} />}
          title="No candidates in the pipeline"
          description="Start building your draft board."
          action={<Button onClick={openAdd}>+ Add Candidate</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">T&M</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const next = getNextStage(c.currentStage, c.isForTM);
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[c.targetRole]}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: STAGE_COLORS[c.currentStage] }}>
                        {STAGE_LABELS[c.currentStage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{c.source}</td>
                    <td className="px-4 py-3">{c.isForTM ? <Badge variant="warning">T&M</Badge> : '-'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {next && (
                        <button onClick={() => advanceStage(c.id, next)} className="text-emerald-600 hover:underline text-sm">
                          {'\u2192'} {STAGE_LABELS[next]}
                        </button>
                      )}
                      {!['rejected', 'withdrawn', 'joined'].includes(c.currentStage) && (
                        <button onClick={() => advanceStage(c.id, 'rejected')} className="text-red-500 hover:underline text-sm">Reject</button>
                      )}
                      <button onClick={() => openEdit(c)} className="text-primary hover:underline text-sm">Edit</button>
                      <button onClick={() => setConfirmDelete(c.id)} className="text-red-400 hover:underline text-sm">Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit Candidate' : 'Add Candidate'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Target Role" options={ROLES} value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value as Role })} />
            <Select label="Seniority" options={SENIORITY_LEVELS} value={form.targetSeniority} onChange={(e) => setForm({ ...form, targetSeniority: e.target.value as Seniority })} />
          </div>
          <MultiSelect label="Specializations" options={SPECIALIZATIONS} value={form.specializations} onChange={(v) => setForm({ ...form, specializations: v as Specialization[] })} />
          <Select label="Source" options={CANDIDATE_SOURCES} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isForTM" checked={form.isForTM} onChange={(e) => setForm({ ...form, isForTM: e.target.checked })} className="rounded" />
            <label htmlFor="isForTM" className="text-sm text-slate-700">T&M position (requires client interview)</label>
          </div>
          <Input label="Expected Join Date" type="date" value={form.expectedJoinDate || ''} onChange={(e) => setForm({ ...form, expectedJoinDate: e.target.value || null })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-4">
            <Button onClick={save}>{editingId ? 'Update' : 'Add Candidate'}</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove Candidate?"
        message="This will permanently delete this candidate."
        onConfirm={() => { if (confirmDelete) deleteCandidate(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
