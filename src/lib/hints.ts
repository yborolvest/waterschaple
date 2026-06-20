import { HINT_FLAG_AFTER_ATTEMPT, HINT_PROVINCE_AFTER_ATTEMPT } from './gemeentedle/config';
import { getGemeenteFlagUrl } from '../data/gemeente-flags';
import type { Gemeente } from '../data/gemeenten';
import type { UnlockedHints } from './types';

export type { UnlockedHints };

/** Server-side: welke hints zijn vrijgespeeld na N pogingen (ook na afloop). / Unlocked hints after N attempts (including after game over). */
export function getUnlockedHints(
  attemptNumber: number,
  target: Gemeente,
  _gameWon: boolean,
): UnlockedHints {
  const flagUrl =
    attemptNumber >= HINT_FLAG_AFTER_ATTEMPT ? getGemeenteFlagUrl(target.id) : null;

  const province =
    attemptNumber >= HINT_PROVINCE_AFTER_ATTEMPT ? target.province : null;

  return { flagUrl, province };
}
