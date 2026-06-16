import { MAX_DISTANCE_KM, EPOCH_DATE } from './config';
import { WATERSCHAPPEN } from '../data/waterschappen';
import type { Waterschap } from './types';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Haversine-afstand in km / great-circle distance in km */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Richting van A naar B in graden (0 = noord) / bearing in degrees */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Windrichting als emoji-pijl / compass arrow emoji */
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

/** Nabijheidsscore 0–100% / proximity score */
export function distanceToProximity(distanceKm: number): number {
  if (distanceKm <= 0) return 100;
  const score = Math.round((1 - distanceKm / MAX_DISTANCE_KM) * 100);
  return Math.max(0, Math.min(100, score));
}

/** Doelwaterschap voor een datum / daily target waterschap */
export function getDailyTarget(date = new Date()): Waterschap {
  const msPerDay = 1000 * 60 * 60 * 24;
  const dayIndex = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(EPOCH_DATE.getFullYear(), EPOCH_DATE.getMonth(), EPOCH_DATE.getDate())) /
      msPerDay,
  );
  const index = ((dayIndex % WATERSCHAPPEN.length) + WATERSCHAPPEN.length) % WATERSCHAPPEN.length;
  return WATERSCHAPPEN[index];
}

/** Puzzelnummer sinds epoch / puzzle number since epoch */
export function getPuzzleNumber(date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return (
    Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(EPOCH_DATE.getFullYear(), EPOCH_DATE.getMonth(), EPOCH_DATE.getDate())) /
        msPerDay,
    ) + 1
  );
}

/** Gisteren in lokale tijdzone / yesterday's date */
export function getYesterdayDate(date = new Date()): Date {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/** Gisteren's doelwaterschap — voor iedereen wereldwijd hetzelfde */
export function getYesterdayTarget(date = new Date()): Waterschap {
  return getDailyTarget(getYesterdayDate(date));
}

/** YYYY-MM-DD in lokale tijdzone */
export function getDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(dateKey1: string, dateKey2: string): number {
  const d1 = new Date(`${dateKey1}T12:00:00`);
  const d2 = new Date(`${dateKey2}T12:00:00`);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function proximityToShareEmoji(proximity: number, isCorrect: boolean): string {
  if (isCorrect) return '🟩';
  if (proximity >= 80) return '🟨';
  if (proximity >= 50) return '🟧';
  return '⬜';
}
