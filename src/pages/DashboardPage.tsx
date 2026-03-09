import { useMemo, useEffect } from 'react';
import { Users, FolderKanban, UserPlus, TrendingUp, Flame, IndianRupee, Wallet } from 'lucide-react';
import { useTeamStore, useProjectStore, useCandidateStore, useFinancialStore } from '../store';
import { StatCard, Card } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { calculateUtilization } from '../lib/calculations/utilization';
import { calculateSupplyDemandGaps } from '../lib/calculations/supplyDemand';
import { calculateFinancialSnapshot, formatINR } from '../lib/calculations/financial';
import { ROLE_LABELS, SENIORITY_LABELS, SPECIALIZATION_LABELS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

export default function DashboardPage() {
  const { members } = useTeamStore();
  const { projects } = useProjectStore();
  const { candidates } = useCandidateStore();
  const { rateCards, hiringBudgets, initializeDefaultRateCards } = useFinancialStore();

  useEffect(() => { initializeDefaultRateCards(); }, []);

  const utilization = useMemo(
    () => calculateUtilization(members, new Date().toISOString().slice(0, 7)),
    [members]
  );

  const gaps = useMemo(
    () => calculateSupplyDemandGaps(members, projects),
    [members, projects]
  );

  const financials = useMemo(
    () => calculateFinancialSnapshot(members, projects, candidates, rateCards, hiringBudgets),
    [members, projects, candidates, rateCards, hiringBudgets]
  );

  const activeCandidates = candidates.filter(
    (c) => !['rejected', 'withdrawn', 'joined'].includes(c.currentStage)
  );

  const activeProjects = projects.filter((p) => ['active', 'confirmed'].includes(p.status));
  const totalUnfilled = projects.reduce(
    (sum, p) => sum + p.staffingRequirements.reduce((s, r) => s + (r.count - r.filledCount), 0), 0
  );

  const pieData = [
    { name: 'Deployed', value: utilization.deployedCount },
    { name: 'Bench', value: utilization.benchCount },
  ];

  const gapChartData = gaps.filter((g) => g.gap !== 0).slice(0, 8).map((g) => ({
    name: `${SPECIALIZATION_LABELS[g.specialization]}`,
    Supply: g.supply,
    Demand: g.demand,
  }));

  const benchMembers = members.filter((m) => m.status === 'bench');
  const rollingOff = members.filter((m) => m.status === 'rolling_off');

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Your team at a glance. No fluff." />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Team Size" value={members.length} icon={<Users size={20} />} />
        <StatCard
          label="Utilization"
          value={`${utilization.utilizationPercent}%`}
          subtitle={`${utilization.deployedCount} deployed, ${utilization.benchCount} bench`}
          icon={<TrendingUp size={20} />}
        />
        <StatCard label="Active Projects" value={activeProjects.length} subtitle={`${totalUnfilled} unfilled roles`} icon={<FolderKanban size={20} />} />
        <StatCard label="In Pipeline" value={activeCandidates.length} subtitle="active candidates" icon={<UserPlus size={20} />} />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Bench Burn" value={`₹${formatINR(financials.benchCostMonthly)}`} subtitle={`${financials.benchMemberCount} on bench`} icon={<Flame size={20} />} />
        <StatCard label="Revenue/Head" value={`₹${formatINR(financials.revenuePerHead)}`} subtitle="monthly" icon={<IndianRupee size={20} />} />
        <StatCard label="Margin" value={`${financials.overallMarginPercent}%`} subtitle={`₹${formatINR(financials.totalMonthlyRevenue)} revenue`} icon={<TrendingUp size={20} />} />
        <StatCard label="Hiring Budget" value={`₹${formatINR(financials.hiringBudgetRemaining)}`} subtitle={`of ₹${formatINR(financials.hiringBudgetAllocated)}`} icon={<Wallet size={20} />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Supply vs Demand">
          {gapChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Supply" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Demand" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              Add team members and projects to see supply vs demand.
            </div>
          )}
        </Card>

        <Card title="Team Utilization">
          {members.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              Add team members to see utilization.
            </div>
          )}
        </Card>
      </div>

      {/* Bench & Roll-off */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`On Bench (${benchMembers.length})`}>
          {benchMembers.length > 0 ? (
            <div className="space-y-2">
              {benchMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[m.role]} - {SENIORITY_LABELS[m.seniority]}</p>
                  </div>
                  <span className="text-xs text-slate-400">Since {m.benchSince || 'N/A'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No one on bench. Full deployment.</p>
          )}
        </Card>

        <Card title={`Rolling Off (${rollingOff.length})`}>
          {rollingOff.length > 0 ? (
            <div className="space-y-2">
              {rollingOff.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[m.role]}</p>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">{m.availableFrom || 'TBD'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No upcoming roll-offs.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
