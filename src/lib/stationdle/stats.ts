import { MAX_ATTEMPTS, STORAGE_KEY } from './config';
import { daysBetween } from '../game-logic';
import type { StationGuess, StationPlayerStats, StationSerializedGuess } from './types';

export function createDefaultStationdleStats(): StationPlayerStats {
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

export function loadStationdleStats(): StationPlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStationdleStats();
    return { ...createDefaultStationdleStats(), ...JSON.parse(raw) };
  } catch {
    return createDefaultStationdleStats();
  }
}

export function saveStationdleStats(stats: StationPlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('[Stationdle] Kon stats niet opslaan:', e);
  }
}

export function serializeStationGuess(guess: StationGuess): StationSerializedGuess {
  return {
    stationId: guess.station.id,
    stationName: guess.station.name,
    province: guess.station.province,
    distance: guess.distance,
    bearing: guess.bearing,
    arrow: guess.arrow,
    proximity: guess.proximity,
    isCorrect: guess.isCorrect,
  };
}

export function deserializeStationGuess(data: StationSerializedGuess): StationGuess | null {
  if (!data.stationId || !data.stationName) return null;
  return {
    station: {
      id: data.stationId,
      name: data.stationName,
      province: data.province,
    },
    distance: data.distance,
    bearing: data.bearing,
    arrow: data.arrow,
    proximity: data.proximity,
    isCorrect: data.isCorrect,
  };
}

export function recordStationdleResult(
  stats: StationPlayerStats,
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

  saveStationdleStats(stats);
  return true;
}

export function getStationdleWinRate(stats: StationPlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
