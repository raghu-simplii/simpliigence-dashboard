import { useMemo, useEffect } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { useTeamStore, useProjectStore, useCandidateStore, useFinancialStore } from '../store';
import { StatCard, Card, Badge, EmptyState } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import {
  calculateFinancialSnapshot,
  calculateAllProjectFinancials,
  formatINR,
  inrToUsd,
} from '../lib/calculations/financial';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

export default function FinancialsPage() {
  const { members } = useTeamStore();
  const { projects } = useProjectStore();
  const { candidates } = useCandidateStore();
  const { rateCards, hiringBudgets, settings, initializeDefaultRateCards } = useFinancialStore();

  useEffect(() => { initializeDefaultRateCards(); }, []);

  const snapshot = useMemo(
    () => calculateFinancialSnapshot(members, projects, candidates, rateCards, hiringBudgets),
    [members, projects, candidates, rateCards, hiringBudgets]
  );

  const projectFinancials = useMemo(
    () => calculateAllProjectFinancials(projects, members, rateCards),
    [projects, members, rateCards]
  );

  const revCostData = [
    { name: 'Revenue', value: snapshot.totalMonthlyRevenue, fill: '#10b981' },
    { name: 'Cost', value: snapshot.totalMonthlyCost, fill: '#3b82f6' },
    { name: 'Bench Burn', value: snapshot.benchCostMonthly, fill: '#ef4444' },
  ];

  const budgetPieData = [
    { name: 'Spent', value: Math.max(0, snapshot.hiringBudgetSpent) },
    { name: 'Remaining', value: Math.max(0, snapshot.hiringBudgetRemaining) },
  ];

  const hasData = members.length > 0;
  const hasBudget = hiringBudgets.length > 0;

  return (
    <div>
      <PageHeader title="Salary Cap" subtitle="Budget. Burn. Margin. The money game." />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Monthly Revenue"
          value={`₹${formatINR(snapshot.totalMonthlyRevenue)}`}
          subtitle="from deployed team"
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Monthly Cost"
          value={`₹${formatINR(snapshot.totalMonthlyCost)}`}
          subtitle="all active members"
          icon={<TrendingDown size={20} />}
        />
        <StatCard
          label="Overall Margin"
          value={`${snapshot.overallMarginPercent}%`}
          subtitle={`₹${formatINR(snapshot.revenuePerHead)}/head`}
          icon={<IndianRupee size={20} />}
        />
        <StatCard
          label="Bench Burn"
          value={`₹${formatINR(snapshot.benchCostMonthly)}`}
          subtitle={`${snapshot.benchMemberCount} idle`}
          icon={<Flame size={20} />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Revenue vs Cost (Monthly)">
          {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${formatINR(v)}`} />
                <Tooltip formatter={(value) => [`₹${formatINR(value as number)}`, '']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revCostData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              Add team members to see revenue vs cost.
            </div>
          )}
        </Card>

        <Card title="Hiring Budget">
          {hasBudget ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ₹${formatINR(value)}`}
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip formatter={(value) => [`₹${formatINR(value as number)}`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              Set hiring budgets in Settings to track spend.
            </div>
          )}
        </Card>
      </div>

      {/* Project Margins Table */}
      <Card title="Project Margins">
        {projectFinancials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Project</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Team Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Margin</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Margin %</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Heads</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Months</th>
                </tr>
              </thead>
              <tbody>
                {projectFinancials.map((pf) => (
                  <tr key={pf.projectId} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{pf.projectName}</td>
                    <td className="px-4 py-3 text-slate-600">{pf.clientName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">₹{formatINR(pf.estimatedRevenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">₹{formatINR(pf.totalTeamCostOverDuration)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">₹{formatINR(pf.marginAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={pf.marginPercent >= 30 ? 'success' : pf.marginPercent >= 10 ? 'warning' : 'danger'}>
                        {pf.marginPercent}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{pf.headcount}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{pf.durationMonths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<IndianRupee size={48} />}
            title="No active projects"
            description="Add projects with contract values to see margin analysis."
          />
        )}
      </Card>

      {/* USD Equivalent */}
      {settings.exchangeRate > 0 && snapshot.totalMonthlyRevenue > 0 && (
        <p className="text-xs text-slate-400 mt-4 text-right">
          USD equivalent at ₹{settings.exchangeRate}/$ — Revenue: ${inrToUsd(snapshot.totalMonthlyRevenue, settings.exchangeRate).toLocaleString()}/mo | Cost: ${inrToUsd(snapshot.totalMonthlyCost, settings.exchangeRate).toLocaleString()}/mo
        </p>
      )}
    </div>
  );
}
