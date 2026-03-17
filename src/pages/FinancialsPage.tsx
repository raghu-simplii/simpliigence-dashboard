import { useMemo } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useForecastStore, useFinancialStore } from '../store';
import { StatCard, Card, Badge } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { deriveEmployeeSummaries, deriveProjectSummaries } from '../lib/parseSpreadsheet';
import { MONTHS } from '../types/forecast';
import { CHART_COLORS } from '../constants/brand';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

export default function FinancialsPage() {
  const assignments = useForecastStore((s) => s.assignments);
  const exchangeRate = useFinancialStore((s) => s.settings.exchangeRate);
  const employees = useMemo(() => deriveEmployeeSummaries(assignments), [assignments]);
  const projects = useMemo(() => deriveProjectSummaries(assignments), [assignments]);

  const totalRevenue = projects.reduce((s, p) => s + p.estimatedRevenue, 0);
  const totalRevenueINR = totalRevenue * exchangeRate;

  // Revenue by month
  const monthlyRevenue = useMemo(() => {
    return MONTHS.map((m) => {
      let revenue = 0;
      for (const a of assignments) {
        if (a.rateCard && a.monthlyTotals[m] > 0) {
          revenue += a.monthlyTotals[m] * a.rateCard;
        }
      }
      return { month: m, revenue: Math.round(revenue), revenueINR: Math.round(revenue * exchangeRate) };
    });
  }, [assignments, exchangeRate]);

  // Revenue by project
  const projectRevenue = useMemo(() =>
    projects
      .filter((p) => p.estimatedRevenue > 0)
      .map((p) => ({
        name: p.name,
        revenue: Math.round(p.estimatedRevenue),
        hours: p.totalHours,
        headcount: p.employees.length,
        revenuePerHour: p.totalHours > 0 ? Math.round(p.estimatedRevenue / p.totalHours) : 0,
      })),
    [projects],
  );

  // Employee revenue contribution
  const employeeRevenue = useMemo(() => {
    const map = new Map<string, { name: string; role: string; hours: number; revenue: number; rate: number | null }>();
    for (const a of assignments) {
      const totalHrs = MONTHS.reduce((s, m) => s + a.monthlyTotals[m], 0);
      const rev = a.rateCard ? totalHrs * a.rateCard : 0;
      const existing = map.get(a.employeeName);
      if (existing) {
        existing.hours += totalHrs;
        existing.revenue += rev;
      } else {
        map.set(a.employeeName, { name: a.employeeName, role: a.role, hours: totalHrs, revenue: rev, rate: a.rateCard });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [assignments]);

  // Billable vs non-billable hours
  const billableHours = employees.filter((e) => e.rateCard).reduce((s, e) => s + e.totalHours, 0);
  const nonBillableHours = employees.filter((e) => !e.rateCard).reduce((s, e) => s + e.totalHours, 0);
  const totalHours = billableHours + nonBillableHours;
  const billablePercent = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  return (
    <>
      <PageHeader title="Financials" subtitle="Revenue estimates based on rate cards and forecasted hours" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<DollarSign size={24} />} label="Total Revenue (USD)" value={`$${totalRevenue.toLocaleString()}`} />
        <StatCard icon={<DollarSign size={24} />} label="Total Revenue (INR)" value={`₹${Math.round(totalRevenueINR).toLocaleString()}`} />
        <StatCard icon={<TrendingUp size={24} />} label="Billable %" value={`${billablePercent}%`} />
        <StatCard icon={<TrendingUp size={24} />} label="Avg Rev/Hr" value={totalHours > 0 ? `$${Math.round(totalRevenue / billableHours)}` : '—'} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Monthly Revenue (USD)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue by Project">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={projectRevenue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {projectRevenue.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Project financials table */}
      <Card title="Project Revenue Breakdown" className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-3 font-semibold text-slate-600">Project</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Headcount</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Total Hours</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Revenue (USD)</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Revenue (INR)</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Avg $/hr</th>
            </tr>
          </thead>
          <tbody>
            {projectRevenue.map((p) => (
              <tr key={p.name} className="border-b border-slate-100">
                <td className="py-2.5 font-medium text-slate-800">{p.name}</td>
                <td className="py-2.5 text-right tabular-nums">{p.headcount}</td>
                <td className="py-2.5 text-right tabular-nums">{p.hours.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold text-green-700">${p.revenue.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">₹{Math.round(p.revenue * exchangeRate).toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums">${p.revenuePerHour}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold">
              <td className="pt-3">Total</td>
              <td className="pt-3 text-right">{projectRevenue.reduce((s, p) => s + p.headcount, 0)}</td>
              <td className="pt-3 text-right">{projectRevenue.reduce((s, p) => s + p.hours, 0).toLocaleString()}</td>
              <td className="pt-3 text-right text-green-700">${totalRevenue.toLocaleString()}</td>
              <td className="pt-3 text-right text-slate-600">₹{Math.round(totalRevenueINR).toLocaleString()}</td>
              <td className="pt-3 text-right">{billableHours > 0 ? `$${Math.round(totalRevenue / billableHours)}` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Top revenue employees */}
      <Card title="Top Revenue Contributors">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-3 font-semibold text-slate-600">Employee</th>
              <th className="pb-3 font-semibold text-slate-600">Role</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Rate ($/hr)</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Hours</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">Revenue (USD)</th>
            </tr>
          </thead>
          <tbody>
            {employeeRevenue.map((e) => (
              <tr key={e.name} className="border-b border-slate-100">
                <td className="py-2.5 font-medium text-slate-800">{e.name}</td>
                <td className="py-2.5 text-slate-500 text-xs">{e.role || '—'}</td>
                <td className="py-2.5 text-right tabular-nums">{e.rate ? `$${e.rate}` : '—'}</td>
                <td className="py-2.5 text-right tabular-nums">{e.hours.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold">
                  {e.revenue > 0 ? (
                    <span className="text-green-700">${e.revenue.toLocaleString()}</span>
                  ) : (
                    <Badge variant="neutral">No rate</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
