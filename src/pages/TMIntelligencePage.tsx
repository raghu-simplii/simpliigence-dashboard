import { useMemo, useState } from 'react';
import { Radar, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTMStore } from '../store';
import { calculateConfidenceScores } from '../lib/calculations/confidence';
import { SPECIALIZATION_LABELS } from '../constants';
import type { ZohoPosition, Specialization } from '../types';
import { Button, Card, StatCard, EmptyState } from '../components/ui';
import { PageHeader } from '../components/shared/PageHeader';
import { nanoid } from 'nanoid';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function TMIntelligencePage() {
  const { positions, syncState, setPositions } = useTMStore();
  const [loading, setLoading] = useState(false);

  const metrics = useMemo(() => calculateConfidenceScores(positions), [positions]);

  const fillRateData = metrics.map((m) => ({
    name: SPECIALIZATION_LABELS[m.skill] || m.skill,
    fillRate: m.fillRatePercent,
  }));

  const timeToFillData = metrics.filter((m) => m.avgDaysToFill > 0).map((m) => ({
    name: SPECIALIZATION_LABELS[m.skill] || m.skill,
    days: m.avgDaysToFill,
  }));

  const loadSampleData = () => {
    setLoading(true);
    const skills: Specialization[] = ['apex', 'lwc', 'cpq', 'health_cloud', 'data_cloud', 'vlocity'];
    const samplePositions: ZohoPosition[] = [];

    for (let i = 0; i < 30; i++) {
      const skill = skills[Math.floor(Math.random() * skills.length)];
      const daysAgo = Math.floor(Math.random() * 90);
      const posted = new Date();
      posted.setDate(posted.getDate() - daysAgo);
      const isFilled = Math.random() > 0.35;
      const daysOpen = isFilled ? Math.floor(Math.random() * 45) + 5 : daysAgo;
      const filledDate = isFilled ? new Date(posted.getTime() + daysOpen * 86400000).toISOString() : null;

      samplePositions.push({
        zohoId: nanoid(),
        title: `${SPECIALIZATION_LABELS[skill]} Developer`,
        clientName: ['Acme Corp', 'Global Tech', 'FinServ Inc', 'HealthFirst'][Math.floor(Math.random() * 4)],
        skills: [skill],
        role: Math.random() > 0.3 ? 'salesforce_developer' : 'technical_lead',
        seniority: Math.random() > 0.5 ? 'senior' : 'principal',
        postedDate: posted.toISOString().split('T')[0],
        filledDate: filledDate ? filledDate.split('T')[0] : null,
        status: isFilled ? 'filled' : Math.random() > 0.2 ? 'open' : 'closed',
        daysOpen,
      });
    }

    setTimeout(() => {
      setPositions(samplePositions);
      setLoading(false);
    }, 800);
  };

  const confidenceColor = (label: string) => {
    if (label === 'high') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (label === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const trendIcon = (t: string) => t === 'rising' ? '\u2191' : t === 'declining' ? '\u2193' : '\u2192';

  return (
    <div>
      <PageHeader title="T&M Intel" subtitle="Demand patterns. Fill rates. Hire with confidence." />

      {/* Sync Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {syncState.isConnected ? (
            <Wifi size={18} className="text-emerald-500" />
          ) : (
            <WifiOff size={18} className="text-slate-400" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-700">
              Zoho Recruit {syncState.isConnected ? 'Connected' : 'Not Connected'}
            </p>
            {syncState.lastSyncAt && (
              <p className="text-xs text-slate-500">
                Last sync: {new Date(syncState.lastSyncAt).toLocaleString()} ({syncState.positionCount} positions)
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={loadSampleData} disabled={loading}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
            {loading ? 'Syncing...' : 'Load Sample Data'}
          </Button>
        </div>
      </div>

      {positions.length === 0 ? (
        <EmptyState
          icon={<Radar size={48} />}
          title="No T&M data yet"
          description="Connect Zoho Recruit or load sample data to see demand patterns."
          action={<Button onClick={loadSampleData}>Load Sample Data</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Positions" value={positions.length} subtitle="3-month window" />
            <StatCard label="Open Now" value={positions.filter((p) => p.status === 'open').length} />
            <StatCard
              label="Avg Fill Rate"
              value={`${metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.fillRatePercent, 0) / metrics.length) : 0}%`}
            />
          </div>

          {/* Confidence Cards */}
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Hire with Confidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {metrics.map((m) => (
              <div key={`${m.skill}-${m.role}`} className={`rounded-xl border p-4 ${confidenceColor(m.confidenceLabel)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{SPECIALIZATION_LABELS[m.skill]}</span>
                  <span className="text-2xl font-bold">{m.confidenceScore}</span>
                </div>
                <div className="text-xs space-y-1 opacity-80">
                  <div className="flex justify-between">
                    <span>Demand/mo</span>
                    <span className="font-medium">{m.demandFrequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fill Rate</span>
                    <span className="font-medium">{m.fillRatePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Days to Fill</span>
                    <span className="font-medium">{m.avgDaysToFill}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trend</span>
                    <span className="font-medium">{trendIcon(m.trend)} {m.trend}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open Now</span>
                    <span className="font-medium">{m.openNow}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Fill Rate by Skill">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fillRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="fillRate" fill="#10b981" radius={[4, 4, 0, 0]} name="Fill Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Avg Time to Fill (Days)">
              {timeToFillData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeToFillData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="days" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No fill data yet.</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
