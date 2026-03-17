import { useMemo } from 'react';
import { Users, FolderKanban, Clock, DollarSign } from 'lucide-react';
import { useForecastStore } from '../store';
import { StatCard, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { deriveEmployeeSummaries, deriveProjectSummaries } from '../lib/parseSpreadsheet';
import { MONTHS } from '../types/forecast';
import { CHART_COLORS } from '../constants/brand';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7'];

export default function DashboardPage() {
  const assignments = useForecastStore((s) => s.assignments);

  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);
  const projects = useMemo(() => deriveProjectSummaries(assignments), [assignments]);

  const totalEmployees = employees.length;
  const totalProjects = projects.length;
  const totalHours = employees.reduce((s, e) => s + e.totalHours, 0);
  const totalRevenue = projects.reduce((s, p) => s + p.estimatedRevenue, 0);

  // Utilization: avg percentage based on 160 hrs/month capacity over 6 months (960 max)
  const avgUtilization = totalEmployees > 0
    ? Math.round(employees.reduce((s, e) => s + (e.totalHours / 960) * 100, 0) / totalEmployees)
    : 0;

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
      <PageHeader title="Command Center" subtitle="Resource forecasting overview — Jan to Jun 2026" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Team Size" value={totalEmployees} />
        <StatCard icon={FolderKanban} label="Active Projects" value={totalProjects} />
        <StatCard icon={Clock} label="Total Forecasted Hours" value={totalHours.toLocaleString()} />
        <StatCard icon={DollarSign} label="Est. Revenue (USD)" value={`$${Math.round(totalRevenue).toLocaleString()}`} />
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
              <Pie data={projectPie} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {projectPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} hrs`} />
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
