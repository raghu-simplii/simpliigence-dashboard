import { useState, useMemo } from 'react';
import { useForecastStore, usePipelineStore } from '../store';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, Badge } from '../components/ui';
import { deriveProjectSummaries } from '../lib/parseSpreadsheet';
import { MONTHS } from '../types/forecast';
import type { ZohoPipelineProject, ZohoPhase } from '../types/forecast';
import { ChevronDown, ChevronRight, RefreshCw, Users, Calendar, Clock } from 'lucide-react';

/* ── Status badge helper ──────────────────────────────── */
function projectStatusVariant(status: string) {
  const s = status.toLowerCase();
  if (s.includes('progress') || s.includes('track')) return 'info' as const;
  if (s === 'active') return 'success' as const;
  if (s === 'delayed') return 'danger' as const;
  if (s.includes('complet')) return 'neutral' as const;
  return 'default' as const;
}

function phaseStatusVariant(phase: ZohoPhase) {
  if (phase.isClosed) return 'neutral' as const;
  if (phase.status === 'In Progress') return 'info' as const;
  // Active but in the future
  const today = new Date().toISOString().slice(0, 10);
  if (phase.startDate > today) return 'default' as const;
  return 'success' as const;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/* ── Phase timeline bar ──────────────────────────────── */
function PhaseTimeline({ phases, projectStart, projectEnd }: { phases: ZohoPhase[]; projectStart: string; projectEnd: string }) {
  const totalDays = Math.max(daysBetween(projectStart, projectEnd), 1);

  return (
    <div className="relative mt-3 mb-1">
      {/* date labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>{formatDate(projectStart)}</span>
        <span>{formatDate(projectEnd)}</span>
      </div>
      {/* track */}
      <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden">
        {phases.map((ph) => {
          const offsetDays = Math.max(daysBetween(projectStart, ph.startDate), 0);
          const durationDays = Math.max(daysBetween(ph.startDate, ph.endDate), 1);
          const left = (offsetDays / totalDays) * 100;
          const width = Math.max((durationDays / totalDays) * 100, 1);
          const bg = ph.isClosed
            ? 'bg-slate-300'
            : ph.status === 'In Progress'
              ? 'bg-blue-500'
              : 'bg-emerald-400';
          return (
            <div
              key={ph.id}
              title={`${ph.name}: ${formatDate(ph.startDate)} – ${formatDate(ph.endDate)} (${ph.status})`}
              className={`absolute top-0 h-full ${bg} border-r border-white/50`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* today marker */}
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          if (today >= projectStart && today <= projectEnd) {
            const pct = (daysBetween(projectStart, today) / totalDays) * 100;
            return <div className="absolute top-0 h-full w-0.5 bg-red-500 z-10" style={{ left: `${pct}%` }} />;
          }
          return null;
        })()}
      </div>
      {/* legend */}
      <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> In Progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Upcoming</span>
        <span className="flex items-center gap-1"><span className="w-0.5 h-2 bg-red-500 inline-block" /> Today</span>
      </div>
    </div>
  );
}

/* ── Project card ──────────────────────────────── */
function ZohoProjectCard({ project, teamAllocation }: {
  project: ZohoPipelineProject;
  teamAllocation: { name: string; role: string; totalHours: number; rateCard: number | null }[] | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const phases = useMemo(
    () => [...(project.phases ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [project.phases],
  );
  const completedPhases = phases.filter((p) => p.isClosed).length;
  const currentPhase = phases.find((p) => !p.isClosed);

  return (
    <Card>
      <div
        className="flex items-start justify-between cursor-pointer gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
            <h3 className="font-semibold text-slate-800 text-base">{project.name}</h3>
            <Badge variant={projectStatusVariant(project.status)}>{project.status}</Badge>
            {project.source === 'zoho' && <Badge variant="info">Zoho</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-1 ml-6 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><Users size={12} /> {project.owner}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
            {phases.length > 0 && (
              <span className="flex items-center gap-1"><Clock size={12} /> {completedPhases}/{phases.length} phases done</span>
            )}
            {currentPhase && (
              <span className="text-blue-600 font-medium">Current: {currentPhase.name}</span>
            )}
          </div>
        </div>
        {/* mini progress */}
        {phases.length > 0 && (
          <div className="shrink-0 w-24">
            <div className="text-[10px] text-slate-400 text-right mb-0.5">{Math.round((completedPhases / phases.length) * 100)}%</div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(completedPhases / phases.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
          {/* Phase timeline */}
          {phases.length > 0 && project.startDate && project.endDate && (
            <PhaseTimeline phases={phases} projectStart={project.startDate} projectEnd={project.endDate} />
          )}

          {/* Phase table */}
          {phases.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Phases</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-2 font-semibold text-slate-600">Phase</th>
                    <th className="pb-2 font-semibold text-slate-600">Start</th>
                    <th className="pb-2 font-semibold text-slate-600">End</th>
                    <th className="pb-2 font-semibold text-slate-600">Status</th>
                    <th className="pb-2 font-semibold text-slate-600">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((ph) => (
                    <tr key={ph.id} className={`border-b border-slate-50 ${ph.isClosed ? 'opacity-60' : ''}`}>
                      <td className="py-1.5 font-medium text-slate-700">{ph.name}</td>
                      <td className="py-1.5 text-slate-500 tabular-nums">{formatDate(ph.startDate)}</td>
                      <td className="py-1.5 text-slate-500 tabular-nums">{formatDate(ph.endDate)}</td>
                      <td className="py-1.5">
                        <Badge variant={phaseStatusVariant(ph)}>
                          {ph.isClosed ? 'Completed' : ph.status}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-slate-500 text-xs">{ph.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Team allocation from forecast store */}
          {teamAllocation && teamAllocation.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Team Allocation <span className="font-normal text-slate-400">(from Team tab)</span></h4>
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
                  {teamAllocation.map((e) => (
                    <tr key={e.name} className="border-b border-slate-50">
                      <td className="py-1.5 font-medium text-slate-700">{e.name}</td>
                      <td className="py-1.5 text-slate-500 text-xs">{e.role || '—'}</td>
                      <td className="py-1.5 text-slate-500">{e.rateCard ? `$${e.rateCard}/hr` : '—'}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{e.totalHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(!teamAllocation || teamAllocation.length === 0) && phases.length === 0 && (
            <p className="text-sm text-slate-400 italic">No phases or team allocations yet.</p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Main page ──────────────────────────────── */
export default function ProjectPipelinePage() {
  const assignments = useForecastStore((s) => s.assignments);
  const zohoProjects = usePipelineStore((s) => s.projects);
  const lastSync = usePipelineStore((s) => s.lastZohoSync);

  // Derive team allocation per project from forecast store
  const projectSummaries = useMemo(() => deriveProjectSummaries(assignments), [assignments]);
  const teamByProject = useMemo(() => {
    const map = new Map<string, typeof projectSummaries[0]>();
    for (const ps of projectSummaries) map.set(ps.name.toLowerCase(), ps);
    return map;
  }, [projectSummaries]);

  // Build a set of all forecast names that are claimed by a Zoho project
  // (via forecastName alias or exact name match)
  const claimedForecastNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of zohoProjects) {
      if (p.forecastName) set.add(p.forecastName.toLowerCase());
      set.add(p.name.toLowerCase());
    }
    return set;
  }, [zohoProjects]);

  const forecastOnlyProjects = useMemo(
    () => projectSummaries.filter((ps) => !claimedForecastNames.has(ps.name.toLowerCase())),
    [projectSummaries, claimedForecastNames],
  );

  // Stats
  const activeZoho = zohoProjects.filter((p) => !['Completed', 'On Hold'].includes(p.status)).length;
  const totalPhases = zohoProjects.reduce((sum, p) => sum + (p.phases?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${zohoProjects.length} Zoho projects · ${forecastOnlyProjects.length} forecast-only`}
        action={
          lastSync && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw size={12} />
              Last synced {new Date(lastSync).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-800">{zohoProjects.length}</div>
          <div className="text-xs text-slate-500">Zoho Projects</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{activeZoho}</div>
          <div className="text-xs text-slate-500">Active / In Progress</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">{totalPhases}</div>
          <div className="text-xs text-slate-500">Total Phases</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{forecastOnlyProjects.length}</div>
          <div className="text-xs text-slate-500">Forecast-Only Projects</div>
        </div>
      </div>

      {/* Zoho projects */}
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Zoho Projects</h2>
      <div className="grid grid-cols-1 gap-3 mb-8">
        {zohoProjects.map((project) => (
          <ZohoProjectCard
            key={project.id}
            project={project}
            teamAllocation={(teamByProject.get((project.forecastName ?? project.name).toLowerCase()) ?? teamByProject.get(project.name.toLowerCase()))?.employees}
          />
        ))}
      </div>

      {/* Forecast-only projects (from Team tab, not in Zoho) */}
      {forecastOnlyProjects.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Forecast-Only Projects <span className="text-sm font-normal text-slate-400">(from Team tab)</span></h2>
          <div className="grid grid-cols-1 gap-3">
            {forecastOnlyProjects.map((p) => (
              <Card key={p.name}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">{p.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {p.employees.length} team members · {p.totalHours.toLocaleString()} total hours
                      {p.estimatedRevenue > 0 && <> · <span className="text-green-600">${p.estimatedRevenue.toLocaleString()} est. revenue</span></>}
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
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
