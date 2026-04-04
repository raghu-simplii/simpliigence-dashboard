/**
 * AI-powered staffing analysis engine.
 * Scores closure probability based on status text sentiment,
 * pipeline stage detection, and update velocity.
 */
import type { RiskLevel, PipelineStage } from '../types/staffing';

interface AnalysisResult {
  score: number;
  risk: RiskLevel;
  stage: PipelineStage;
  velocity: number;
  signals: string[];
  recommendation: string;
}

export function analyzeStaffingStatus(
  statusText: string,
  anticipation: string,
): AnalysisResult {
  const s = (statusText + ' ' + anticipation).toLowerCase();
  let score = 50;
  const signals: string[] = [];

  // ── Positive signals ──
  if (s.includes('closed') || s.includes('select')) {
    score += 25;
    signals.push('+Closed/Selected');
  }
  if (s.includes('onboarding')) {
    score += 20;
    signals.push('+Onboarding');
  }
  if (s.includes('confirmation') || s.includes('sow')) {
    score += 15;
    signals.push('+Confirmed/SOW');
  }
  if (s.includes('shortlisted') || s.includes('cleared')) {
    score += 15;
    signals.push('+Shortlisted');
  }
  if (s.includes('interview scheduled') || s.includes('interviews scheduled')) {
    score += 10;
    signals.push('+Interview scheduled');
  }
  if (s.includes('targeting to close') || s.includes('targetting to close')) {
    score += 10;
    signals.push('+Targeting closure');
  }
  if (s.includes('verbal communication')) {
    score += 15;
    signals.push('+Verbal offer');
  }

  // ── Negative signals ──
  if (s.includes('no hopes') || s.includes('no hope')) {
    score -= 25;
    signals.push('-No hopes');
  }
  if (s.includes('reject') && !s.includes('select')) {
    score -= 20;
    signals.push('-Rejected');
  }
  if (s.includes('no news') || s.includes('no concrete')) {
    score -= 15;
    signals.push('-Stalled');
  }
  if (s.includes('on hold') || s.includes('pause')) {
    score -= 20;
    signals.push('-On hold');
  }
  if (s.includes('dropped out') || s.includes('no show')) {
    score -= 15;
    signals.push('-Dropout/No-show');
  }
  if (s.includes('position got closed')) {
    score -= 30;
    signals.push('-Position closed');
  }

  // ── Stage detection ──
  let stage: PipelineStage = 'Sourcing';
  if (s.includes('onboarding')) {
    stage = 'Onboarding';
  } else if (
    s.includes('closed') ||
    (s.includes('select') && s.includes('confirmation'))
  ) {
    stage = 'Closed/Selected';
  } else if (s.includes('client round') || s.includes('final round')) {
    stage = 'Client Round';
  } else if (s.includes('shortlisted') || s.includes('next round')) {
    stage = 'Shortlisted';
  } else if (
    s.includes('interview') ||
    s.includes('evaluation') ||
    s.includes('discussion')
  ) {
    stage = 'Interview';
  } else if (s.includes('shared') && s.includes('profile')) {
    stage = 'Profiles Shared';
  }

  // ── Velocity bonus ──
  const dateEntries = statusText.match(/\d{2}\/\d{2}/g) || [];
  const velocity = dateEntries.length;
  if (velocity >= 6) score += 5;
  if (velocity <= 1) score -= 5;

  score = Math.max(5, Math.min(95, score));

  const risk: RiskLevel =
    score >= 65 ? 'low' : score <= 35 ? 'high' : 'medium';

  // ── Recommendation ──
  let recommendation = 'Monitor progress';
  if (risk === 'high') {
    recommendation = 'Escalate — add more profiles & parallel source';
  } else if (stage === 'Sourcing') {
    recommendation = 'Accelerate sourcing — increase pipeline';
  } else if (stage === 'Client Round') {
    recommendation = 'Follow up with client for feedback';
  } else if (stage === 'Onboarding') {
    recommendation = 'Track onboarding timeline';
  }

  return { score, risk, stage, velocity, signals, recommendation };
}
