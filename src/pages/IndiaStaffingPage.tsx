// @ts-nocheck
import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users, AlertTriangle, TrendingUp, CheckCircle, Upload,
  Download, Brain, BarChart3, Building2, Pencil, Trash2, Save, X, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useStaffingStore } from '../store/useStaffingStore';
import { analyzeStaffingStatus } from '../lib/staffingAnalysis';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, StatCard, StatusBadge } from '../components/ui';
import type { StaffingRow, RiskLevel, PipelineStage, StaffingStatus } from '../types/staffing';
import { STAGE_COLORS } from '../types/staffing';

/* -- Constants -- */
const STATUS_OPTIONS: StaffingStatus[] = ['Open', 'In Progress', 'On Hold', 'Closed', 'Cancelled'];
const STATUS_COLORS: Record<StaffingStatus, string> = {
  'Open': '#3b82f6', 'In Progress': '#f59e0b', 'On Hold': '#94a3b8', 'Closed': '#10b981', 'Cancelled': '#ef4444',
};
const probColor = (p: number) => p >= 65 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444';
const PIPELINE_STAGES: PipelineStage[] = ['Sourcing','Profiles Shared','Interview','Shortlisted','Client Round','Closed/Selected','Onboarding'];
const ALL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* -- Editable Cell -- */
function EditableCell({ value, onSave, type = 'text', options, className = '', displayContent }: {
  value: string | number;
  onSave: (val: string | number) => void;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  className?: string;
  displayContent?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<any>(null);

  const focus = () => setTimeout(() => inputRef.current?.focus(), 0);
  const commit = () => {
    const final = type === 'number' ? Number(draft) : draft;
    if (final !== value) onSave(final);
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  if (!editing) {
    return (
      <div
        className={`group cursor-pointer rounded px-1 -mx-1 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-h-[24px] flex items-center ${className}`}
        onClick={() => { setDraft(value); setEditing(true); focus(); }}
        title="Click to edit"
      >
        {displayContent || <span>{value}</span>}
        <Pencil size={10} className="ml-1 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <select ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey}
        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <input ref={inputRef} type={type} value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey}
      className={`w-full px-1 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 ${type === 'number' ? 'w-16 text-center' : ''}`}
      min={type === 'number' ? 0 : undefined}
    />
  );
}


export default function IndiaStaffingPage() {
  const { accounts, requisitions, statuses, addRequisition, addStatus, addAccount, updateRequisition, removeRequisition, removeStatus, importRows } = useStaffingStore();

  const [monthFilter, setMonthFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'forecast'>('overview');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  /* -- Build enriched rows -- */
  const rows: StaffingRow[] = useMemo(() => {
    return requisitions.map((req) => {
      const acct = accounts.find((a) => a.id === req.account_id);
      const reqStatuses = statuses
        .filter((s) => s.requisition_id === req.id)
        .sort((a, b) => b.status_date.localeCompare(a.status_date));
      const combinedStatus = reqStatuses.map((s) => `${s.status_date.slice(5).replace('-', '/')}: ${s.status_text}`).join('\n');
      const latestAnticipation = reqStatuses[0]?.anticipation || req.anticipation;
      const analysis = analyzeStaffingStatus(combinedStatus, latestAnticipation);
      return {
        id: req.id, month: req.month, account: acct?.name || 'Unknown', account_id: req.account_id,
        requisition: req.title, newPositions: req.new_positions, backfills: req.backfills,
        totalPositions: req.new_positions + req.backfills, expectedClosure: req.expected_closure,
        closeByDate: req.close_by_date || '', statusField: req.status_field || 'Open',
        status: combinedStatus, anticipation: latestAnticipation,
        closureProb: analysis.score, risk: analysis.risk, stage: req.stage || analysis.stage, velocity: analysis.velocity,
      };
    });
  }, [requisitions, statuses, accounts]);

  const months = useMemo(() => [...new Set(rows.map((r) => r.month))].sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (monthFilter !== 'all' && r.month !== monthFilter) return false;
      if (accountFilter !== 'all' && r.account !== accountFilter) return false;
      if (riskFilter !== 'all' && r.risk !== riskFilter) return false;
      return true;
    });
  }, [rows, monthFilter, accountFilter, riskFilter]);

  /* -- KPI aggregates -- */
  const totalPos = filtered.reduce((s, r) => s + r.totalPositions, 0);
  const closedRows = filtered.filter((r) => r.stage === 'Closed/Selected' || r.stage === 'Onboarding');
  const closedCount = closedRows.reduce((s, r) => s + r.totalPositions, 0);
  const highRiskCount = filtered.filter((r) => r.risk === 'high').length;
  const avgProb = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.closureProb, 0) / filtered.length) : 0;

  /* -- Forecast aggregates -- */
  const optimistic = filtered.filter((r) => r.closureProb >= 40).reduce((s, r) => s + r.totalPositions, 0);
  const realistic = filtered.filter((r) => r.closureProb >= 60).reduce((s, r) => s + r.totalPositions, 0);
  const conservative = filtered.filter((r) => r.closureProb >= 75).reduce((s, r) => s + r.totalPositions, 0);

  /* -- Cell save handler -- */
  const handleCellSave = useCallback((reqId: string, field: string, value: string | number) => {
    const patch: Record<string, any> = {};
    switch (field) {
      case 'title': patch.title = value; break;
      case 'month': patch.month = value; break;
      case 'new_positions': patch.new_positions = Number(value); break;
      case 'backfills': patch.backfills = Number(value); break;
      case 'expected_closure': patch.expected_closure = value; break;
      case 'close_by_date': patch.close_by_date = value; break;
      case 'status_field': patch.status_field = value; break;
      case 'stage': patch.stage = value; break;
      case 'anticipation': patch.anticipation = value; break;
      case 'account_id': patch.account_id = value; break;
      default: return;
    }
    updateRequisition(reqId, patch);
  }, [updateRequisition]);

  /* -- Inline status add (Enter to submit) -- */
  const handleInlineStatus = useCallback((reqId: string, text: string) => {
    if (!text.trim()) return;
    addStatus({
      requisition_id: reqId,
      status_date: new Date().toISOString().slice(0, 10),
      status_text: text.trim(),
      anticipation: '',
    });
  }, [addStatus]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* -- CSV import -- */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const importedRows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => (row[h] = vals[i] || ''));
        return {
          month: row['month'] || '', account: row['account'] || '', requisition: row['requisition'] || '',
          new_positions: parseInt(row['new positions']) || 0, backfills: parseInt(row['backfills']) || 0,
          expected_closure: row['expected closure'] || '', status_text: row['status'] || '',
          anticipation: row['anticipation'] || '',
        };
      });
      const result = importRows(importedRows);
      alert(`Imported ${result.imported} rows. ${result.errors.length ? result.errors.join('\n') : ''}`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* -- CSV export -- */
  const handleExport = () => {
    let csv = 'Month,Account,Requisition,New Positions,Backfills,Expected Closure,Stage,Risk,Probability,Status,Anticipation\n';
    filtered.forEach((r) => {
      csv += `${r.month},"${r.account}","${r.requisition}",${r.newPositions},${r.backfills},"${r.expectedClosure}",${r.stage},${r.risk},${r.closureProb}%,"${(r.status || '').split('\n')[0]}","${r.anticipation}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `staffing_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const tabs = [
    { key: 'overview' as const, label: 'Executive Overview', icon: BarChart3 },
    { key: 'accounts' as const, label: 'Account Deep Dive', icon: Building2 },
    { key: 'forecast' as const, label: 'AI Forecast', icon: Brain },
  ];

  const accountGroups = useMemo(() => {
    const map = new Map<string, StaffingRow[]>();
    filtered.forEach((r) => {
      const arr = map.get(r.account) || [];
      arr.push(r);
      map.set(r.account, arr);
    });
    return map;
  }, [filtered]);

  return (
    <>
      <PageHeader title="India Staffing" subtitle="Real-time staffing tracker with AI-powered closure forecasting" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="all">All Months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="all">All Accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
          <option value="all">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
        <div className="flex-1" />
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50">
          <Upload size={14} /> Import CSV
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-lg shadow-sm mb-6 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Open Positions" value={totalPos} icon={<Users size={20} />} subtitle={`${filtered.length} requisitions`} />
            <StatCard label="Closed / Onboarding" value={closedCount} icon={<CheckCircle size={20} />} subtitle={`${closedRows.length} progressing`} />
            <StatCard label="High Risk" value={highRiskCount} icon={<AlertTriangle size={20} />} subtitle={`${filtered.filter((r) => r.risk === 'medium').length} medium`} />
            <StatCard label="Avg Closure Prob" value={`${avgProb}%`} icon={<TrendingUp size={20} />} subtitle="AI-scored" />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">All Requisitions</h3>
              <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-1 rounded-full">Click any cell to edit | Type in "Add Update" and press Enter</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="w-6 p-2"></th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Account</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Requisition</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Month</th>
                    <th className="text-center p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">New</th>
                    <th className="text-center p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">BF</th>
                    <th className="text-center p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Total</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Status</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Stage</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Risk</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Prob</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px]">Close By</th>
                    <th className="text-left p-2 text-slate-400 font-bold uppercase tracking-wide text-[10px] min-w-[180px]">Add Update</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const isExpanded = expandedRows.has(r.id);
                    const reqStatuses = statuses.filter(s => s.requisition_id === r.id).sort((a, b) => b.status_date.localeCompare(a.status_date));
                    return (
                      <React.Fragment key={r.id}>
                        <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                          {/* Expand */}
                          <td className="p-1 text-center">
                            <button onClick={() => toggleRow(r.id)} className="p-0.5 rounded hover:bg-slate-100" title="Show status history">
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          </td>
                          {/* Account */}
                          <td className="p-2">
                            <EditableCell value={r.account_id} type="select" options={accounts.map(a => a.id)}
                              onSave={(val) => handleCellSave(r.id, 'account_id', val)}
                              displayContent={<span className="font-bold">{r.account}</span>} />
                          </td>
                          {/* Requisition */}
                          <td className="p-2">
                            <EditableCell value={r.requisition} onSave={(val) => handleCellSave(r.id, 'title', val)} />
                          </td>
                          {/* Month */}
                          <td className="p-2">
                            <EditableCell value={r.month} type="select" options={ALL_MONTHS} onSave={(val) => handleCellSave(r.id, 'month', val)} />
                          </td>
                          {/* New */}
                          <td className="p-2 text-center">
                            <EditableCell value={r.newPositions} type="number" onSave={(val) => handleCellSave(r.id, 'new_positions', val)} className="justify-center" />
                          </td>
                          {/* BF */}
                          <td className="p-2 text-center">
                            <EditableCell value={r.backfills} type="number" onSave={(val) => handleCellSave(r.id, 'backfills', val)} className="justify-center" />
                          </td>
                          {/* Total */}
                          <td className="p-2 text-center font-bold text-slate-700">{r.totalPositions}</td>
                          {/* Status */}
                          <td className="p-2">
                            <EditableCell value={r.statusField} type="select" options={STATUS_OPTIONS}
                              onSave={(val) => handleCellSave(r.id, 'status_field', val)}
                              displayContent={<span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: STATUS_COLORS[r.statusField] || '#94a3b8' }}>{r.statusField}</span>} />
                          </td>
                          {/* Stage */}
                          <td className="p-2">
                            <EditableCell value={r.stage} type="select" options={PIPELINE_STAGES}
                              onSave={(val) => handleCellSave(r.id, 'stage', val)}
                              displayContent={<span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: STAGE_COLORS[r.stage] }}>{r.stage}</span>} />
                          </td>
                          {/* Risk */}
                          <td className="p-2">
                            <StatusBadge status={r.risk === 'high' ? 'at-risk' : r.risk === 'medium' ? 'caution' : 'on-track'} label={r.risk} />
                          </td>
                          {/* Prob */}
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1.5 rounded bg-slate-100 overflow-hidden">
                                <div className="h-full rounded" style={{ width: `${r.closureProb}%`, background: probColor(r.closureProb) }} />
                              </div>
                              <span className="font-bold">{r.closureProb}%</span>
                            </div>
                          </td>
                          {/* Close By */}
                          <td className="p-2">
                            <input type="date" value={r.closeByDate}
                              className="px-1 py-0.5 text-[11px] border border-slate-200 rounded bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-[120px]"
                              onChange={(e) => handleCellSave(r.id, 'close_by_date', e.target.value)} />
                            {r.expectedClosure && <div className="text-[9px] text-slate-400 italic mt-0.5">{r.expectedClosure}</div>}
                          </td>
                          {/* Inline status add */}
                          <td className="p-2">
                            <input
                              placeholder="Quick status update..."
                              className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white hover:border-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  handleInlineStatus(r.id, input.value);
                                  input.value = '';
                                }
                              }}
                            />
                            {reqStatuses[0] && (
                              <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[170px]" title={reqStatuses[0].status_text}>
                                {reqStatuses[0].status_date.slice(5)}: {reqStatuses[0].status_text}
                              </div>
                            )}
                          </td>
                          {/* Delete */}
                          <td className="p-1">
                            <button onClick={() => { if (confirm(`Delete "${r.requisition}"?`)) removeRequisition(r.id); }}
                              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="Delete requisition">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded status history */}
                        {isExpanded && (
                          <tr key={`${r.id}-exp`}>
                            <td colSpan={14} className="bg-slate-50/80 p-0">
                              <div className="px-8 py-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Status History</div>
                                {reqStatuses.length === 0 && <p className="text-xs text-slate-400 italic">No status updates yet</p>}
                                <div className="space-y-1.5">
                                  {reqStatuses.map(s => (
                                    <div key={s.id} className="flex items-start gap-3 text-xs group">
                                      <span className="text-slate-400 font-mono text-[10px] w-20 flex-shrink-0 pt-0.5">{s.status_date}</span>
                                      <span className="flex-1 text-slate-600">{s.status_text}</span>
                                      {s.anticipation && <span className="text-blue-500 text-[10px] italic flex-shrink-0">{'→'} {s.anticipation}</span>}
                                      <button onClick={() => { if (confirm('Delete this status?')) removeStatus(s.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all flex-shrink-0" title="Delete status">
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {/* Detailed add */}
                                <div className="mt-3 flex gap-2 items-end">
                                  <input type="date" className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white" defaultValue={new Date().toISOString().slice(0,10)} id={`date-${r.id}`} />
                                  <input placeholder="Status update..." className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded bg-white" id={`text-${r.id}`} />
                                  <input placeholder="Anticipation..." className="w-40 px-2 py-1 text-[11px] border border-slate-200 rounded bg-white" id={`antic-${r.id}`} />
                                  <button onClick={() => {
                                    const dateEl = document.getElementById(`date-${r.id}`) as HTMLInputElement;
                                    const textEl = document.getElementById(`text-${r.id}`) as HTMLInputElement;
                                    const anticEl = document.getElementById(`antic-${r.id}`) as HTMLInputElement;
                                    if (textEl.value) {
                                      addStatus({ requisition_id: r.id, status_date: dateEl.value, status_text: textEl.value, anticipation: anticEl.value });
                                      textEl.value = ''; anticEl.value = '';
                                    }
                                  }} className="px-3 py-1 bg-primary text-white rounded text-[11px] font-semibold hover:bg-primary/90 flex-shrink-0">
                                    + Add
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ====== ACCOUNTS TAB ====== */}
      {activeTab === 'accounts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[...accountGroups.entries()].map(([name, rws]) => {
              const tot = rws.reduce((s, r) => s + r.totalPositions, 0);
              const avg = Math.round(rws.reduce((s, r) => s + r.closureProb, 0) / rws.length);
              const hr = rws.filter((r) => r.risk === 'high').length;
              return (
                <Card key={name} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow" onClick={() => setSelectedAccount(selectedAccount === name ? null : name)}>
                  <h4 className="font-bold text-sm mb-3">{name}</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Open Positions</span><span className="font-bold">{tot}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Requisitions</span><span className="font-bold">{rws.length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Avg Closure Prob</span><span className="font-bold">{avg}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">High Risk</span><span className="font-bold text-red-600">{hr}</span></div>
                  </div>
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, background: probColor(avg) }} />
                  </div>
                </Card>
              );
            })}
          </div>
          {selectedAccount && (
            <Card>
              <h3 className="font-bold text-sm mb-3">{selectedAccount} -- Requisition Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b-2 border-slate-100"><th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Requisition</th><th className="p-2">Month</th><th className="p-2">Pos</th><th className="p-2">Stage</th><th className="p-2">Risk</th><th className="p-2">Prob</th><th className="p-2">Status</th></tr></thead>
                  <tbody>
                    {(accountGroups.get(selectedAccount) || []).map((r) => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="p-2 font-semibold">{r.requisition}</td>
                        <td className="p-2">{r.month}</td>
                        <td className="p-2 text-center font-bold">{r.totalPositions}</td>
                        <td className="p-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: STAGE_COLORS[r.stage] }}>{r.stage}</span></td>
                        <td className="p-2"><StatusBadge status={r.risk === 'high' ? 'at-risk' : r.risk === 'medium' ? 'caution' : 'on-track'} label={r.risk} /></td>
                        <td className="p-2 font-bold">{r.closureProb}%</td>
                        <td className="p-2 text-slate-500 text-[11px] max-w-sm truncate">{r.status.split('\n')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ====== FORECAST TAB ====== */}
      {activeTab === 'forecast' && (
        <>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-base">AI-Powered Closure Forecast</h2>
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">AI Insights</span>
            </div>
            <p className="text-slate-400 text-xs mb-5">Based on status velocity, sentiment analysis, and pipeline stage</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { label: 'Optimistic', val: optimistic, color: '#10b981', conf: 40 },
                { label: 'Realistic', val: realistic, color: '#3b82f6', conf: 70 },
                { label: 'Conservative', val: conservative, color: '#f59e0b', conf: 90 },
                { label: 'At Risk', val: filtered.filter((r) => r.risk === 'high').reduce((s, r) => s + r.totalPositions, 0), color: '#ef4444', conf: 85 },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="text-blue-300 text-xs font-semibold mb-2">{s.label}</h4>
                  <div className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>{s.val} <span className="text-sm text-slate-400 font-normal">of {totalPos}</span></div>
                  <div className="h-1 bg-white/10 rounded mt-3 overflow-hidden"><div className="h-full rounded" style={{ width: `${s.conf}%`, background: s.color }} /></div>
                  <p className="text-[10px] text-slate-500 text-right mt-1">{s.conf}% confidence</p>
                </div>
              ))}
            </div>
          </div>
          <Card>
            <h3 className="font-bold text-sm mb-3">Forecast Reasoning by Requisition</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b-2 border-slate-100"><th className="text-left p-2 text-slate-400 font-bold uppercase text-[10px]">Account</th><th className="p-2">Requisition</th><th className="p-2">Stage</th><th className="p-2">Prob</th><th className="p-2">Risk</th><th className="p-2">Recommendation</th></tr></thead>
                <tbody>
                  {[...filtered].sort((a, b) => b.closureProb - a.closureProb).map((r) => {
                    let rec = 'Monitor';
                    if (r.risk === 'high') rec = 'Escalate & parallel source';
                    else if (r.stage === 'Sourcing') rec = 'Accelerate sourcing';
                    else if (r.stage === 'Client Round') rec = 'Follow up with client';
                    else if (r.stage === 'Onboarding') rec = 'Track onboarding';
                    return (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="p-2 font-bold">{r.account}</td><td className="p-2">{r.requisition}</td>
                        <td className="p-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: STAGE_COLORS[r.stage] }}>{r.stage}</span></td>
                        <td className="p-2 font-bold">{r.closureProb}%</td>
                        <td className="p-2"><StatusBadge status={r.risk === 'high' ? 'at-risk' : r.risk === 'medium' ? 'caution' : 'on-track'} label={r.risk} /></td>
                        <td className="p-2 text-slate-500">{rec}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
