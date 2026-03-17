import { useState, useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card } from '../components/ui';
import { deriveProjectSummaries } from '../lib/parseSpreadsheet';
import { MONTHS } from '../types/forecast';
import { CHART_COLORS } from '../constants/brand';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ProjectPipelinePage() {
  const assignments = useForecastStore((s) => s.assignments);
  const projects = useMemo(() => deriveProjectSummaries(assignments), [assignments]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const monthlyByProject = useMemo(() =>
    MONTHS.map((m) => {
      const entry: Record<string, unknown> = { month: m };
      for (const p of projects) entry[p.name] = p.monthlyHours[m];
      return entry;
    }),
    [projects],
  );

  return (
    <>
      <PageHeader title="Projects" subtitle={`${projects.length} active projects`} icon={FolderKanban} />

      <Card title="Monthly Hours by Project" className="mb-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyByProject}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {projects.map((p, i) => (
              <Bar key={p.name} dataKey={p.name} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {projects.map((p) => (
          <Card key={p.name}>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === p.name ? null : p.name)}
            >
              <div>
                <h3 className="font-semibold text-slate-800 text-base">{p.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {p.employees.length} team members &middot; {p.totalHours.toLocaleString()} total hours
                  {p.estimatedRevenue > 0 && <> &middot; <span className="text-green-600">${p.estimatedRevenue.toLocaleString()} est. revenue</span></>}
                </p>
              </div>
              <div className="flex gap-2">
                {MONTHS.map((m) => (
                  <div key={m} className="text-center">
                    <div className="text-[10px] text-slate-400">{m}</div>
                    <div className={`text-xs font-semibold tabular-nums ${p.monthlyHours[m] > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                      {p.monthlyHours[m] > 0 ? p.monthlyHours[m] : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {expanded === p.name && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="pb-2 font-semibold text-slate-600">Employee</th>
                      <th className="pb-2 font-semibold text-slate-600">Role</th>
                      <th className="pb-2 font-semibold text-slate-600">Rate</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.employees.map((e) => (
                      <tr key={e.name} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-700">{e.name}</td>
                        <td className="py-2 text-slate-500 text-xs">{e.role || '—'}</td>
                        <td className="py-2 text-slate-500">{e.rateCard ? `$${e.rateCard}/hr` : '—'}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{e.totalHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
