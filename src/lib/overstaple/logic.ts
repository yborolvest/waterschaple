import { findStationById, type Station } from '../../data/stations';
import { OVERSTAPLE_PUZZLES, STATION_NEIGHBORS } from '../../data/station-connections';
import { getDayIndex, getDayIndexFromKey, getYesterdayDateKey } from '../game-logic';
import { GUESS_BUFFER } from './config';
import { bfsDistances, findShortestPathIds, pathToIntermediate } from './pathfinding';
import type { GuessQuality } from './types';

export interface DailyPuzzle {
  start: Station;
  end: Station;
  /** Geordend pad incl. start en eind */
  path: string[];
  intermediate: string[];
  hops: number;
  maxGuesses: number;
}

function getPuzzleForDayIndex(dayIndex: number): DailyPuzzle | null {
  const len = OVERSTAPLE_PUZZLES.length;
  if (!len) return null;
  let idx = ((dayIndex % len) + len) % len;
  let def = OVERSTAPLE_PUZZLES[idx];
  for (let i = 0; i < len && !def; i++) {
    idx = (idx + 1) % len;
    def = OVERSTAPLE_PUZZLES[idx];
  }
  if (!def) return null;

  const start = findStationById(def.start);
  const end = findStationById(def.end);
  if (!start || !end) return null;

  const path =
    def.path?.length && def.path[0] === def.start && def.path[def.path.length - 1] === def.end
      ? def.path
      : (findShortestPathIds(def.start, def.end) ?? [def.start, def.end]);
  const intermediate = pathToIntermediate(path);

  return {
    start,
    end,
    path,
    intermediate: intermediate.length ? intermediate : def.intermediate,
    hops: path.length - 1,
    maxGuesses: (intermediate.length || def.intermediate.length) + GUESS_BUFFER,
  };
}

export function getOverstapleDailyPuzzle(date = new Date()): DailyPuzzle | null {
  return getPuzzleForDayIndex(getDayIndex(date));
}

export function getOverstapleDailyPuzzleFromKey(dateKey: string): DailyPuzzle | null {
  return getPuzzleForDayIndex(getDayIndexFromKey(dateKey));
}

export function getYesterdayOverstaplePuzzle(date = new Date()): DailyPuzzle | null {
  return getPuzzleForDayIndex(getDayIndexFromKey(getYesterdayDateKey(date)));
}

export function getOverstapleSolveCounterKey(puzzleNumber: number, dateKey: string): string {
  return `overstaple:solves:${puzzleNumber}:${dateKey}`;
}

function isReachableFromStart(
  startId: string,
  targetId: string,
  allowedIds: Set<string>,
): boolean {
  if (targetId === startId) return true;
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of STATION_NEIGHBORS[cur] ?? []) {
      if (visited.has(n)) continue;
      if (!allowedIds.has(n) && n !== targetId) continue;
      if (n === targetId) return true;
      visited.add(n);
      queue.push(n);
    }
  }
  return false;
}

export function evaluateOverstapleGuess(
  guessId: string,
  puzzle: DailyPuzzle,
  correctIds: string[],
  guessedIds: string[],
): { quality: GuessQuality; isDuplicate: boolean } {
  if (guessId === puzzle.start.id || guessId === puzzle.end.id) {
    return { quality: 'invalid', isDuplicate: false };
  }
  if (guessedIds.includes(guessId)) {
    return { quality: 'red', isDuplicate: true };
  }

  const intermediateSet = new Set(puzzle.intermediate);
  const fromStart = bfsDistances(puzzle.start.id);
  const fromEnd = bfsDistances(puzzle.end.id);
  const totalDist = fromStart.get(puzzle.end.id);
  if (totalDist === undefined) return { quality: 'red', isDuplicate: false };

  const ds = fromStart.get(guessId);
  const de = fromEnd.get(guessId);
  if (ds === undefined || de === undefined) return { quality: 'red', isDuplicate: false };

  const onShortest = intermediateSet.has(guessId);

  if (onShortest) {
    const allowed = new Set([puzzle.start.id, ...correctIds, guessId]);
    const connected = isReachableFromStart(puzzle.start.id, guessId, allowed);
    return { quality: connected ? 'connected' : 'green', isDuplicate: false };
  }

  if (ds + de === totalDist + 1) {
    return { quality: 'orange', isDuplicate: false };
  }

  return { quality: 'red', isDuplicate: false };
}

export function isOverstapleWin(correctIds: string[], puzzle: DailyPuzzle): boolean {
  const found = new Set(correctIds);
  return puzzle.intermediate.every((id) => found.has(id));
}

export function countRemaining(puzzle: DailyPuzzle, correctIds: string[]): number {
  const found = new Set(correctIds);
  return puzzle.intermediate.filter((id) => !found.has(id)).length;
}

export { findShortestPathIds } from './pathfinding';

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  role: 'start' | 'end' | 'solution' | 'guess';
  quality?: GuessQuality;
}

export interface MapSegment {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export interface OverstapleMapData {
  start: MapPoint;
  end: MapPoint;
  points: MapPoint[];
  segments: MapSegment[];
}

function toMapPoint(station: Station, role: MapPoint['role'], quality?: GuessQuality): MapPoint {
  return { id: station.id, name: station.name, lat: station.lat, lng: station.lng, role, quality };
}

export interface MapGuessInput {
  id: string;
  quality: GuessQuality;
}

/** Kaartdata zonder oplossing te lekken / EN: Map data without leaking unrevealed stops */
export function buildOverstapleMapData(
  puzzle: DailyPuzzle,
  correctIds: string[],
  guesses: MapGuessInput[],
  gameOver: boolean,
): OverstapleMapData {
  const path = puzzle.path.length >= 2 ? puzzle.path : [puzzle.start.id, puzzle.end.id];  const revealed = new Set([puzzle.start.id, puzzle.end.id, ...correctIds]);
  if (gameOver) {
    for (const id of path) revealed.add(id);
  }

  const segments: MapSegment[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = findStationById(path[i]);
    const b = findStationById(path[i + 1]);
    if (!a || !b) continue;
    if (!revealed.has(a.id) || !revealed.has(b.id)) continue;
    segments.push({
      from: { lat: a.lat, lng: a.lng },
      to: { lat: b.lat, lng: b.lng },
    });
  }

  const points: MapPoint[] = [];
  for (const g of guesses) {
    if (g.quality === 'invalid') continue;
    const s = findStationById(g.id);
    if (!s || s.id === puzzle.start.id || s.id === puzzle.end.id) continue;
    points.push(toMapPoint(s, 'guess', g.quality));
  }

  if (gameOver) {
    for (const id of puzzle.intermediate) {
      if (correctIds.includes(id)) continue;
      const s = findStationById(id);
      if (s) points.push(toMapPoint(s, 'solution'));
    }
  }

  return {
    start: toMapPoint(puzzle.start, 'start'),
    end: toMapPoint(puzzle.end, 'end'),
    points,
    segments,
  };
}

export function qualityToEmoji(quality: GuessQuality): string {
  switch (quality) {
    case 'connected':
      return '✅';
    case 'green':
      return '🟩';
    case 'orange':
      return '🟧';
    case 'red':
      return '🟥';
    default:
      return '⬜';
  }
}
