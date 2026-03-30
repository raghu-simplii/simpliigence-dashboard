import { useMemo, useState, useRef, useCallback } from 'react';
import { Users, FolderKanban, Clock, DollarSign, Search, Sparkles, X } from 'lucide-react';
import { useForecastStore } from '../store';
import { StatCard, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { deriveEmployeeSummaries, deriveProjectSummaries } from '../lib/parseSpreadsheet';
import { runQuery, SUGGESTED_QUERIES } from '../lib/queryEngine';
import type { QueryResult } from '../lib/queryEngine';
import { MONTHS } from '../types/forecast';
import type { ForecastAssignment } from '../types/forecast';
import { CHART_COLORS } from '../constants/brand';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7'];

/* ── Smart Query Panel ─────────────────────────────── */
function SmartQueryPanel({ assignments }: { assignments: ForecastAssignment[] }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((q?: string) => {
    const text = q ?? query;
    if (!text.trim()) return;
    setQuery(text);
    setResult(runQuery(text, assignments as any));
  }, [query, assignments]);

  const handleClear = () => {
    setQuery('');
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Smart Query</span>
          <span className="text-xs text-blue-500">Ask anything about your team, capacity, or projects</span>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Which BA has capacity in May?"
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {query && (
              <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ask
          </button>
        </form>

        {/* Suggested queries */}
        {!result && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTED_QUERIES.map((sq) => (
              <button
                key={sq}
                onClick={() => { setQuery(sq); handleSubmit(sq); }}
                className="text-xs px-3 py-1.5 bg-white border border-blue-200 rounded-full text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 bg-white rounded-lg border border-blue-100 p-4">
            <div className="prose prose-sm max-w-none text-slate-700 [&_strong]:text-slate-900">
              {result.answer.split('\n').map((line, i) => (
                <p key={i} className={`${line.startsWith('-') ? 'ml-2' : ''} ${!line.trim() ? 'hidden' : ''} my-1`}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={j}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>

            {/* Data table */}
            {result.data && result.columns && result.data.length > 0 && (
              <div className="mt-3 overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {result.columns.map((col) => (
                        <th key={col} className="py-2 px-3 text-left font-semibold text-slate-600 text-xs">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        {result.columns!.map((col) => (
                          <td key={col} className="py-1.5 px-3 text-slate-700 tabular-nums">{row[col] ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ask another */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Try also:</span>
              {SUGGESTED_QUERIES.filter((sq) => sq !== query).slice(0, 4).map((sq) => (
                <button
                  key={sq}
                  onClick={() => { setQuery(sq); handleSubmit(sq); }}
                  className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const assignments = useForecastStore((s) => s.assignments);

  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);
  const projects = useMemo(() => deriveProjectSummaries(assignments), [assignments]);

  const totalEmployees = employees.length;
  const totalProjects = projects.length;
  const totalHours = employees.reduce((s, e) => s + e.totalHours, 0);
  const totalCost = projects.reduce((s, p) => s + p.loadedCost, 0);

  // Monthly hours trend
  const monthlyTrend = useMemo(() =>
    MONTHS.map((m) => ({
      month: m,
      hours: employees.reduce((s, e) => s + e.monthlyHours[m], 0),
    })),
    [employees],
  );

  // Project allocation pie
  const projectPie = useMemo(() =>
    projects.map((p) => ({ name: p.name, value: p.totalHours })),
    [projects],
  );

  // Top employees by hours
  const topEmployees = useMemo(() =>
    employees.slice(0, 10).map((e) => ({
      name: e.name.split(' ')[0],
      q1: e.q1Hours,
      q2: e.q2Hours,
    })),
    [employees],
  );

  // Role distribution
  const roleDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of employees) {
      const role = e.role || 'Unspecified';
      map.set(role, (map.get(role) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);

  return (
    <>
      <PageHeader title="Command Center" subtitle={`Resource forecasting overview — ${MONTHS[0]} to ${MONTHS[MONTHS.length - 1]} ${new Date().getFullYear()}`} />

      <SmartQueryPanel assignments={assignments} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={24} />} label="Team Size" value={totalEmployees} />
        <StatCard icon={<FolderKanban size={24} />} label="Active Projects" value={totalProjects} />
        <StatCard icon={<Clock size={24} />} label="Total Forecasted Hours" value={totalHours.toLocaleString()} />
        <StatCard icon={<DollarSign size={24} />} label="Loaded Cost (USD)" value={`$${Math.round(totalCost).toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Monthly Hours Trend">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Hours by Project">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={projectPie} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {projectPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} hrs`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Top 10 Employees — Q1 vs Q2 Hours">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topEmployees} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="q1" fill="#3b82f6" name="Jan–Mar" radius={[0, 4, 4, 0]} />
              <Bar dataKey="q2" fill="#10b981" name="Apr–Jun" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Team by Role">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roleDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                {roleDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
