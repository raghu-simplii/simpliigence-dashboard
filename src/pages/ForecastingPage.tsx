import { useState, useMemo } from 'react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card } from '../components/ui';
import { MONTHS } from '../types/forecast';
import type { Month } from '../types/forecast';
import { deriveEmployeeSummaries } from '../lib/parseSpreadsheet';

export default function ForecastingPage() {
  const assignments = useForecastStore((s) => s.assignments);
  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);

  const [monthFilter, setMonthFilter] = useState<Month | ''>('');
  const [projectFilter, setProjectFilter] = useState('');

  const allProjects = useMemo(() => [...new Set(assignments.map((a) => a.project))].sort(), [assignments]);

  // Build per-employee per-project monthly breakdown
  const detailRows = useMemo(() => {
    const rows: { employee: string; project: string; monthly: Record<Month, number> }[] = [];
    const grouped = new Map<string, Map<string, Record<Month, number>>>();

    for (const a of assignments) {
      if (projectFilter && a.project !== projectFilter) continue;
      const key = a.employeeName;
      if (!grouped.has(key)) grouped.set(key, new Map());
      const empMap = grouped.get(key)!;
      if (!empMap.has(a.project)) {
        empMap.set(a.project, { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 });
      }
      const m = empMap.get(a.project)!;
      for (const month of MONTHS) m[month] += a.monthlyTotals[month];
    }

    for (const [employee, projectMap] of grouped) {
      for (const [project, monthly] of projectMap) {
        const total = MONTHS.reduce((s, m) => s + monthly[m], 0);
        if (total > 0) rows.push({ employee, project, monthly });
      }
    }

    rows.sort((a, b) => a.employee.localeCompare(b.employee) || a.project.localeCompare(b.project));
    return rows;
  }, [assignments, projectFilter]);

  // Capacity utilization: how many employees are at >80%, 40-80%, <40% of 160hrs/month
  const utilizationByMonth = useMemo(() => {
    return MONTHS.map((m) => {
      let full = 0, partial = 0, low = 0;
      for (const e of employees) {
        const hrs = e.monthlyHours[m];
        if (hrs >= 128) full++; // 80% of 160
        else if (hrs >= 64) partial++; // 40%
        else if (hrs > 0) low++;
      }
      return { month: m, 'Fully Loaded (80%+)': full, 'Moderate (40-80%)': partial, 'Low (<40%)': low };
    });
  }, [employees]);

  const heatColor = (hrs: number): string => {
    if (hrs >= 160) return 'bg-green-600 text-white';
    if (hrs >= 120) return 'bg-green-400 text-white';
    if (hrs >= 80) return 'bg-green-200 text-green-900';
    if (hrs >= 40) return 'bg-amber-100 text-amber-800';
    if (hrs > 0) return 'bg-amber-50 text-amber-600';
    return 'bg-slate-50 text-slate-300';
  };

  return (
    <>
      <PageHeader title="Forecasting" subtitle="Monthly hours by employee and project" />

      {/* Utilization summary */}
      <Card title="Monthly Capacity Utilization" className="mb-6">
        <div className="grid grid-cols-6 gap-3">
          {utilizationByMonth.map((u) => (
            <div key={u.month} className="text-center">
              <div className="text-sm font-semibold text-slate-700 mb-2">{u.month}</div>
              <div className="space-y-1 text-xs">
                <div className="bg-green-50 text-green-700 rounded px-2 py-1">{u['Fully Loaded (80%+)']} fully loaded</div>
                <div className="bg-amber-50 text-amber-700 rounded px-2 py-1">{u['Moderate (40-80%)']} moderate</div>
                <div className="bg-red-50 text-red-700 rounded px-2 py-1">{u['Low (<40%)']} low/bench</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex gap-3">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value as Month | '')}>
            <option value="">All Months</option>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-4 h-3 rounded bg-green-600" /> 160+
            <span className="inline-block w-4 h-3 rounded bg-green-400" /> 120+
            <span className="inline-block w-4 h-3 rounded bg-green-200" /> 80+
            <span className="inline-block w-4 h-3 rounded bg-amber-100" /> 40+
            <span className="inline-block w-4 h-3 rounded bg-amber-50" /> &lt;40
          </div>
        </div>
      </Card>

      {/* Heatmap table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-600">Employee</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Project</th>
                {MONTHS.filter((m) => !monthFilter || m === monthFilter).map((m) => (
                  <th key={m} className="pb-3 font-semibold text-slate-600 text-center w-20">{m}</th>
                ))}
                <th className="pb-3 font-semibold text-slate-600 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, i) => {
                const filteredMonths = MONTHS.filter((m) => !monthFilter || m === monthFilter);
                const total = filteredMonths.reduce((s, m) => s + row.monthly[m], 0);
                if (monthFilter && total === 0) return null;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{row.employee}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{row.project}</td>
                    {filteredMonths.map((m) => (
                      <td key={m} className="py-2 text-center">
                        <span className={`inline-block w-14 px-1 py-0.5 rounded text-xs font-medium tabular-nums ${heatColor(row.monthly[m])}`}>
                          {row.monthly[m] > 0 ? row.monthly[m] : '—'}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold tabular-nums text-slate-700">{total > 0 ? total : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
