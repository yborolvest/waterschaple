import type { Station } from '../../data/stations';
import { HINT_PROVINCE_AFTER_ATTEMPT, HINT_TRAJECT_AFTER_ATTEMPT } from './config';
import type { StationUnlockedHints } from './types';

/** NL: hints blijven zichtbaar na afloop. EN: hints stay available after game over. */
export function getStationUnlockedHints(
  attemptNumber: number,
  target: Station,
  _gameWon: boolean,
): StationUnlockedHints {
  const province =
    attemptNumber >= HINT_PROVINCE_AFTER_ATTEMPT ? target.province : null;

  const traject =
    attemptNumber >= HINT_TRAJECT_AFTER_ATTEMPT ? target.traject : null;

  return { province, traject };
}
