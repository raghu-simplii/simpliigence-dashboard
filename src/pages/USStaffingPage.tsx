// @ts-nocheck
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Users, Plus, Trash2, Pencil, Building2, ChevronDown, ChevronRight,
  Globe, TrendingUp, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { useUSStaffingStore } from '../store/useUSStaffingStore';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, StatCard } from '../components/ui';
import type { USStaffingStage, AccountCategory } from '../types/usStaffing';
import { US_STAGE_COLORS } from '../types/usStaffing';

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
        {displayContent || <span>{value || '\u00A0'}</span>}
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
const ALL_STAGES: USStaffingStage[] = ['New','Sourcing','Profiles Shared','Interview','Shortlisted','Client Round','Closed/Selected','Onboarding','On Hold','Cancelled'];
const CATEGORIES: AccountCategory[] = ['MSP', 'SI'];

/* ââ Main Component ââ */
export default function USStaffingPage() {
  const { accounts, requisitions, addAccount, removeAccount, addRequisition, updateRequisition, removeRequisition } = useUSStaffingStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'msp' | 'si' | 'all'>('overview');
  const [showAddReq, setShowAddReq] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('All');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // New req form
  const [newAccountId, setNewAccountId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newInitDate, setNewInitDate] = useState('');
  const [newStage, setNewStage] = useState<USStaffingStage>('New');
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // New account form
  const [newAcctName, setNewAcctName] = useState('');
  const [newAcctCategory, setNewAcctCategory] = useState<AccountCategory>('MSP');

  const toggleAccount = (id: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ââ Derived data ââ */
  const mspAccounts = useMemo(() => accounts.filter(a => a.category === 'MSP'), [accounts]);
  const siAccounts = useMemo(() => accounts.filter(a => a.category === 'SI'), [accounts]);

  const reqsWithAccount = useMemo(() =>
    requisitions.map(r => ({ ...r, account_name: accounts.find(a => a.id === r.account_id)?.name || 'Unknown', account_category: accounts.find(a => a.id === r.account_id)?.category || 'MSP' })),
    [requisitions, accounts]
  );

  const filteredReqs = useMemo(() => {
    let data = reqsWithAccount;
    if (activeTab === 'msp') data = data.filter(r => r.account_category === 'MSP');
    if (activeTab === 'si') data = data.filter(r => r.account_category === 'SI');
    if (filterStage !== 'All') data = data.filter(r => r.stage === filterStage);
    return data;
  }, [reqsWithAccount, activeTab, filterStage]);

  // Stats
  const totalReqs = requisitions.length;
  const activeReqs = requisitions.filter(r => !['Closed/Selected', 'Onboarding', 'Cancelled'].includes(r.stage)).length;
  const closedReqs = requisitions.filter(r => r.stage === 'Closed/Selected' || r.stage === 'Onboarding').length;
  const mspReqs = reqsWithAccount.filter(r => r.account_category === 'MSP').length;
  const siReqs = reqsWithAccount.filter(r => r.account_category === 'SI').length;

  // Stage distribution
  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STAGES.forEach(s => counts[s] = 0);
    requisitions.forEach(r => { counts[r.stage] = (counts[r.stage] || 0) + 1; });
    return counts;
  }, [requisitions]);

  const handleAddReq = () => {
    if (!newAccountId || !newRole) return;
    addRequisition({
      account_id: newAccountId,
      role: newRole,
      initiation_date: newInitDate || new Date().toISOString().slice(0, 10),
      stage: newStage,
      closure_date: newClosureDate,
      notes: newNotes,
    });
    setNewAccountId(''); setNewRole(''); setNewInitDate(''); setNewStage('New'); setNewClosureDate(''); setNewNotes('');
    setShowAddReq(false);
  };

  const handleAddAccount = () => {
    if (!newAcctName) return;
    addAccount(newAcctName, newAcctCategory);
    setNewAcctName(''); setNewAcctCategory('MSP');
    setShowAddAccount(false);
  };

  const handleCellSave = useCallback((id: string, field: string, val: string | number) => {
    updateRequisition(id, { [field]: val });
  }, [updateRequisition]);

  /* ââ Render grouped by account ââ */
  const renderAccountGroup = (acctList: typeof accounts, categoryLabel: string) => {
    const groupReqs = filteredReqs.filter(r => acctList.some(a => a.id === r.account_id));
    if (groupReqs.length === 0 && activeTab !== 'all' && activeTab !== 'overview') return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Building2 size={16} /> {categoryLabel}
          <span className="text-xs font-normal text-slate-400">({groupReqs.length} requisitions)</span>
        </h3>
        {acctList.map(acct => {
          const acctReqs = filteredReqs.filter(r => r.account_id === acct.id);
          if (acctReqs.length === 0) return null;
          const isExpanded = expandedAccounts.has(acct.id);

          return (
            <Card key={acct.id} className="mb-3">
              <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50 rounded-t-xl" onClick={() => toggleAccount(acct.id)}>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold text-sm text-slate-800">{acct.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{acct.category}</span>
                  <span className="text-xs text-slate-400">{acctReqs.length} roles</span>
                </div>
              </div>
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                        <th className="px-3 py-2 text-left font-semibold">Role</th>
                        <th className="px-3 py-2 text-left font-semibold">Initiation Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Stage</th>
                        <th className="px-3 py-2 text-left font-semibold">Closure Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Notes</th>
                        <th className="px-3 py-2 text-center font-semibold w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acctReqs.map(req => (
                        <tr key={req.id} className="border-t border-slate-100 hover:bg-blue-50/30">
                          <td className="px-3 py-2">
                            <EditableCell value={req.role} onSave={(v) => handleCellSave(req.id, 'role', v)} />
                          </td>
                          <td className="px-3 py-2">
                            <EditableCell value={req.initiation_date} onSave={(v) => handleCellSave(req.id, 'initiation_date', v)} />
                          </td>
                          <td className="px-3 py-2">
                            <EditableCell
                              value={req.stage} type="select" options={ALL_STAGES}
                              onSave={(v) => handleCellSave(req.id, 'stage', v)}
                              displayContent={
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: US_STAGE_COLORS[req.stage as USStaffingStage] || '#94a3b8' }} />
                                  {req.stage}
                                </span>
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <EditableCell value={req.closure_date} onSave={(v) => handleCellSave(req.id, 'closure_date', v)} />
                          </td>
                          <td className="px-3 py-2 max-w-[200px]">
                            <EditableCell value={req.notes} type="textarea" onSave={(v) => handleCellSave(req.id, 'notes', v)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeRequisition(req.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  /* ââ Overview Tab ââ */
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Requisitions" value={totalReqs} icon={<Users size={20} />} subtitle="All US roles" />
        <StatCard label="Active" value={activeReqs} icon={<TrendingUp size={20} />} subtitle="In pipeline" />
        <StatCard label="Closed/Onboarding" value={closedReqs} icon={<CheckCircle size={20} />} subtitle="Filled roles" />
        <StatCard label="MSP Roles" value={mspReqs} icon={<Building2 size={20} />} subtitle="MSP accounts" />
        <StatCard label="SI Roles" value={siReqs} icon={<Globe size={20} />} subtitle="SI accounts" />
      </div>

      {/* Stage Pipeline */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Stage Pipeline</h3>
          <div className="flex gap-1 items-end h-32">
            {ALL_STAGES.map(stage => {
              const count = stageDistribution[stage] || 0;
              const maxCount = Math.max(...Object.values(stageDistribution), 1);
              const height = Math.max((count / maxCount) * 100, 4);
              return (
                <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-600">{count}</span>
                  <div className="w-full rounded-t" style={{ height: `${height}%`, background: US_STAGE_COLORS[stage] }} />
                  <span className="text-[9px] text-slate-400 text-center leading-tight">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 size={16} /> MSP Accounts
            </h3>
            {mspAccounts.map(a => {
              const count = requisitions.filter(r => r.account_id === a.id).length;
              return (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-700">{a.name}</span>
                  <span className="text-xs font-semibold text-slate-500">{count} roles</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Globe size={16} /> SI Accounts
            </h3>
            {siAccounts.map(a => {
              const count = requisitions.filter(r => r.account_id === a.id).length;
              return (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-700">{a.name}</span>
                  <span className="text-xs font-semibold text-slate-500">{count} roles</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );

  /* ââ Requisitions Tab (All / MSP / SI) ââ */
  const renderRequisitions = () => (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="All">All Stages</option>
          {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowAddReq(true)} className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">
          <Plus size={14} /> Add Requisition
        </button>
        <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-1 text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">
          <Plus size={14} /> Add Account
        </button>
      </div>

      {/* Add Req Modal */}
      {showAddReq && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">New Requisition</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Account</label>
                <select value={newAccountId} onChange={e => setNewAccountId(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                  <option value="">Select account...</option>
                  <optgroup label="MSP">
                    {mspAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                  <optgroup label="SI">
                    {siAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Role</label>
                <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. Salesforce Developer"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Initiation Date</label>
                <input type="date" value={newInitDate} onChange={e => setNewInitDate(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Stage</label>
                <select value={newStage} onChange={e => setNewStage(e.target.value as USStaffingStage)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                  {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Closure Date</label>
                <input type="date" value={newClosureDate} onChange={e => setNewClosureDate(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Notes</label>
                <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional notes"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddReq} className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90">Save</button>
              <button onClick={() => setShowAddReq(false)} className="text-xs text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <Card className="border-2 border-green-200 bg-green-50/30">
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-700">New Account</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Account Name</label>
                <input value={newAcctName} onChange={e => setNewAcctName(e.target.value)} placeholder="e.g. TEKsystems"
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-semibold">Category</label>
                <select value={newAcctCategory} onChange={e => setNewAcctCategory(e.target.value as AccountCategory)}
                  className="w-full text-xs border rounded px-2 py-1.5 mt-0.5">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddAccount} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">Save</button>
              <button onClick={() => setShowAddAccount(false)} className="text-xs text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {/* Requisitions grouped by MSP / SI */}
      {(activeTab === 'all' || activeTab === 'msp') && renderAccountGroup(mspAccounts, 'MSP Accounts')}
      {(activeTab === 'all' || activeTab === 'si') && renderAccountGroup(siAccounts, 'SI Accounts')}
    </div>
  );

  /* ââ Page ââ */
  return (
    <div className="space-y-6">
      <PageHeader
        title="US Staffing"
        subtitle="Manage US staffing requisitions across MSP and SI accounts"
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'all', label: 'All Requisitions' },
          { key: 'msp', label: 'MSP' },
          { key: 'si', label: 'SI' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? renderOverview() : renderRequisitions()}
    </div>
  );
}
