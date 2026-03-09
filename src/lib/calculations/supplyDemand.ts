import type { TeamMember, Project, SupplyDemandGap, Role, Seniority, Specialization } from '../../types';
import { addDays } from 'date-fns';

export function calculateSupplyDemandGaps(
  members: TeamMember[],
  projects: Project[],
  forecastDays = 90
): SupplyDemandGap[] {
  const windowEnd = addDays(new Date(), forecastDays);

  const supplyMap = new Map<string, number>();
  for (const m of members) {
    if (m.status === 'notice_period' || m.status === 'on_leave') continue;
    const isAvailable =
      m.status === 'bench' ||
      (m.status === 'rolling_off' && m.availableFrom && new Date(m.availableFrom) <= windowEnd);
    if (!isAvailable && m.status === 'deployed') continue;

    for (const spec of m.specializations) {
      const key = `${m.role}|${m.seniority}|${spec}`;
      supplyMap.set(key, (supplyMap.get(key) ?? 0) + 1);
    }
  }

  const demandMap = new Map<string, number>();
  for (const p of projects) {
    if (['completed', 'cancelled'].includes(p.status)) continue;
    if (p.startDate && new Date(p.startDate) > windowEnd) continue;

    for (const req of p.staffingRequirements) {
      const unfilled = req.count - req.filledCount;
      if (unfilled <= 0) continue;
      for (const spec of req.specializations) {
        const key = `${req.role}|${req.seniority}|${spec}`;
        demandMap.set(key, (demandMap.get(key) ?? 0) + unfilled);
      }
    }
  }

  const allKeys = new Set([...supplyMap.keys(), ...demandMap.keys()]);
  const gaps: SupplyDemandGap[] = [];

  for (const key of allKeys) {
    const [role, seniority, specialization] = key.split('|') as [Role, Seniority, Specialization];
    const supply = supplyMap.get(key) ?? 0;
    const demand = demandMap.get(key) ?? 0;
    gaps.push({ role, seniority, specialization, supply, demand, gap: demand - supply });
  }

  return gaps.sort((a, b) => b.gap - a.gap);
}
