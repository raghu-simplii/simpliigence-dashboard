import { useTeamStore, useProjectStore, useCandidateStore, useTMStore, useFinancialStore, useSyncStore } from '../store';
import { Button, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { Download, Trash2, Database, Plus, X, FileSpreadsheet, RefreshCw, CloudDownload, Check, AlertCircle } from 'lucide-react';
import { loadSeedIntoStores } from '../data/employeeSeed';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ui';
import { ROLE_LABELS, SENIORITY_LABELS } from '../constants';
import type { Role, Seniority } from '../types';
import { performSync } from '../lib/syncOneDrive';

export default function SettingsPage() {
  const teamStore = useTeamStore();
  const projectStore = useProjectStore();
  const candidateStore = useCandidateStore();
  const tmStore = useTMStore();
  const financialStore = useFinancialStore();
  const { rateCards, hiringBudgets, settings, updateRateCard, initializeDefaultRateCards, addHiringBudget, deleteHiringBudget, updateSettings } = financialStore;
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [newBudgetPeriod, setNewBudgetPeriod] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const syncStore = useSyncStore();

  const handleSync = async () => {
    await performSync();
  };

  const timeSince = (iso: string) => {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 2,
      team: teamStore.members,
      projects: projectStore.projects,
      candidates: candidateStore.candidates,
      tmPositions: tmStore.positions,
      financial: {
        rateCards,
        hiringBudgets,
        settings,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simpliigence-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    localStorage.removeItem('simpliigence-team');
    localStorage.removeItem('simpliigence-projects');
    localStorage.removeItem('simpliigence-candidates');
    localStorage.removeItem('simpliigence-tm');
    localStorage.removeItem('simpliigence-financial');
    localStorage.removeItem('simpliigence-sync');
    window.location.reload();
  };

  const totalRecords =
    teamStore.members.length +
    projectStore.projects.length +
    candidateStore.candidates.length +
    tmStore.positions.length;

  const handleAddBudget = () => {
    if (!newBudgetPeriod.trim() || !newBudgetAmount) return;
    addHiringBudget({ period: newBudgetPeriod.trim(), allocatedAmount: Number(newBudgetAmount), notes: '' });
    setNewBudgetPeriod('');
    setNewBudgetAmount('');
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your data and connections." />

      <div className="max-w-3xl space-y-6">
        {/* OneDrive Spreadsheet Sync */}
        <Card title="OneDrive Spreadsheet">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OneDrive Share URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="https://1drv.ms/x/..."
                  value={syncStore.oneDriveUrl}
                  onChange={(e) => syncStore.setOneDriveUrl(e.target.value)}
                />
                {syncStore.oneDriveUrl && (
                  <button
                    onClick={() => syncStore.clearConfig()}
                    className="text-slate-400 hover:text-red-500 px-2"
                    title="Clear URL"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Sheet Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={syncStore.sheetName}
                  onChange={(e) => syncStore.setSheetName(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary/50"
                  checked={syncStore.autoSyncOnLoad}
                  onChange={(e) => syncStore.setAutoSync(e.target.checked)}
                />
                <span className="text-sm text-slate-600">Auto-sync on load</span>
              </label>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                {syncStore.lastSyncStatus === 'success' && (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">
                      Synced {syncStore.lastSyncAt ? timeSince(syncStore.lastSyncAt) : ''}.{' '}
                      {syncStore.lastSyncRowCount} rows → {syncStore.lastSyncMemberCount} members, {syncStore.lastSyncProjectCount} projects
                    </span>
                  </>
                )}
                {syncStore.lastSyncStatus === 'error' && (
                  <>
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-sm text-red-600">{syncStore.lastSyncError}</span>
                  </>
                )}
                {syncStore.lastSyncStatus === 'never' && (
                  <span className="text-sm text-slate-400">Not synced yet. Paste a OneDrive share URL and click Sync Now.</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSync}
                disabled={!syncStore.oneDriveUrl || syncStore.isSyncing}
              >
                {syncStore.isSyncing ? (
                  <><RefreshCw size={14} className="animate-spin" /> Syncing…</>
                ) : (
                  <><CloudDownload size={14} /> Sync Now</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Data Overview">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Team Members</span>
              <span className="text-sm font-semibold text-slate-800">{teamStore.members.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Projects</span>
              <span className="text-sm font-semibold text-slate-800">{projectStore.projects.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Candidates</span>
              <span className="text-sm font-semibold text-slate-800">{candidateStore.candidates.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">T&M Positions</span>
              <span className="text-sm font-semibold text-slate-800">{tmStore.positions.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Rate Cards</span>
              <span className="text-sm font-semibold text-slate-800">{rateCards.length}</span>
            </div>
          </div>
        </Card>

        {/* Exchange Rate */}
        <Card title="Currency Settings">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Rate (₹ per $1 USD)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={settings.exchangeRate}
                onChange={(e) => updateSettings({ exchangeRate: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="text-sm text-slate-500 pt-6">
              ₹1,00,000 = ${Math.round(100000 / (settings.exchangeRate || 1)).toLocaleString()} USD
            </div>
          </div>
        </Card>

        {/* Rate Cards */}
        <Card title="Rate Cards (₹/month)">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-slate-500">Standard cost bands by role and seniority. Used when individual CTC is not set.</p>
            <Button size="sm" variant="secondary" onClick={initializeDefaultRateCards}>
              Load Defaults
            </Button>
          </div>
          {rateCards.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No rate cards. Click "Load Defaults" to populate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Role</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Seniority</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">Monthly CTC (₹)</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">Billing Rate (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.map((rc) => (
                    <tr key={rc.id} className="border-b border-slate-50">
                      <td className="px-3 py-2 text-slate-700">{ROLE_LABELS[rc.role as Role]}</td>
                      <td className="px-3 py-2 text-slate-600">{SENIORITY_LABELS[rc.seniority as Seniority]}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="w-28 text-right rounded border border-slate-200 px-2 py-1 text-sm tabular-nums"
                          value={rc.monthlyCTC}
                          onChange={(e) => updateRateCard(rc.id, { monthlyCTC: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="w-28 text-right rounded border border-slate-200 px-2 py-1 text-sm tabular-nums"
                          value={rc.monthlyBillingRate}
                          onChange={(e) => updateRateCard(rc.id, { monthlyBillingRate: Number(e.target.value) || 0 })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Hiring Budgets */}
        <Card title="Hiring Budgets">
          <p className="text-xs text-slate-500 mb-4">Set quarterly or annual budgets. Spend is estimated from joined candidates' annual CTC.</p>
          {hiringBudgets.length > 0 && (
            <div className="space-y-2 mb-4">
              {hiringBudgets.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-800 w-32">{b.period}</span>
                  <span className="text-sm tabular-nums text-slate-600">₹{(b.allocatedAmount / 100000).toFixed(2)}L</span>
                  <button onClick={() => deleteHiringBudget(b.id)} className="ml-auto text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 2026-Q1"
                value={newBudgetPeriod}
                onChange={(e) => setNewBudgetPeriod(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Total budget"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleAddBudget}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </Card>

        <Card title="Data Management">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Load Employee Data</p>
                <p className="text-xs text-slate-500">Import 23 employees &amp; 8 projects from the master spreadsheet. Replaces existing team &amp; project data.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setConfirmSeed(true)}>
                <FileSpreadsheet size={14} /> Load Data
              </Button>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Export All Data</p>
                <p className="text-xs text-slate-500">Download everything as a JSON file. {totalRecords} records.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={exportData}>
                <Download size={14} /> Export
              </Button>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Clear All Data</p>
                <p className="text-xs text-slate-500">Permanently delete everything. This cannot be undone.</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} /> Clear
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Zoho Recruit Connection">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {tmStore.syncState.isConnected ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-xs text-slate-500">
                {tmStore.syncState.isConnected
                  ? `Last sync: ${tmStore.syncState.lastSyncAt ? new Date(tmStore.syncState.lastSyncAt).toLocaleString() : 'Never'}`
                  : 'Connect to pull T&M positions automatically.'}
              </p>
            </div>
            <Button size="sm" variant="secondary">
              <Database size={14} /> Configure
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Full Zoho Recruit OAuth2 integration requires API credentials. Use "Load Sample Data" on the T&M Intel page to preview the feature.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear All Data?"
        message="This will permanently delete all team members, projects, candidates, T&M data, and financial settings. Export first if you need a backup."
        confirmLabel="Clear Everything"
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmSeed}
        title="Load Employee Data?"
        message="This will replace all team members and projects with 23 employees and 8 projects from the master spreadsheet. Existing roster and pipeline data will be overwritten."
        confirmLabel="Load Data"
        onConfirm={() => { setConfirmSeed(false); loadSeedIntoStores(); }}
        onCancel={() => setConfirmSeed(false)}
      />
    </div>
  );
}
