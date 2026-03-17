import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { useForecastStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, Badge } from '../components/ui';
import { deriveEmployeeSummaries } from '../lib/parseSpreadsheet';
import { MONTHS } from '../types/forecast';

export default function TeamRosterPage() {
  const assignments = useForecastStore((s) => s.assignments);
  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const roles = useMemo(() => [...new Set(employees.map((e) => e.role).filter(Boolean))].sort(), [employees]);
  const allProjects = useMemo(() => [...new Set(employees.flatMap((e) => e.projects))].sort(), [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter && e.role !== roleFilter) return false;
      if (projectFilter && !e.projects.includes(projectFilter)) return false;
      return true;
    });
  }, [employees, search, roleFilter, projectFilter]);

  const capacityColor = (hours: number) => {
    if (hours >= 800) return 'text-green-600 bg-green-50';
    if (hours >= 400) return 'text-blue-600 bg-blue-50';
    if (hours > 0) return 'text-amber-600 bg-amber-50';
    return 'text-slate-400 bg-slate-50';
  };

  return (
    <>
      <PageHeader title="Team Roster" subtitle={`${employees.length} team members across ${allProjects.length} projects`} icon={Users} />

      <Card>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-600">Name</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Role</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Rate ($/hr)</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Type</th>
                <th className="pb-3 pr-4 font-semibold text-slate-600">Projects</th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-3 pr-2 font-semibold text-slate-600 text-right w-16">{m}</th>
                ))}
                <th className="pb-3 font-semibold text-slate-600 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">{e.name}</td>
                  <td className="py-3 pr-4 text-slate-600 text-xs">{e.role || '—'}</td>
                  <td className="py-3 pr-4 text-slate-600">{e.rateCard ? `$${e.rateCard}` : '—'}</td>
                  <td className="py-3 pr-4">
                    {e.isContractor ? (
                      <Badge variant="warning">Contractor</Badge>
                    ) : e.isSI ? (
                      <Badge variant="info">SI</Badge>
                    ) : (
                      <Badge variant="neutral">—</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {e.projects.map((p) => (
                        <span key={p} className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </td>
                  {MONTHS.map((m) => (
                    <td key={m} className="py-3 pr-2 text-right tabular-nums">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${e.monthlyHours[m] > 0 ? (e.monthlyHours[m] >= 160 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700') : 'text-slate-300'}`}>
                        {e.monthlyHours[m] > 0 ? e.monthlyHours[m] : '—'}
                      </span>
                    </td>
                  ))}
                  <td className="py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${capacityColor(e.totalHours)}`}>
                      {e.totalHours.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
