import { useForecastStore, useFinancialStore, useSyncStore } from '../store';
import { Button, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { Download, Trash2, X, FileSpreadsheet, RefreshCw, CloudDownload, Check, AlertCircle } from 'lucide-react';
import { loadSeedIntoStores } from '../data/employeeSeed';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ui';
import { performSync } from '../lib/syncOneDrive';
import { deriveEmployeeSummaries, deriveProjectSummaries } from '../lib/parseSpreadsheet';

export default function SettingsPage() {
  const forecastStore = useForecastStore();
  const financialStore = useFinancialStore();
  const { settings, updateSettings } = financialStore;
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const syncStore = useSyncStore();

  const employees = deriveEmployeeSummaries(forecastStore.assignments);
  const projects = deriveProjectSummaries(forecastStore.assignments);

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
      version: 3,
      assignments: forecastStore.assignments,
      financial: { settings },
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
    localStorage.removeItem('simpliigence-forecast');
    localStorage.removeItem('simpliigence-financial');
    localStorage.removeItem('simpliigence-sync');
    window.location.reload();
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage data sync and configuration." />

      <div className="max-w-3xl space-y-6">
        {/* Dropbox Spreadsheet Sync */}
        <Card title="Live Spreadsheet">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dropbox or OneDrive Share Link</label>
              <p className="text-xs text-slate-500 mb-2">Dropbox recommended. Right-click the file &rarr; "Copy link" and paste below.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="https://www.dropbox.com/scl/fi/... or https://1drv.ms/x/..."
                  value={syncStore.oneDriveUrl}
                  onChange={(e) => syncStore.setOneDriveUrl(e.target.value)}
                />
                {syncStore.oneDriveUrl && (
                  <button onClick={() => syncStore.clearConfig()} className="text-slate-400 hover:text-red-500 px-2" title="Clear URL">
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
                      {syncStore.lastSyncRowCount} assignments &rarr; {syncStore.lastSyncMemberCount} employees, {syncStore.lastSyncProjectCount} projects
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
                  <span className="text-sm text-slate-400">Not synced yet. Paste a share URL and click Sync Now.</span>
                )}
              </div>
              <Button size="sm" onClick={handleSync} disabled={!syncStore.oneDriveUrl || syncStore.isSyncing}>
                {syncStore.isSyncing ? (
                  <><RefreshCw size={14} className="animate-spin" /> Syncing&hellip;</>
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
              <span className="text-sm text-slate-600">Forecast Assignments</span>
              <span className="text-sm font-semibold text-slate-800">{forecastStore.assignments.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Unique Employees</span>
              <span className="text-sm font-semibold text-slate-800">{employees.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Active Projects</span>
              <span className="text-sm font-semibold text-slate-800">{projects.length}</span>
            </div>
          </div>
        </Card>

        <Card title="Currency & Exchange Rates">
          <p className="text-xs text-slate-400 mb-4">Set conversion rates used across the dashboard for cost and revenue calculations.</p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">USD to INR (₹ per $1 USD)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={settings.exchangeRate}
                  onChange={(e) => updateSettings({ exchangeRate: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="text-sm text-slate-500 pt-6">
                $1 USD = ₹{settings.exchangeRate.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">CAD to USD ($ per CA$1)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={settings.cadToUsdRate}
                  onChange={(e) => updateSettings({ cadToUsdRate: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="text-sm text-slate-500 pt-6">
                CA$1 = ${settings.cadToUsdRate.toFixed(2)} USD
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              <p>Quick reference: CA$100,000 = ${Math.round(100000 * (settings.cadToUsdRate || 0.73)).toLocaleString()} USD = ₹{Math.round(100000 * (settings.cadToUsdRate || 0.73) * (settings.exchangeRate || 83.5)).toLocaleString()} INR</p>
            </div>
          </div>
        </Card>

        <Card title="Data Management">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Load Seed Data</p>
                <p className="text-xs text-slate-500">Import sample employee forecast data. Replaces current data.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setConfirmSeed(true)}>
                <FileSpreadsheet size={14} /> Load Data
              </Button>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Export All Data</p>
                <p className="text-xs text-slate-500">Download as JSON. {forecastStore.assignments.length} assignments.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={exportData}>
                <Download size={14} /> Export
              </Button>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Clear All Data</p>
                <p className="text-xs text-slate-500">Permanently delete everything. Cannot be undone.</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} /> Clear
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear All Data?"
        message="This will delete all forecast data and settings. Export first if needed."
        confirmLabel="Clear Everything"
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmSeed}
        title="Load Seed Data?"
        message="This will replace all current data with sample forecast data from the master spreadsheet."
        confirmLabel="Load Data"
        onConfirm={() => { setConfirmSeed(false); loadSeedIntoStores(); }}
        onCancel={() => setConfirmSeed(false)}
      />
    </div>
  );
}
