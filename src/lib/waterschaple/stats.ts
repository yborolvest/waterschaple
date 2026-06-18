import { MAX_ATTEMPTS } from '../config';
import { WATERSCHAPPEN } from '../../data/waterschappen';
import { daysBetween } from '../game-logic';
import type {
  WaterschapGuess,
  WaterschapPlayerStats,
  WaterschapSerializedGuess,
} from './types';

export const WATERSCHAPLE_STORAGE_KEY = 'waterschaple_stats_v1';

export function createDefaultWaterschapleStats(): WaterschapPlayerStats {
  return {
    currentStreak: 0,
    maxStreak: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastWinDate: null,
    lastPlayedDate: null,
    completedDates: [],
    globalWinReportedDates: [],
    history: [],
    todayGame: null,
  };
}

export function loadWaterschapleStats(): WaterschapPlayerStats {
  try {
    const raw = localStorage.getItem(WATERSCHAPLE_STORAGE_KEY);
    if (!raw) return createDefaultWaterschapleStats();
    return { ...createDefaultWaterschapleStats(), ...JSON.parse(raw) };
  } catch {
    return createDefaultWaterschapleStats();
  }
}

export function saveWaterschapleStats(stats: WaterschapPlayerStats): void {
  try {
    localStorage.setItem(WATERSCHAPLE_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('[Waterschaple] Kon stats niet opslaan:', e);
  }
}

export function serializeWaterschapGuess(guess: WaterschapGuess): WaterschapSerializedGuess {
  return {
    waterschapId: guess.waterschap.id,
    distance: guess.distance,
    bearing: guess.bearing,
    arrow: guess.arrow,
    proximity: guess.proximity,
    isCorrect: guess.isCorrect,
  };
}

export function deserializeWaterschapGuess(data: WaterschapSerializedGuess): WaterschapGuess | null {
  const waterschap = WATERSCHAPPEN.find((w) => w.id === data.waterschapId);
  if (!waterschap) return null;
  return { waterschap, ...data };
}

export function recordWaterschapleResult(
  stats: WaterschapPlayerStats,
  {
    won,
    attempts,
    puzzleNumber,
    dateKey,
    grid,
  }: {
    won: boolean;
    attempts: number;
    puzzleNumber: number;
    dateKey: string;
    grid: string;
  },
): boolean {
  if (stats.completedDates.includes(dateKey)) return false;

  stats.gamesPlayed++;
  stats.lastPlayedDate = dateKey;
  stats.completedDates.push(dateKey);

  if (won) {
    stats.gamesWon++;
    stats.guessDistribution[Math.min(attempts, MAX_ATTEMPTS) - 1]++;
    if (stats.lastWinDate && daysBetween(stats.lastWinDate, dateKey) === 1) {
      stats.currentStreak++;
    } else if (stats.lastWinDate !== dateKey) {
      stats.currentStreak = 1;
    }
    stats.lastWinDate = dateKey;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  stats.history.unshift({
    puzzleNumber,
    date: dateKey,
    won,
    attempts: won ? attempts : null,
    grid,
  });
  if (stats.history.length > 30) stats.history = stats.history.slice(0, 30);

  saveWaterschapleStats(stats);
  return true;
}

export function getWaterschapleWinRate(stats: WaterschapPlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
