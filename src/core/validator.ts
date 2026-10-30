import type { Pair, Placement, Programme, ValidationResult } from './types';

/**
 * Independent audit of a concrete schedule. It does not import the solver,
 * reuse the search predicate, or trust a solver's optimality claim.
 */
export function validateSchedule(programme: Programme, placements: Placement[], protectedPairs: Pair[] = [], baseline?: Placement[]): ValidationResult {
  const errors: string[] = [];
  const roomIds = programme.rooms.map(room => room.id);
  const sessionIds = programme.sessions.map(session => session.id);
  if (!sessionIds.length || new Set(sessionIds).size !== sessionIds.length || sessionIds.some(id => !id)) errors.push('Programme session IDs must be unique and nonempty.');
  if (!roomIds.length || new Set(roomIds).size !== roomIds.length || roomIds.some(id => !id)) errors.push('Programme room IDs must be unique and nonempty.');
  if (!Number.isSafeInteger(programme.horizonMinutes) || programme.horizonMinutes <= 0) errors.push('Programme horizon must be a positive integer.');
  if (!Number.isSafeInteger(programme.turnoverMinutes) || programme.turnoverMinutes < 0) errors.push('Programme turnover must be a nonnegative integer.');
  for (const session of programme.sessions) {
    if (!roomIds.includes(session.roomId)) errors.push(`Unknown room for ${session.id}.`);
    if (!Number.isSafeInteger(session.durationMinutes) || session.durationMinutes <= 0) errors.push(`Invalid duration for ${session.id}.`);
    if (!session.allowedStarts.length || new Set(session.allowedStarts).size !== session.allowedStarts.length || session.allowedStarts.some(start => !Number.isSafeInteger(start) || start < 0 || start + session.durationMinutes > programme.horizonMinutes)) errors.push(`Invalid placement domain for ${session.id}.`);
    if (session.kind !== 'music' && session.kind !== 'film') errors.push(`Invalid session kind for ${session.id}.`);
    if (session.entityType !== (session.kind === 'music' ? 'artist' : 'movie')) errors.push(`Entity category differs from session kind for ${session.id}.`);
  }
  if (placements.length !== programme.sessions.length) errors.push('Schedule must contain exactly one placement per session.');
  const seen = new Set<string>();
  for (const placement of placements) {
    if (seen.has(placement.sessionId)) errors.push(`Duplicate session assignment: ${placement.sessionId}.`);
    seen.add(placement.sessionId);
    const session = programme.sessions.find(s => s.id === placement.sessionId);
    if (!session) { errors.push(`Unknown session assignment: ${placement.sessionId}.`); continue; }
    if (placement.roomId !== session.roomId || !roomIds.includes(placement.roomId)) errors.push(`Room constraint failed for ${session.id}.`);
    if (!Number.isSafeInteger(placement.start) || !session.allowedStarts.includes(placement.start)) errors.push(`Start outside finite domain for ${session.id}.`);
    if (placement.start < 0 || placement.start + session.durationMinutes > programme.horizonMinutes) errors.push(`Horizon constraint failed for ${session.id}.`);
    if (session.locked) {
      const original = baseline?.find(p => p.sessionId === session.id);
      const lockedStart = original?.start ?? session.initialStart;
      const lockedRoom = original?.roomId ?? session.roomId;
      if (placement.start !== lockedStart || placement.roomId !== lockedRoom) errors.push(`Locked session moved: ${session.id}.`);
    }
  }
  for (const session of programme.sessions) if (!seen.has(session.id)) errors.push(`Missing session assignment: ${session.id}.`);
  if (baseline && (baseline.length !== sessionIds.length || new Set(baseline.map(p => p.sessionId)).size !== sessionIds.length || baseline.some(p => !sessionIds.includes(p.sessionId)))) errors.push('Lock baseline must contain every session exactly once.');

  // Sort each room chronologically, then audit adjacent occupied intervals.
  for (const room of programme.rooms) {
    const occupants = placements.filter(p => p.roomId === room.id && sessionIds.includes(p.sessionId)).sort((a,b) => a.start-b.start);
    for (let i=1; i<occupants.length; i++) {
      const previous = occupants[i-1], current = occupants[i];
      const duration = programme.sessions.find(s => s.id === previous.sessionId)!.durationMinutes;
      if (current.start - (previous.start + duration) < programme.turnoverMinutes) errors.push(`Room overlap or turnover violation: ${previous.sessionId} / ${current.sessionId}.`);
    }
  }
  for (const pair of protectedPairs) {
    const music = programme.sessions.find(s => s.id === pair.musicId);
    const film = programme.sessions.find(s => s.id === pair.filmId);
    if (music?.kind !== 'music' || film?.kind !== 'film') { errors.push(`Invalid protected music-film pair: ${pair.musicId} / ${pair.filmId}.`); continue; }
    const musicPlacement = placements.find(p => p.sessionId === music.id);
    const filmPlacement = placements.find(p => p.sessionId === film.id);
    if (!musicPlacement || !filmPlacement) continue; // Missing assignments already reported.
    const sharedStart = Math.max(musicPlacement.start, filmPlacement.start);
    const sharedEnd = Math.min(musicPlacement.start+music.durationMinutes, filmPlacement.start+film.durationMinutes);
    if (sharedStart < sharedEnd) errors.push(`Protected sessions overlap: ${music.id} / ${film.id}.`);
  }
  return { valid: errors.length === 0, errors };
}
