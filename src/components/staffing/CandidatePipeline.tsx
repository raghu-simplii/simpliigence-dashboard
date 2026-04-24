/**
 * Candidate pipeline sub-section rendered inside a requisition's expanded row.
 *
 * Shows all candidates for a req with inline-editable stage / feedback, an
 * "Add candidate" form, a compact stage funnel strip, and sort/filter controls.
 */
import { useMemo, useState } from 'react';
import { UserPlus, Trash2, Mail, Phone, X, Users as UsersIcon, TrendingUp } from 'lucide-react';
import {
  CANDIDATE_STAGES,
  ACTIVE_CANDIDATE_STAGES,
  CANDIDATE_STAGE_COLORS,
  type StaffingCandidate,
  type CandidateStage,
} from '../../types/staffing';

interface Props {
  requisitionId: string;
  candidates: StaffingCandidate[];
  onAdd: (c: Omit<StaffingCandidate, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: string, patch: Partial<StaffingCandidate>) => void;
  onRemove: (id: string) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function CandidatePipeline({ requisitionId, candidates, onAdd, onUpdate, onRemove }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '', experience: '', submit_date: todayStr(), source: '', email: '', phone: '',
    stage: 'Submitted' as CandidateStage,
  });

  /** Mini-funnel: count candidates currently at each active stage. */
  const stageCounts = useMemo(() => {
    const counts: Partial<Record<CandidateStage, number>> = {};
    for (const c of candidates) counts[c.stage] = (counts[c.stage] || 0) + 1;
    return counts;
  }, [candidates]);

  const active = candidates.filter((c) => ACTIVE_CANDIDATE_STAGES.includes(c.stage));
  const inactive = candidates.filter((c) => !ACTIVE_CANDIDATE_STAGES.includes(c.stage));

  const resetDraft = () => setDraft({
    name: '', experience: '', submit_date: todayStr(), source: '',
    email: '', phone: '', stage: 'Submitted',
  });

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    onAdd({
      requisition_id: requisitionId,
      name: draft.name.trim(),
      experience: draft.experience.trim(),
      stage: draft.stage,
      submit_date: draft.submit_date || todayStr(),
      feedback: '',
      source: draft.source.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    });
    resetDraft();
    setShowAdd(false);
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UsersIcon size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Candidates ({candidates.length})
            {active.length > 0 && <span className="ml-1 text-emerald-500">· {active.length} active</span>}
          </span>
        </div>
        <button
          onClick={() => { setShowAdd((v) => !v); if (!showAdd) resetDraft(); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
        >
          {showAdd ? <X size={11} /> : <UserPlus size={11} />}
          {showAdd ? 'Cancel' : 'Add Candidate'}
        </button>
      </div>

      {/* Mini pipeline strip — only when candidates exist */}
      {candidates.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {CANDIDATE_STAGES.map((s) => {
            const count = stageCounts[s] || 0;
            if (count === 0) return null;
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                style={{ background: CANDIDATE_STAGE_COLORS[s] }}
                title={`${count} candidate${count > 1 ? 's' : ''} at ${s}`}
              >
                {s} <span className="bg-white/25 rounded px-1">{count}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-3 p-3 rounded-lg border border-blue-200 bg-blue-50/40">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Name *"
              className="md:col-span-2 px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              value={draft.experience}
              onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
              placeholder="Exp (e.g. 8 yrs)"
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
            <select
              value={draft.stage}
              onChange={(e) => setDraft({ ...draft, stage: e.target.value as CandidateStage })}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            >
              {CANDIDATE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="date"
              value={draft.submit_date}
              onChange={(e) => setDraft({ ...draft, submit_date: e.target.value })}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
            <input
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="Source (Naukri, referral…)"
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="Email"
              className="md:col-span-2 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="Phone"
              className="md:col-span-2 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
            <button
              onClick={handleAdd}
              disabled={!draft.name.trim()}
              className="md:col-span-2 px-3 py-1 text-xs font-semibold rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
            >
              + Add Candidate
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {candidates.length === 0 && !showAdd && (
        <p className="text-xs text-slate-400 italic py-2">No candidates tracked yet. Click <strong>Add Candidate</strong> to start.</p>
      )}

      {/* Candidate list — active first */}
      {candidates.length > 0 && (
        <div className="space-y-1.5">
          {[...active, ...inactive].map((c) => {
            const isEditing = editingId === c.id;
            const isArchived = !ACTIVE_CANDIDATE_STAGES.includes(c.stage);
            return (
              <div
                key={c.id}
                className={`group flex items-start gap-2 p-2 rounded-lg border transition-all ${
                  isArchived ? 'border-slate-200 bg-slate-50/50 opacity-70' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                }`}
              >
                {/* Stage pill */}
                <select
                  value={c.stage}
                  onChange={(e) => onUpdate(c.id, { stage: e.target.value as CandidateStage })}
                  className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 border-0 cursor-pointer flex-shrink-0"
                  style={{ background: CANDIDATE_STAGE_COLORS[c.stage] }}
                  title="Click to change stage"
                >
                  {CANDIDATE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {isEditing ? (
                      <input
                        value={c.name}
                        onChange={(e) => onUpdate(c.id, { name: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null); }}
                        autoFocus
                        className="text-xs font-bold px-1 py-0 border border-blue-300 rounded bg-blue-50"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingId(c.id)}
                        className="text-xs font-bold text-slate-800 cursor-pointer hover:text-primary"
                      >
                        {c.name}
                      </span>
                    )}
                    {c.experience && <span className="text-[10px] text-slate-500">{c.experience}</span>}
                    {c.submit_date && <span className="text-[10px] text-slate-400">· submitted {c.submit_date}</span>}
                    {c.source && <span className="text-[10px] text-slate-400">· {c.source}</span>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-0.5">
                        <Mail size={9} /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <span className="text-[10px] text-slate-500 inline-flex items-center gap-0.5">
                        <Phone size={9} /> {c.phone}
                      </span>
                    )}
                  </div>
                  {/* Feedback — inline editable */}
                  <input
                    value={c.feedback}
                    onChange={(e) => onUpdate(c.id, { feedback: e.target.value })}
                    placeholder="Add feedback / interview notes..."
                    className="mt-1 w-full px-1.5 py-0.5 text-[11px] text-slate-600 border border-transparent rounded focus:outline-none focus:border-blue-300 focus:bg-blue-50 hover:border-slate-200"
                  />
                </div>

                <button
                  onClick={() => { if (confirm(`Remove candidate "${c.name}"?`)) onRemove(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                  title="Remove candidate"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tiny conversion hint — only when we have data */}
      {candidates.length >= 3 && (() => {
        const selected = candidates.filter((c) => ['Selected', 'Offer Extended', 'Offer Accepted', 'Joined'].includes(c.stage)).length;
        const rate = Math.round((selected / candidates.length) * 100);
        return (
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <TrendingUp size={10} />
            Conversion: <span className="font-bold text-slate-600">{selected}</span> of <span className="font-bold">{candidates.length}</span> selected ({rate}%)
          </div>
        );
      })()}
    </div>
  );
}
