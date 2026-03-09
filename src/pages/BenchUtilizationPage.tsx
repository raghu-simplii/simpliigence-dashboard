import { useMemo } from 'react';
import { useTeamStore } from '../store';
import { StatCard, Card } from '../components/ui';
import { StatusBadge, Badge } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { calculateUtilization } from '../lib/calculations/utilization';
import { ROLE_LABELS, SENIORITY_LABELS, SPECIALIZATION_LABELS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BenchUtilizationPage() {
  const { members } = useTeamStore();

  const utilization = useMemo(
    () => calculateUtilization(members, new Date().toISOString().slice(0, 7)),
    [members]
  );

  const benchMembers = members.filter((m) => m.status === 'bench');
  const rollingOff = members.filter((m) => m.status === 'rolling_off');

  const roleUtilData = Object.entries(utilization.byRole)
    .map(([role, pct]) => ({ name: ROLE_LABELS[role as keyof typeof ROLE_LABELS], value: pct }))
    .filter((d) => members.some((m) => m.role === Object.entries(ROLE_LABELS).find(([, v]) => v === d.name)?.[0]));

  const seniorityUtilData = Object.entries(utilization.bySeniority)
    .map(([sen, pct]) => ({ name: SENIORITY_LABELS[sen as keyof typeof SENIORITY_LABELS], value: pct }))
    .filter((d) => members.some((m) => m.seniority === Object.entries(SENIORITY_LABELS).find(([, v]) => v === d.name)?.[0]));

  return (
    <div>
      <PageHeader title="Bench & Utilization" subtitle="Who's available. Who's rolling off. No guesswork." />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="On Bench" value={benchMembers.length} subtitle="available now" />
        <StatCard label="Utilization" value={`${utilization.utilizationPercent}%`} subtitle={`${utilization.deployedCount} of ${utilization.totalMembers} deployed`} />
        <StatCard label="Rolling Off" value={rollingOff.length} subtitle="within 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Utilization by Role">
          {roleUtilData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roleUtilData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">Add team members to see data.</div>
          )}
        </Card>

        <Card title="Utilization by Seniority">
          {seniorityUtilData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={seniorityUtilData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">Add team members to see data.</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Bench Roster">
          {benchMembers.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-600">Name</th>
                    <th className="text-left py-2 font-medium text-slate-600">Role</th>
                    <th className="text-left py-2 font-medium text-slate-600">Skills</th>
                    <th className="text-left py-2 font-medium text-slate-600">Bench Since</th>
                  </tr>
                </thead>
                <tbody>
                  {benchMembers.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50">
                      <td className="py-2 font-medium text-slate-800">{m.name}</td>
                      <td className="py-2 text-slate-600">{ROLE_LABELS[m.role]}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {m.specializations.slice(0, 2).map((s) => (
                            <Badge key={s} variant="info">{SPECIALIZATION_LABELS[s]}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 text-slate-500">{m.benchSince || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No one on bench.</p>
          )}
        </Card>

        <Card title="Rolling Off Soon">
          {rollingOff.length > 0 ? (
            <div className="space-y-3">
              {rollingOff.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[m.role]} - {SENIORITY_LABELS[m.seniority]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-700">{m.availableFrom}</p>
                    <p className="text-xs text-slate-500">available date</p>
                  </div>
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
