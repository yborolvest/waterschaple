import { MAX_ATTEMPTS, STORAGE_KEY } from './config';
import { WATERSCHAPPEN } from '../data/waterschappen';
import { daysBetween } from './game-logic';
import type { Guess, PlayerStats, SerializedGuess } from './types';

export function createDefaultStats(): PlayerStats {
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

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStats();
    return { ...createDefaultStats(), ...JSON.parse(raw) };
  } catch {
    return createDefaultStats();
  }
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('[Waterschaple] Kon stats niet opslaan:', e);
  }
}

export function serializeGuess(guess: Guess): SerializedGuess {
  return {
    waterschapId: guess.waterschap.id,
    distance: guess.distance,
    bearing: guess.bearing,
    arrow: guess.arrow,
    proximity: guess.proximity,
    isCorrect: guess.isCorrect,
  };
}

export function deserializeGuess(data: SerializedGuess): Guess | null {
  const waterschap = WATERSCHAPPEN.find((w) => w.id === data.waterschapId);
  if (!waterschap) return null;
  return { waterschap, ...data };
}

export function recordGameResult(
  stats: PlayerStats,
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

  saveStats(stats);
  return true;
}

export function getWinRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
