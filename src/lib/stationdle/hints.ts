import type { Station } from '../../data/stations';
import { HINT_PROVINCE_AFTER_ATTEMPT, HINT_TRAJECT_AFTER_ATTEMPT } from './config';
import type { StationUnlockedHints } from './types';

export function getStationUnlockedHints(
  attemptNumber: number,
  target: Station,
  gameWon: boolean,
): StationUnlockedHints {
  if (gameWon) {
    return { province: null, traject: null };
  }

  const province =
    attemptNumber >= HINT_PROVINCE_AFTER_ATTEMPT ? target.province : null;

  const traject =
    attemptNumber >= HINT_TRAJECT_AFTER_ATTEMPT ? target.traject : null;

  return { province, traject };
}
