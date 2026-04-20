// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Users, Plus, Trash2, Pencil, Building2, ChevronDown, ChevronRight,
  Globe, TrendingUp, CheckCircle, AlertTriangle, Clock, Brain,
} from 'lucide-react';
import { useUSStaffingStore } from '../store/useUSStaffingStore';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, StatCard, StatusBadge } from '../components/ui';
import type { USStaffingStage, AccountCategory } from '../types/usStaffing';
import { US_STAGE_COLORS } from '../types/usStaffing';

/* —— Editable Cell Component —— */
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

/* —— Constants —— */
const ALL_STAGES: USStaffingStage[] = ['New','Sourcing','Profiles Shared','Interview','Shortlisted','Client Round','Closed/Selected','Onboarding','On Hold','Cancelled'];
const CATEGORIES: AccountCategory[] = ['MSP', 'SI'];

/* —— Main Component —— */
export default function USStaffingPage() {
  const { accounts, requisitions, addAccount, removeAccount, addRequisition, updateRequisition, removeRequisition } = useUSStaffingStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'msp' | 'si' | 'all' | 'forecast'>('overview');
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

  /* —— Derived data —— */
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

  /* —— AI Scoring for forecast —— */
  const scoreReq = (req: typeof reqsWithAccount[0]) => {
    const stageScores: Record<string, number> = {
      'New': 15, 'Sourcing': 25, 'Profiles Shared': 35, 'Interview': 50,
      'Shortlisted': 60, 'Client Round': 75, 'Closed/Selected': 90, 'Onboarding': 95,
      'On Hold': 20, 'Cancelled': 5,
    };
    let score = stageScores[req.stage] || 30;
    const notes = (req.notes || '').toLowerCase();
    if (notes.includes('final round') || notes.includes('selected')) score += 10;
    if (notes.includes('shortlisted')) score += 5;
    if (notes.includes('no response') || notes.includes('stalled')) score -= 10;
    if (notes.includes('reject')) score -= 15;
    if (req.closure_date) {
      const daysLeft = Math.ceil((new Date(req.closure_date).getTime() - Date.now()) / 86400000);
      if (daysLeft < 0) score -= 10;
      else if (daysLeft < 7) score += 5;
    }
    return Math.max(5, Math.min(95, score));
  };

  const scoredReqs = useMemo(() =>
    reqsWithAccount.map(r => ({ ...r, closureProb: scoreReq(r), risk: scoreReq(r) >= 65 ? 'low' as const : scoreReq(r) <= 35 ? 'high' as const : 'medium' as const })),
    [reqsWithAccount]
  );

  const forecastFiltered = useMemo(() => {
    let data = scoredReqs;
    if (activeTab === 'forecast') return data;
    return data;
  }, [scoredReqs, activeTab]);

  const fTotalReqs = scoredReqs.length;
  const fOptimistic = scoredReqs.filter(r => r.closureProb >= 40).length;
  const fRealistic = scoredReqs.filter(r => r.closureProb >= 60).length;
  const fConservative = scoredReqs.filter(r => r.closureProb >= 75).length;
  const fAtRisk = scoredReqs.filter(r => r.risk === 'high').length;
  const fAvgProb = scoredReqs.length ? Math.round(scoredReqs.reduce((s, r) => s + r.closureProb, 0) / scoredReqs.length) : 0;

  /* —— Render grouped by account —— */
  const renderAccountGroup = (acctList: typeof accounts, categoryLabel: string) => {
    const groupReqs = filteredReqs.filter(r => acctList.some(a => a.id === r.account_id));
    // Only show accounts that actually have requisitions matching the current filter.
    // Empty accounts are managed from the Overview tab (see MSP/SI summary cards),
    // which keeps this browsing view focused on real work.
    const populatedAccounts = acctList.filter(a => filteredReqs.some(r => r.account_id === a.id));
    if (populatedAccounts.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Building2 size={16} /> {categoryLabel}
          <span className="text-xs font-normal text-slate-400">({groupReqs.length} requisitions)</span>
        </h3>
        {populatedAccounts.map(acct => {
          const acctReqs = filteredReqs.filter(r => r.account_id === acct.id);
          const isExpanded = expandedAccounts.has(acct.id);

          return (
            <Card key={acct.id} className="mb-3 group">
              <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50 rounded-t-xl" onClick={() => toggleAccount(acct.id)}>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold text-sm text-slate-800">{acct.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{acct.category}</span>
                  <span className="text-xs text-slate-400">{acctReqs.length} roles</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete account "${acct.name}" and all its ${acctReqs.length} requisitions?`)) {
                      acctReqs.forEach(r => removeRequisition(r.id));
                      removeAccount(acct.id);
                    }
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete account"
                >
                  <Trash2 size={14} />
                </button>
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

  /* —— Overview Tab —— */
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
        {(['MSP', 'SI'] as const).map((category) => {
          const acctList = category === 'MSP' ? mspAccounts : siAccounts;
          const Icon = category === 'MSP' ? Building2 : Globe;
          const sorted = [...acctList].sort((a, b) => {
            const aCount = requisitions.filter(r => r.account_id === a.id).length;
            const bCount = requisitions.filter(r => r.account_id === b.id).length;
            // Populated first (desc), then empty alphabetical.
            if ((aCount > 0) !== (bCount > 0)) return bCount - aCount;
            if (aCount !== bCount) return bCount - aCount;
            return a.name.localeCompare(b.name);
          });
          return (
            <Card key={category}>
              <div className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Icon size={16} /> {category} Accounts
                  <span className="text-xs font-normal text-slate-400">({acctList.length})</span>
                </h3>
                {sorted.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No {category} accounts yet</p>
                )}
                {sorted.map(a => {
                  const count = requisitions.filter(r => r.account_id === a.id).length;
                  const isEmpty = count === 0;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 group/row ${isEmpty ? 'opacity-60' : ''}`}
                    >
                      <span className="text-xs text-slate-700">{a.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isEmpty ? 'text-slate-400 italic' : 'text-slate-500'}`}>
                          {count} {count === 1 ? 'role' : 'roles'}
                        </span>
                        <button
                          onClick={() => {
                            const msg = isEmpty
                              ? `Delete empty account "${a.name}"?`
                              : `Delete "${a.name}" and all its ${count} requisitions?`;
                            if (confirm(msg)) {
                              if (!isEmpty) {
                                requisitions.filter(r => r.account_id === a.id).forEach(r => removeRequisition(r.id));
                              }
                              removeAccount(a.id);
                            }
                          }}
                          className={`p-0.5 text-red-400 hover:text-red-600 transition-opacity ${
                            isEmpty ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover/row:opacity-100'
                          }`}
                          title={isEmpty ? 'Delete empty account' : 'Delete account'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  /* —— Requisitions Tab (All / MSP / SI) —— */
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

  /* —— Page —— */
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
          { key: 'forecast', label: 'AI Forecast' },
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
      {activeTab === 'forecast' ? (
        <>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Brain size={18} />
              <h2 className="font-bold text-base">AI-Powered Closure Forecast</h2>
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">AI Insights</span>
            </div>
            <p className="text-slate-400 text-xs mb-5">Based on pipeline stage, notes sentiment, and closure timeline</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total Roles', val: fTotalReqs, color: '#94a3b8', conf: 100 },
                { label: 'Optimistic', val: fOptimistic, color: '#10b981', conf: 40, desc: 'Prob >= 40%' },
                { label: 'Realistic', val: fRealistic, color: '#3b82f6', conf: 70, desc: 'Prob >= 60%' },
                { label: 'Conservative', val: fConservative, color: '#f59e0b', conf: 90, desc: 'Prob >= 75%' },
                { label: 'At Risk', val: fAtRisk, color: '#ef4444', conf: 85, desc: 'High risk' },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="text-blue-300 text-xs font-semibold mb-2">{s.label}</h4>
                  <div className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>{s.val} <span className="text-sm text-slate-400 font-normal">of {fTotalReqs}</span></div>
                  {s.desc && <p className="text-[10px] text-slate-500">{s.desc}</p>}
                  <div className="h-1 bg-white/10 rounded mt-2 overflow-hidden"><div className="h-full rounded" style={{ width: `${s.conf}%`, background: s.color }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <span className="text-slate-300 text-sm font-semibold">Average Closure Probability: </span>
              <span className="text-xl font-extrabold" style={{ color: fAvgProb >= 60 ? '#10b981' : fAvgProb >= 40 ? '#f59e0b' : '#ef4444' }}>{fAvgProb}%</span>
            </div>
          </div>

          <Card>
            <h3 className="font-bold text-sm mb-3">Forecast by Requisition</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Account</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Role</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Stage</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Prob</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Risk</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Closure Date</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {[...scoredReqs].sort((a, b) => b.closureProb - a.closureProb).map(req => {
                    let rec = 'Monitor progress';
                    if (req.risk === 'high') rec = 'Escalate - add more profiles & parallel source';
                    else if (req.stage === 'New' || req.stage === 'Sourcing') rec = 'Accelerate sourcing - increase pipeline';
                    else if (req.stage === 'Client Round') rec = 'Follow up with client for feedback';
                    else if (req.stage === 'Onboarding' || req.stage === 'Closed/Selected') rec = 'Track onboarding timeline';
                    else if (req.stage === 'On Hold') rec = 'Re-engage - check if requirement is still active';
                    const probColor = req.closureProb >= 65 ? '#10b981' : req.closureProb >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-2 font-bold">{req.account_name}</td>
                        <td className="p-2">{req.role}</td>
                        <td className="p-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: US_STAGE_COLORS[req.stage as USStaffingStage] || '#94a3b8' }}>
                            {req.stage}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 rounded bg-slate-100 overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${req.closureProb}%`, background: probColor }} />
                            </div>
                            <span className="font-bold">{req.closureProb}%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <StatusBadge status={req.risk === 'high' ? 'at-risk' : req.risk === 'medium' ? 'caution' : 'on-track'} label={req.risk} />
                        </td>
                        <td className="p-2 text-slate-500">{req.closure_date || 'TBD'}</td>
                        <td className="p-2 text-slate-500">{rec}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : activeTab === 'overview' ? renderOverview() : renderRequisitions()}
    </div>
  );
}
