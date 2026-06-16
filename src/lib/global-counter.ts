import {
  GLOBAL_COUNTER_API,
  GLOBAL_COUNTER_PREFIX,
  USE_RANDOM_TARGET_FOR_TESTING,
} from './config';

export function getGlobalCounterKey(puzzleNumber: number, dateKey: string): string {
  return `${GLOBAL_COUNTER_PREFIX}-p${puzzleNumber}-${dateKey}`;
}

export function formatGlobalSolveText(count: number): string {
  if (count === 0) return 'Nog niemand heeft de puzzel vandaag opgelost';
  if (count === 1) return 'Vandaag <strong>1×</strong> opgelost door een speler';
  return `Vandaag <strong>${count.toLocaleString('nl-NL')}×</strong> opgelost door spelers`;
}

export async function fetchGlobalSolveCount(puzzleNumber: number, dateKey: string): Promise<number | null> {
  if (USE_RANDOM_TARGET_FOR_TESTING) return null;

  const key = getGlobalCounterKey(puzzleNumber, dateKey);
  try {
    const res = await fetch(`${GLOBAL_COUNTER_API}/get/${encodeURIComponent(key)}`);
    const data = await res.json();
    return data.error === 'Key not found' ? 0 : parseInt(data.value, 10) || 0;
  } catch (e) {
    console.warn('[Waterschaple] Global counter ophalen mislukt:', e);
    return null;
  }
}

export async function reportGlobalWin(puzzleNumber: number, dateKey: string): Promise<number | null> {
  if (USE_RANDOM_TARGET_FOR_TESTING) return null;

  const key = getGlobalCounterKey(puzzleNumber, dateKey);
  try {
    const res = await fetch(`${GLOBAL_COUNTER_API}/hit/${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseInt(data.value, 10) || 0;
  } catch (e) {
    console.warn('[Waterschaple] Global counter bijwerken mislukt:', e);
    return null;
  }
}
