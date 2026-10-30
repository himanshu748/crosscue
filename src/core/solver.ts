import type { Objective, Pair, Placement, Programme, ScheduleChange, SearchProof, SolveResult } from './types';

const MAX_DOMAIN = 1_000_000;
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export const pairKey = (pair: Pair): string => `${pair.musicId}|${pair.filmId}`;
export const canonicalSchedule = (placements: Placement[]): string => [...placements]
  .sort((a, b) => compareText(a.sessionId, b.sessionId))
  .map(p => `${p.sessionId}:${p.roomId}:${String(p.start).padStart(6, '0')}`).join('|');

/** Moved count is per session, including room changes; displacement counts start minutes only. */
export function objectiveFor(placements: Placement[], baseline: Placement[]): Objective {
  const original = new Map(baseline.map(p => [p.sessionId, p]));
  let movedSessions = 0, displacementMinutes = 0;
  for (const placement of placements) {
    const before = original.get(placement.sessionId);
    if (!before) throw new Error(`Missing baseline session: ${placement.sessionId}`);
    if (placement.start !== before.start || placement.roomId !== before.roomId) movedSessions++;
    displacementMinutes += Math.abs(placement.start - before.start);
  }
  return { movedSessions, displacementMinutes, canonical: canonicalSchedule(placements) };
}

export function compareObjectives(a: Objective, b: Objective): number {
  return a.movedSessions - b.movedSessions || a.displacementMinutes - b.displacementMinutes || compareText(a.canonical, b.canonical);
}

/** Structural validation here is deliberately independent of validator.ts. */
function inputErrors(programme: Programme, baseline: Placement[], pairs: Pair[]): string[] {
  const errors: string[] = [];
  const sessions = new Map(programme.sessions.map(s => [s.id, s]));
  const rooms = new Set(programme.rooms.map(r => r.id));
  if (!programme.sessions.length || sessions.size !== programme.sessions.length) errors.push('Session IDs must be nonempty and unique.');
  if (!programme.rooms.length || rooms.size !== programme.rooms.length || programme.rooms.some(r=>!r.id)) errors.push('Room IDs must be nonempty and unique.');
  if (!Number.isSafeInteger(programme.horizonMinutes) || programme.horizonMinutes <= 0 || !Number.isSafeInteger(programme.turnoverMinutes) || programme.turnoverMinutes < 0) errors.push('Invalid programme horizon or turnover.');
  for (const s of programme.sessions) {
    if ((s.kind !== 'music' && s.kind !== 'film') || (s.kind === 'music' ? s.entityType !== 'artist' : s.entityType !== 'movie')) errors.push(`Invalid entity category for ${s.id}.`);
    if (!s.id || !rooms.has(s.roomId) || !Number.isSafeInteger(s.durationMinutes) || s.durationMinutes <= 0 || !s.allowedStarts.length || s.allowedStarts.some(t => !Number.isSafeInteger(t) || t < 0 || t + s.durationMinutes > programme.horizonMinutes) || new Set(s.allowedStarts).size !== s.allowedStarts.length) errors.push(`Invalid finite domain for ${s.id}.`);
  }
  const placements = new Map(baseline.map(p => [p.sessionId, p]));
  if (baseline.length !== programme.sessions.length || placements.size !== baseline.length || baseline.some(p => !sessions.has(p.sessionId))) errors.push('Baseline must assign every session exactly once.');
  for (const s of programme.sessions) {
    const p = placements.get(s.id);
    if (!p || p.roomId !== s.roomId || !s.allowedStarts.includes(p.start)) errors.push(`Baseline placement outside domain: ${s.id}.`);
  }
  for (const pair of pairs) {
    if (sessions.get(pair.musicId)?.kind !== 'music' || sessions.get(pair.filmId)?.kind !== 'film') errors.push(`Invalid music-film pair: ${pairKey(pair)}.`);
  }
  return errors;
}

export function scheduleChanges(programme: Programme, baseline: Placement[], placements: Placement[]): ScheduleChange[] {
  const before = new Map(baseline.map(p => [p.sessionId, p]));
  return [...placements].sort((a,b) => compareText(a.sessionId,b.sessionId)).flatMap(to => {
    const from = before.get(to.sessionId)!;
    return from.roomId === to.roomId && from.start === to.start ? [] : [{
      sessionId: to.sessionId,
      title: programme.sessions.find(s => s.id === to.sessionId)!.title,
      from: { ...from }, to: { ...to }, displacementMinutes: Math.abs(to.start - from.start),
    }];
  });
}

/**
 * Exhaustive optimization over the declared finite domains. No heuristic answer is
 * returned if the bound is exceeded. A locked session keeps its baseline position.
 */
export function solveProgramme(programme: Programme, baseline: Placement[], protectedPairs: Pair[] = []): SolveResult {
  const proof: SearchProof = { method: 'exhaustive-finite-domain', domainSize: 0, examined: 0, feasibleCount: 0 };
  const errors = inputErrors(programme, baseline, protectedPairs);
  if (errors.length) return { feasible: false, reason: 'invalid_input', errors, proof };
  const sessions = [...programme.sessions].sort((a,b) => compareText(a.id,b.id));
  const original = new Map(baseline.map(p => [p.sessionId,p]));
  const domains = sessions.map(s => s.locked ? [original.get(s.id)!.start] : [...s.allowedStarts].sort((a,b) => a-b));
  proof.domainSize = domains.reduce((size, domain) => size * domain.length, 1);
  if (!Number.isSafeInteger(proof.domainSize) || proof.domainSize > MAX_DOMAIN) return { feasible: false, reason: 'domain_limit', errors: [`Finite domain exceeds ${MAX_DOMAIN} assignments. No optimality claim made.`], proof };
  const index = new Map(sessions.map((s,i) => [s.id,i]));
  const pairIndices = protectedPairs.map(p => [index.get(p.musicId)!, index.get(p.filmId)!] as const);
  const starts = new Array<number>(sessions.length);
  let best: { placements: Placement[]; objective: Objective } | undefined;
  function visit(depth: number): void {
    if (depth < sessions.length) {
      for (const start of domains[depth]) { starts[depth] = start; visit(depth+1); }
      return;
    }
    proof.examined++;
    for (let a=0; a<sessions.length; a++) for (let b=a+1; b<sessions.length; b++) {
      if (sessions[a].roomId === sessions[b].roomId && !(starts[a]+sessions[a].durationMinutes+programme.turnoverMinutes <= starts[b] || starts[b]+sessions[b].durationMinutes+programme.turnoverMinutes <= starts[a])) return;
    }
    for (const [a,b] of pairIndices) {
      // Protection uses actual session intervals, not a cross-room turnover buffer.
      if (!(starts[a]+sessions[a].durationMinutes <= starts[b] || starts[b]+sessions[b].durationMinutes <= starts[a])) return;
    }
    proof.feasibleCount++;
    const placements = sessions.map((s,i) => ({sessionId:s.id, roomId:s.roomId, start:starts[i]}));
    const objective = objectiveFor(placements,baseline);
    if (!best || compareObjectives(objective,best.objective)<0) best = {placements,objective};
  }
  visit(0);
  if (!best) return { feasible: false, reason: 'infeasible', errors: ['No assignment satisfies the declared hard constraints.'], proof };
  return { feasible: true, placements: best.placements, objective: best.objective, changes: scheduleChanges(programme,baseline,best.placements), proof };
}
