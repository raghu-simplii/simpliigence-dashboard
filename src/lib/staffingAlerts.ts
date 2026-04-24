/**
 * Staffing alerts — derived signals for India Staffing reqs.
 *
 * The audit log (StaffingHistoryEntry[]) already captures every stage change,
 * so "days in current stage" is (today - changed_at of the most recent stage
 * change for this req, or fallback to req.created_at if the req has never
 * moved stages).
 */
import type { PipelineStage, StaffingHistoryEntry, StaffingRequisition } from '../types/staffing';

/** How long a requisition can sit in a stage before it's flagged as stuck. */
export const STUCK_DAYS_BY_STAGE: Record<PipelineStage, number> = {
  Sourcing: 7,
  'Profiles Shared': 7,
  Interview: 10,
  Shortlisted: 10,
  'Client Round': 14,
  'Closed/Selected': 14,   // once selected, onboarding shouldn't take >2 weeks
  Onboarding: 21,
};

export interface StageTimingInfo {
  /** ISO date the req entered its current stage (or created_at as fallback) */
  enteredAt: string;
  /** Full days since entering the current stage */
  daysInStage: number;
  /** True when daysInStage has exceeded STUCK_DAYS_BY_STAGE for the current stage */
  isStuck: boolean;
  /** The configured threshold for this stage — useful for tooltips */
  stuckThreshold: number;
}

/** Compute how long a req has been in its current stage, using the audit log. */
export function computeStageTiming(
  req: StaffingRequisition,
  history: StaffingHistoryEntry[],
): StageTimingInfo {
  // Most recent audit entry that actually changed the `stage` field for this req
  const stageChanges = history
    .filter((h) => h.requisition_id === req.id && h.field === 'stage' && h.new_value === req.stage)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at));

  const enteredAt = stageChanges[0]?.changed_at || req.created_at;
  const entered = Date.parse(enteredAt);
  const now = Date.now();
  const daysInStage = Number.isFinite(entered)
    ? Math.max(0, Math.floor((now - entered) / 86_400_000))
    : 0;
  const threshold = STUCK_DAYS_BY_STAGE[req.stage] ?? 14;

  return {
    enteredAt,
    daysInStage,
    isStuck: daysInStage >= threshold,
    stuckThreshold: threshold,
  };
}
