import { STATIONS, type Station } from '../../data/stations';
import {
  evaluateGuess,
  getDayIndex,
  getDayIndexFromKey,
  getYesterdayDateKey,
  getDailyListIndex,
} from '../game-logic';

export function getStationDailyTarget(date = new Date()): Station {
  const dayIndex = getDayIndex(date);
  const index = getDailyListIndex(dayIndex, STATIONS.length, 'stationdle');
  return STATIONS[index];
}

export function getStationDailyTargetFromKey(dateKey: string): Station {
  const dayIndex = getDayIndexFromKey(dateKey);
  const index = getDailyListIndex(dayIndex, STATIONS.length, 'stationdle');
  return STATIONS[index];
}

export function getYesterdayStationTarget(date = new Date()): Station {
  return getStationDailyTargetFromKey(getYesterdayDateKey(date));
}

export function getStationSolveCounterKey(puzzleNumber: number, dateKey: string): string {
  return `stationdle:solves:${puzzleNumber}:${dateKey}`;
}

export function evaluateStationGuess(guess: Station, target: Station) {
  return evaluateGuess(
    { id: guess.id, name: guess.name, lat: guess.lat, lng: guess.lng, province: guess.province },
    { id: target.id, name: target.name, lat: target.lat, lng: target.lng, province: target.province },
  );
}
