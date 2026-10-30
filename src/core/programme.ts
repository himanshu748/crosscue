import type { Placement, Programme } from './types';

/** Scheduling data is fictional. Entity names are lookup inputs, not resolved evidence. */
export const PROGRAMME: Programme = {
  id: 'crosscue-fieldnotes-2026',
  name: 'Fieldnotes Festival',
  fictional: true,
  startTime: '14:00',
  horizonMinutes: 660,
  turnoverMinutes: 15,
  rooms: [{ id: 'stage', name: 'The Stage' }, { id: 'screen', name: 'The Screen' }],
  sessions: [
    { id: 'radiohead', title: 'Radiohead', kind: 'music', entityType: 'artist', durationMinutes: 60, roomId: 'stage', initialStart: 30, allowedStarts: [30, 120], locked: false },
    { id: 'bjork', title: 'Björk', kind: 'music', entityType: 'artist', durationMinutes: 60, roomId: 'stage', initialStart: 180, allowedStarts: [180, 270], locked: false },
    { id: 'kendrick', title: 'Kendrick Lamar', kind: 'music', entityType: 'artist', durationMinutes: 60, roomId: 'stage', initialStart: 330, allowedStarts: [330, 420], locked: false },
    { id: 'daft-punk', title: 'Daft Punk', kind: 'music', entityType: 'artist', durationMinutes: 60, roomId: 'stage', initialStart: 480, allowedStarts: [480, 570], locked: false },
    { id: 'spirited-away', title: 'Spirited Away', kind: 'film', entityType: 'movie', year: 2001, durationMinutes: 135, roomId: 'screen', initialStart: 0, allowedStarts: [0, 15], locked: false },
    { id: 'moonlight', title: 'Moonlight', kind: 'film', entityType: 'movie', year: 2016, durationMinutes: 120, roomId: 'screen', initialStart: 150, allowedStarts: [150, 165], locked: false },
    { id: 'whiplash', title: 'Whiplash', kind: 'film', entityType: 'movie', year: 2014, durationMinutes: 120, roomId: 'screen', initialStart: 300, allowedStarts: [300, 315], locked: false },
    { id: 'blade-runner', title: 'Blade Runner', kind: 'film', entityType: 'movie', year: 1982, durationMinutes: 120, roomId: 'screen', initialStart: 450, allowedStarts: [450, 465], locked: false },
  ],
};

export const INITIAL_PLACEMENTS: Placement[] = PROGRAMME.sessions.map(session => ({
  sessionId: session.id, roomId: session.roomId, start: session.initialStart,
}));

export function cloneProgramme(): Programme { return structuredClone(PROGRAMME); }
export function initialPlacements(programme: Programme = PROGRAMME): Placement[] {
  return programme.sessions.map(session => ({ sessionId: session.id, roomId: session.roomId, start: session.initialStart }));
}

export function formatTime(minutes: number, startTime = PROGRAMME.startTime): string {
  const [hour, minute] = startTime.split(':').map(Number);
  const absolute = hour * 60 + minute + minutes;
  return `${String(Math.floor(absolute / 60) % 24).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}${absolute >= 1440 ? ' +1' : ''}`;
}
