import { MAX_DISTANCE_KM, EPOCH_DATE, GAME_TIMEZONE } from './config';
import { GEMEENTEN, type Gemeente } from '../data/gemeenten';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const EPOCH_UTC = Date.UTC(
  EPOCH_DATE.getFullYear(),
  EPOCH_DATE.getMonth(),
  EPOCH_DATE.getDate(),
);

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** YYYY-MM-DD in game timezone (Amsterdam) */
export function getDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: GAME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getDayIndex(date = new Date()): number {
  const [y, m, d] = getDateKey(date).split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH_UTC) / MS_PER_DAY);
}

export function getDayIndexFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH_UTC) / MS_PER_DAY);
}

/** Haversine-afstand in km */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Richting van A naar B in graden (0 = noord) */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Windrichting als emoji-pijl */
export function bearingToArrow(bearing: number): string {
  const arrows = [
    { min: 337.5, max: 360, emoji: '⬆️' },
    { min: 0, max: 22.5, emoji: '⬆️' },
    { min: 22.5, max: 67.5, emoji: '↗️' },
    { min: 67.5, max: 112.5, emoji: '➡️' },
    { min: 112.5, max: 157.5, emoji: '↘️' },
    { min: 157.5, max: 202.5, emoji: '⬇️' },
    { min: 202.5, max: 247.5, emoji: '↙️' },
    { min: 247.5, max: 292.5, emoji: '⬅️' },
    { min: 292.5, max: 337.5, emoji: '↖️' },
  ];
  for (const { min, max, emoji } of arrows) {
    if (bearing >= min && bearing < max) return emoji;
  }
  return '⬆️';
}

/** Nabijheidsscore 0–100% */
export function distanceToProximity(distanceKm: number): number {
  if (distanceKm <= 0) return 100;
  const score = Math.round((1 - distanceKm / MAX_DISTANCE_KM) * 100);
  return Math.max(0, Math.min(100, score));
}

/** Doelgemeente voor een datum — alleen server-side gebruiken */
export function getDailyTarget(date = new Date()): Gemeente {
  const dayIndex = getDayIndex(date);
  const index = ((dayIndex % GEMEENTEN.length) + GEMEENTEN.length) % GEMEENTEN.length;
  return GEMEENTEN[index];
}

export function getDailyTargetFromKey(dateKey: string): Gemeente {
  const dayIndex = getDayIndexFromKey(dateKey);
  const index = ((dayIndex % GEMEENTEN.length) + GEMEENTEN.length) % GEMEENTEN.length;
  return GEMEENTEN[index];
}

export function getPuzzleNumber(date = new Date()): number {
  return getDayIndex(date) + 1;
}

export function getPuzzleNumberFromKey(dateKey: string): number {
  return getDayIndexFromKey(dateKey) + 1;
}

export function getYesterdayDateKey(date = new Date()): string {
  return getDateKeyAfterDays(date, -1);
}

/** NL: Datum-sleutel N dagen na/voor referentiedatum / EN: Date key offset by N days */
export function getDateKeyAfterDays(date: Date, days: number): string {
  const dayIndex = getDayIndex(date) + days;
  const utc = EPOCH_UTC + dayIndex * MS_PER_DAY;
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getYesterdayTarget(date = new Date()): Gemeente {
  return getDailyTargetFromKey(getYesterdayDateKey(date));
}

export function daysBetween(dateKey1: string, dateKey2: string): number {
  return getDayIndexFromKey(dateKey2) - getDayIndexFromKey(dateKey1);
}

export function proximityToShareEmoji(proximity: number, isCorrect: boolean): string {
  if (isCorrect) return '🟩';
  if (proximity >= 80) return '🟨';
  if (proximity >= 50) return '🟧';
  return '⬜';
}

export function getSolveCounterKey(puzzleNumber: number, dateKey: string): string {
  return `solves:${puzzleNumber}:${dateKey}`;
}

export function getGemeenteWinsKey(gemeenteId: string): string {
  return `gemeente-wins:${gemeenteId}`;
}

export function validateTodayPuzzle(puzzleNumber: number, dateKey: string): boolean {
  const todayKey = getDateKey();
  return dateKey === todayKey && puzzleNumber === getPuzzleNumber();
}

/** Server-side guess evaluation — coördinaten blijven op de server */
export function evaluateGuess(guess: Gemeente, target: Gemeente) {
  const distance = haversineDistance(guess.lat, guess.lng, target.lat, target.lng);
  const bearing = calculateBearing(guess.lat, guess.lng, target.lat, target.lng);
  const arrow = bearingToArrow(bearing);
  const proximity = distanceToProximity(distance);
  const isCorrect = guess.id === target.id;
  return { distance, bearing, arrow, proximity, isCorrect };
}
