import { STORAGE_KEY } from './config';
import { daysBetween } from '../game-logic';
import type { OverstapleGuess, OverstaplePlayerStats, OverstapleSerializedGuess } from './types';

export function createDefaultOverstapleStats(): OverstaplePlayerStats {
  return {
    currentStreak: 0,
    maxStreak: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    guessDistribution: [],
    lastWinDate: null,
    lastPlayedDate: null,
    completedDates: [],
    globalWinReportedDates: [],
    history: [],
    todayGame: null,
  };
}

export function loadOverstapleStats(): OverstaplePlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultOverstapleStats();
    return { ...createDefaultOverstapleStats(), ...JSON.parse(raw) };
  } catch {
    return createDefaultOverstapleStats();
  }
}

export function saveOverstapleStats(stats: OverstaplePlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('[Overstaple] Kon stats niet opslaan:', e);
  }
}

export function serializeOverstapleGuess(guess: OverstapleGuess): OverstapleSerializedGuess {
  return {
    stationId: guess.station.id,
    stationName: guess.station.name,
    province: guess.station.province,
    quality: guess.quality,
  };
}

export function deserializeOverstapleGuess(data: OverstapleSerializedGuess): OverstapleGuess | null {
  if (!data.stationId || !data.stationName) return null;
  return {
    station: { id: data.stationId, name: data.stationName, province: data.province },
    quality: data.quality,
  };
}

export function recordOverstapleResult(
  stats: OverstaplePlayerStats,
  {
    won,
    guesses,
    puzzleNumber,
    dateKey,
    grid,
  }: {
    won: boolean;
    guesses: number;
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
    const bucket = guesses - 1;
    while (stats.guessDistribution.length <= bucket) stats.guessDistribution.push(0);
    stats.guessDistribution[bucket]++;
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
    guesses: won ? guesses : null,
    grid,
  });
  if (stats.history.length > 30) stats.history = stats.history.slice(0, 30);

  saveOverstapleStats(stats);
  return true;
}

export function getOverstapleWinRate(stats: OverstaplePlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
