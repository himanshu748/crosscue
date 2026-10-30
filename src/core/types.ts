/** All times are integer minutes after the programme's advertised startTime. */
export interface Room { id: string; name: string }
export interface Session {
  id: string;
  title: string;
  kind: 'music' | 'film';
  entityType: 'artist' | 'movie';
  year?: number;
  durationMinutes: number;
  roomId: string;
  allowedStarts: number[];
  initialStart: number;
  locked: boolean;
}
export interface Programme {
  id: string;
  name: string;
  fictional: true;
  startTime: string;
  horizonMinutes: number;
  turnoverMinutes: number;
  rooms: Room[];
  sessions: Session[];
}
export interface Placement { sessionId: string; roomId: string; start: number }
export interface Pair { musicId: string; filmId: string }
export interface Objective {
  movedSessions: number;
  displacementMinutes: number;
  canonical: string;
}
export interface ScheduleChange {
  sessionId: string;
  title: string;
  from: Placement;
  to: Placement;
  displacementMinutes: number;
}
export interface SearchProof {
  method: 'exhaustive-finite-domain';
  domainSize: number;
  examined: number;
  feasibleCount: number;
}
export type SolveResult = ({
  feasible: true;
  placements: Placement[];
  objective: Objective;
  changes: ScheduleChange[];
} | {
  feasible: false;
  reason: 'invalid_input' | 'infeasible' | 'domain_limit';
  errors: string[];
}) & { proof: SearchProof };

export interface ValidationResult { valid: boolean; errors: string[] }
export interface Candidate { id: string; pair: Pair; evidence?: unknown }
export interface OrganizerDecision {
  pair: Pair;
  choice: 'protect' | 'allow' | 'defer';
}
export interface PairTest {
  pair: Pair;
  actionable: boolean;
  reason: 'different_feasible_schedules' | 'same_schedule' | 'protect_infeasible' | 'baseline_infeasible' | 'invalid_pair';
  allow: SolveResult;
  protect: SolveResult;
  differentSessionIds: string[];
}
export interface CandidateAssessment {
  candidate: Candidate;
  test?: PairTest;
  reason: PairTest['reason'] | 'already_decided' | 'duplicate_pair' | 'invalid_candidate';
}
export interface AnalysisResult {
  question: (Candidate & { test: PairTest }) | null;
  assessments: CandidateAssessment[];
  questionsRemaining: number;
  stopReason: 'question_ready' | 'question_budget_exhausted' | 'no_actionable_candidates';
  testedPairs: number;
}
