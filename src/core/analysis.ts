import { canonicalSchedule, pairKey, solveProgramme } from './solver';
import type { AnalysisResult, Candidate, OrganizerDecision, Pair, PairTest, Placement, Programme, SolveResult } from './types';

export function testPairProtection(programme: Programme, baseline: Placement[], protectedPairs: Pair[], pair: Pair): PairTest {
  const allow = solveProgramme(programme, baseline, protectedPairs);
  return compareWithAllow(programme, baseline, protectedPairs, pair, allow);
}

/** Every pair in an analysis has exactly the same ALLOW constraints and baseline. */
function compareWithAllow(programme: Programme, baseline: Placement[], protectedPairs: Pair[], pair: Pair, allow: SolveResult): PairTest {
  const alreadyProtected = protectedPairs.some(p => pairKey(p) === pairKey(pair));
  const protect = solveProgramme(programme, baseline, alreadyProtected ? protectedPairs : [...protectedPairs, pair]);
  const common = { pair: { ...pair }, allow, protect, actionable: false, differentSessionIds: [] as string[] };
  if (programme.sessions.find(s => s.id === pair.musicId)?.kind !== 'music' || programme.sessions.find(s => s.id === pair.filmId)?.kind !== 'film') return { ...common, reason: 'invalid_pair' };
  if (!allow.feasible) return { ...common, reason: 'baseline_infeasible' };
  if (!protect.feasible) return { ...common, reason: 'protect_infeasible' };
  if (canonicalSchedule(allow.placements) === canonicalSchedule(protect.placements)) return { ...common, reason: 'same_schedule' };
  const differentSessionIds = protect.placements.filter(p => {
    const alternative = allow.placements.find(a => a.sessionId === p.sessionId)!;
    return alternative.start !== p.start || alternative.roomId !== p.roomId;
  }).map(p => p.sessionId);
  return { ...common, actionable: true, reason: 'different_feasible_schedules', differentSessionIds };
}

export interface AnalysisInput {
  programme: Programme;
  baseline: Placement[];
  protectedPairs: Pair[];
  /** Already prioritized externally using observed Qloo rankings; never re-score affinity here. */
  candidates: Candidate[];
  decisions?: OrganizerDecision[];
  /** Counts questions presented in this run, including a subsequent Defer. */
  questionsAsked?: number;
}

/** Bounded deterministic consequence-testing tool. It does not mutate organizer state. */
export function analyzeCandidates(input: AnalysisInput): AnalysisResult {
  const { programme, baseline, protectedPairs, candidates, decisions = [] } = input;
  const questionsAsked = input.questionsAsked ?? decisions.length;
  if (!Number.isSafeInteger(questionsAsked) || questionsAsked < 0 || questionsAsked > 2) throw new Error('questionsAsked must be an integer from 0 to 2.');
  if (candidates.length > 16) throw new Error('An eight-session programme permits at most 16 music-film candidates.');
  const questionsRemaining = 2 - questionsAsked;
  if (questionsRemaining === 0) return { question: null, assessments: [], questionsRemaining, stopReason: 'question_budget_exhausted', testedPairs: 0 };
  const settled = new Set([...decisions.map(d => pairKey(d.pair)), ...protectedPairs.map(pairKey)]);
  const seen = new Set<string>();
  const assessments: AnalysisResult['assessments'] = [];
  let question: AnalysisResult['question'] = null, testedPairs = 0;
  let allow: SolveResult | undefined;
  for (const candidate of candidates) {
    const key = pairKey(candidate.pair);
    if (!candidate.id) { assessments.push({candidate,reason:'invalid_candidate'}); continue; }
    if (seen.has(key)) { assessments.push({candidate,reason:'duplicate_pair'}); continue; }
    seen.add(key);
    if (settled.has(key)) { assessments.push({candidate,reason:'already_decided'}); continue; }
    allow ??= solveProgramme(programme, baseline, protectedPairs);
    const test = compareWithAllow(programme, baseline, protectedPairs, candidate.pair, allow);
    testedPairs++;
    assessments.push({candidate,test,reason:test.reason});
    if (!question && test.actionable) question = {...candidate,test};
  }
  return { question, assessments, questionsRemaining, testedPairs, stopReason: question ? 'question_ready' : 'no_actionable_candidates' };
}
