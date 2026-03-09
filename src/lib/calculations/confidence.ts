import type { ZohoPosition, SkillDemandMetric, Specialization, Role } from '../../types';

export function calculateConfidenceScores(
  positions: ZohoPosition[],
  windowMonths = 3
): SkillDemandMetric[] {
  const groups = new Map<string, ZohoPosition[]>();
  for (const p of positions) {
    const skill = p.skills[0];
    if (!skill) continue;
    const key = `${skill}|${p.role}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const metrics: SkillDemandMetric[] = [];

  for (const [key, gp] of groups) {
    const [skill, role] = key.split('|') as [Specialization, Role];
    const total = gp.length;
    const filled = gp.filter((p) => p.status === 'filled').length;
    const open = gp.filter((p) => p.status === 'open').length;
    const fillRate = total > 0 ? (filled / total) * 100 : 0;
    const demandFrequency = total / windowMonths;

    const filledPositions = gp.filter((p) => p.filledDate);
    const avgDaysToFill =
      filledPositions.length > 0
        ? filledPositions.reduce((sum, p) => sum + p.daysOpen, 0) / filledPositions.length
        : 0;

    const midpoint = new Date();
    midpoint.setMonth(midpoint.getMonth() - Math.floor(windowMonths / 2));
    const firstHalf = gp.filter((p) => new Date(p.postedDate) < midpoint).length;
    const secondHalf = gp.filter((p) => new Date(p.postedDate) >= midpoint).length;
    const trendRatio = firstHalf > 0 ? secondHalf / firstHalf : secondHalf > 0 ? 2 : 1;
    const trend: 'rising' | 'stable' | 'declining' =
      trendRatio > 1.3 ? 'rising' : trendRatio < 0.7 ? 'declining' : 'stable';

    const freqScore = Math.min(demandFrequency / 3, 1) * 100;
    const fillScore = fillRate;
    const trendScore = trend === 'rising' ? 100 : trend === 'stable' ? 50 : 10;
    const speedScore = avgDaysToFill > 0 ? Math.max(0, 100 - (avgDaysToFill - 10) * 2) : 0;
    const openScore = Math.min(open / 2, 1) * 100;

    const confidence =
      freqScore * 0.3 + fillScore * 0.25 + trendScore * 0.2 + speedScore * 0.15 + openScore * 0.1;

    metrics.push({
      skill,
      role,
      totalPositions: total,
      filledPositions: filled,
      fillRatePercent: Math.round(fillRate * 10) / 10,
      avgDaysToFill: Math.round(avgDaysToFill),
      demandFrequency: Math.round(demandFrequency * 10) / 10,
      openNow: open,
      confidenceScore: Math.round(confidence),
      confidenceLabel: confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low',
      trend,
    });
  }

  return metrics.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
