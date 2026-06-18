import { MAX_ATTEMPTS } from '../config';

import { SNELWEGEN } from '../../data/snelwegen';

import { daysBetween } from '../game-logic';

import type { SnelwegGuess, SnelwegdlePlayerStats, SnelwegSerializedGuess } from './types';



export const SNELWEGDLE_STORAGE_KEY = 'snelwegdle_stats_v1';



export function createDefaultSnelwegdleStats(): SnelwegdlePlayerStats {

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



export function loadSnelwegdleStats(): SnelwegdlePlayerStats {

  try {

    const raw = localStorage.getItem(SNELWEGDLE_STORAGE_KEY);

    if (!raw) return createDefaultSnelwegdleStats();

    return { ...createDefaultSnelwegdleStats(), ...JSON.parse(raw) };

  } catch {

    return createDefaultSnelwegdleStats();

  }

}



export function saveSnelwegdleStats(stats: SnelwegdlePlayerStats): void {

  try {

    localStorage.setItem(SNELWEGDLE_STORAGE_KEY, JSON.stringify(stats));

  } catch (e) {

    console.warn('[Snelwegdle] Kon stats niet opslaan:', e);

  }

}



export function serializeSnelwegGuess(guess: SnelwegGuess): SnelwegSerializedGuess {

  return {

    snelwegId: guess.snelweg.id,

    distance: guess.distance,

    bearing: guess.bearing,

    arrow: guess.arrow,

    proximity: guess.proximity,

    isCorrect: guess.isCorrect,

  };

}



export function deserializeSnelwegGuess(data: SnelwegSerializedGuess): SnelwegGuess | null {

  const snelweg = SNELWEGEN.find((s) => s.id === data.snelwegId);

  if (!snelweg) return null;

  return { snelweg, ...data };

}



export function recordSnelwegdleResult(

  stats: SnelwegdlePlayerStats,

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



  saveSnelwegdleStats(stats);

  return true;

}



export function getSnelwegdleWinRate(stats: SnelwegdlePlayerStats): number {

  if (stats.gamesPlayed === 0) return 0;

  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);

}


