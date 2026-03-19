import { useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import { MONTHS } from '../../types/forecast';
import type { Month } from '../../types/forecast';
import type { PipelineProject, RoleCategory } from '../../types/hiringForecast';
import { ROLE_CATEGORY_LABELS } from '../../types/hiringForecast';

interface Props {
  projects: PipelineProject[];
  onAdd: (proj: Omit<PipelineProject, 'id'>) => void;
  onRemove: (id: string) => void;
}

export function PipelineProjectList({ projects, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startMonth, setStartMonth] = useState<Month>('Apr');
  const [endMonth, setEndMonth] = useState<Month>('Dec');
  const [baCount, setBaCount] = useState(0);
  const [jdCount, setJdCount] = useState(0);
  const [sdCount, setSdCount] = useState(0);
  const [hrsPerPerson, setHrsPerPerson] = useState(160);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      projectName: name.trim(),
      startMonth,
      endMonth,
      headcount: { BA: baCount, JuniorDev: jdCount, SeniorDev: sdCount },
      hoursPerPerson: hrsPerPerson,
    });
    setShowForm(false);
    setName('');
    setBaCount(0);
    setJdCount(0);
    setSdCount(0);
  };

  const totalPeople = (p: PipelineProject) => p.headcount.BA + p.headcount.JuniorDev + p.headcount.SeniorDev;

  return (
    <div>
      {projects.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 mb-3">No pipeline projects added yet.</p>
      )}

      {projects.map((p) => (
        <div key={p.id} className="py-3 border-b border-slate-100 group">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{p.projectName}</span>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                  {p.startMonth}–{p.endMonth}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5">
                {(['BA', 'JuniorDev', 'SeniorDev'] as RoleCategory[]).map((cat) => (
                  p.headcount[cat] > 0 && (
                    <span key={cat} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{p.headcount[cat]}</span> {ROLE_CATEGORY_LABELS[cat]}
                    </span>
                  )
                ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {totalPeople(p)} people × {p.hoursPerPerson} hrs/mo = {totalPeople(p) * p.hoursPerPerson} hrs/mo total
              </div>
            </div>
            <button
              onClick={() => onRemove(p.id)}
              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase">Project Name</label>
            <input
              type="text"
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="e.g., Acme Corp Implementation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase">Start</label>
              <select
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value as Month)}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase">End</label>
              <select
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value as Month)}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase mb-1 block">
              Resources Needed (headcount)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">BAs</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-center"
                  value={baCount}
                  onChange={(e) => setBaCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Jr Devs</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-center"
                  value={jdCount}
                  onChange={(e) => setJdCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Sr Devs</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-center"
                  value={sdCount}
                  onChange={(e) => setSdCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase">Hrs/Person/Month</label>
            <input
              type="number"
              min={0}
              step={10}
              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-xs"
              value={hrsPerPerson}
              onChange={(e) => setHrsPerPerson(Number(e.target.value) || 160)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || (baCount + jdCount + sdCount === 0)}
              className="flex-1 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Project
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-500 px-3 py-1.5 rounded hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80"
        >
          <FolderPlus size={14} /> Add Pipeline Project
        </button>
      )}
    </div>
  );
}
