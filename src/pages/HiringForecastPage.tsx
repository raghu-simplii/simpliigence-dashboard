import { useMemo } from 'react';
import { Users, TrendingUp, AlertTriangle, UserPlus } from 'lucide-react';
import { useForecastStore, useHiringForecastStore } from '../store';
import { StatCard, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import { ROLE_CATEGORIES, ROLE_CATEGORY_LABELS } from '../types/hiringForecast';
import { computeHiringForecast, aggregateGapRows } from '../lib/hiringForecastCalc';
import { DemandCapacityChart } from '../components/hiring/DemandCapacityChart';
import { ConciergeConfigPanel } from '../components/hiring/ConciergeConfigPanel';
import { StaffingRequestList } from '../components/hiring/StaffingRequestList';
import { PipelineProjectList } from '../components/hiring/PipelineProjectList';

export default function HiringForecastPage() {
  const assignments = useForecastStore((s) => s.assignments);
  const {
    conciergeConfig, staffingRequests, pipelineProjects, scenarioSettings,
    setConciergeHours, addStaffingRequest, removeStaffingRequest,
    addPipelineProject, removePipelineProject, updateScenarioSettings,
  } = useHiringForecastStore();

  const gapRows = useMemo(
    () => computeHiringForecast(assignments, conciergeConfig, staffingRequests, pipelineProjects, scenarioSettings),
    [assignments, conciergeConfig, staffingRequests, pipelineProjects, scenarioSettings],
  );

  const summary = useMemo(() => aggregateGapRows(gapRows), [gapRows]);

  const activeMonths = useMemo(() => {
    const s = MONTHS.indexOf(scenarioSettings.forecastStartMonth);
    const e = MONTHS.indexOf(scenarioSettings.forecastEndMonth);
    return MONTHS.slice(s, e + 1);
  }, [scenarioSettings]);

  return (
    <>
      <PageHeader title="Hiring Forecast" subtitle="Scenario planner for staffing needs — 2026" />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<TrendingUp size={24} />} label="Total Demand" value={`${Math.round(summary.totalDemand).toLocaleString()} hrs`} />
        <StatCard icon={<Users size={24} />} label="Current Capacity" value={`${Math.round(summary.totalCapacity).toLocaleString()} hrs`} />
        <StatCard icon={<AlertTriangle size={24} />} label="Capacity Gap" value={`${Math.round(summary.totalGap).toLocaleString()} hrs`} />
        <StatCard icon={<UserPlus size={24} />} label="Hires Needed" value={summary.totalHiresNeeded} />
      </div>

      {/* Scenario Controls */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target Utilization</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={scenarioSettings.targetUtilization}
                onChange={(e) => updateScenarioSettings({ targetUtilization: Number(e.target.value) })}
                className="w-32 accent-primary"
              />
              <span className="text-sm font-semibold text-slate-700 tabular-nums w-10">
                {scenarioSettings.targetUtilization}%
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Forecast Period</label>
            <div className="flex items-center gap-2">
              <select
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={scenarioSettings.forecastStartMonth}
                onChange={(e) => updateScenarioSettings({ forecastStartMonth: e.target.value as Month })}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-slate-400 text-sm">to</span>
              <select
                className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={scenarioSettings.forecastEndMonth}
                onChange={(e) => updateScenarioSettings({ forecastEndMonth: e.target.value as Month })}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex gap-3 text-xs text-slate-500">
            <span><span className="inline-block w-3 h-3 rounded bg-[#3b82f6] mr-1 align-middle" />Project</span>
            <span><span className="inline-block w-3 h-3 rounded bg-[#f59e0b] mr-1 align-middle" />Concierge</span>
            <span><span className="inline-block w-3 h-3 rounded bg-[#ef4444] mr-1 align-middle" />Pipeline</span>
            <span><span className="inline-block w-3 h-3 rounded bg-[#8b5cf6] mr-1 align-middle" />Staffing</span>
            <span><span className="inline-block w-3 h-3 rounded bg-[#10b981] mr-1 align-middle" />Capacity</span>
          </div>
        </div>
      </Card>

      {/* Demand vs Capacity Chart */}
      <Card title="Demand vs Capacity" className="mb-6">
        <DemandCapacityChart rows={gapRows} />
      </Card>

      {/* Pipeline Projects — full width */}
      <Card title="Pipeline Projects" className="mb-6">
        <p className="text-xs text-slate-400 mb-3">Add upcoming projects with start date, end date, and resource needs. Forecast updates automatically.</p>
        <PipelineProjectList
          projects={pipelineProjects}
          onAdd={addPipelineProject}
          onRemove={removePipelineProject}
        />
      </Card>

      {/* Two-column: Concierge + Staffing */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Concierge Demand (hrs/month)">
          <ConciergeConfigPanel config={conciergeConfig} onChange={setConciergeHours} />
        </Card>
        <Card title="Staffing Requests (Zoho / Manual)">
          <StaffingRequestList
            requests={staffingRequests}
            onAdd={addStaffingRequest}
            onRemove={removeStaffingRequest}
          />
        </Card>
      </div>

      {/* Hiring Summary Table */}
      <Card title="Hiring Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-600">Role</th>
                {activeMonths.map((m) => (
                  <th key={m} className="pb-3 text-center font-semibold text-slate-600">{m}</th>
                ))}
                <th className="pb-3 text-right font-semibold text-slate-600">Peak Hires</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_CATEGORIES.map((cat) => {
                const catRows = gapRows.filter((r) => r.roleCategory === cat);
                const peakHires = Math.max(0, ...catRows.map((r) => r.hiresNeeded));
                return (
                  <tr key={cat} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700 text-xs">{ROLE_CATEGORY_LABELS[cat]}</td>
                    {activeMonths.map((m) => {
                      const row = catRows.find((r) => r.month === m);
                      if (!row) return <td key={m} className="py-3 text-center text-slate-300">—</td>;
                      const hasGap = row.gap > 0;
                      return (
                        <td key={m} className="py-3 text-center">
                          <div className={`inline-flex flex-col items-center px-2 py-1 rounded ${hasGap ? 'bg-red-50' : 'bg-green-50'}`}>
                            <span className={`text-xs font-semibold tabular-nums ${hasGap ? 'text-red-700' : 'text-green-700'}`}>
                              {row.hiresNeeded > 0 ? `+${row.hiresNeeded}` : '0'}
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                              {Math.round(row.totalDemand)} / {Math.round(row.totalCapacity)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${peakHires > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {peakHires > 0 ? `Hire ${peakHires}` : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="pt-3 text-slate-700">Total</td>
                {activeMonths.map((m) => {
                  const monthRows = gapRows.filter((r) => r.month === m);
                  const totalHires = monthRows.reduce((s, r) => s + r.hiresNeeded, 0);
                  return (
                    <td key={m} className="pt-3 text-center">
                      <span className={`text-xs font-bold ${totalHires > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {totalHires > 0 ? `+${totalHires}` : '0'}
                      </span>
                    </td>
                  );
                })}
                <td className="pt-3 text-right">
                  <span className={`text-xs font-bold ${summary.totalHiresNeeded > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {summary.totalHiresNeeded > 0 ? `Hire ${summary.totalHiresNeeded}` : 'Fully Staffed'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}
