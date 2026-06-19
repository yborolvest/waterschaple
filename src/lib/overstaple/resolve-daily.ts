import { getDateKey, getDateKeyAfterDays } from '../game-logic';
import {
  getOverstaplePuzzlePair,
  type DailyPuzzle,
} from './logic';
import { NS_ROUTE_PREFETCH_DELAY_MS, ROUTE_PREFETCH_DAYS } from './config';
import { pathToDailyPuzzleFields } from './pathfinding';
import { resolveRoutePathForDay } from './ns-routes';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** NL: Cache routes voor vandaag + komende dagen / EN: Prefetch routes for today and upcoming days */
export async function prefetchOverstapleRoutes(
  fromDate = new Date(),
  days = ROUTE_PREFETCH_DAYS,
): Promise<{ dateKey: string; source: string; hops: number }[]> {
  const results: { dateKey: string; source: string; hops: number }[] = [];

  for (let offset = 0; offset < days; offset++) {
    const dateKey = getDateKeyAfterDays(fromDate, offset);
    const pair = getOverstaplePuzzlePair(new Date(`${dateKey}T12:00:00`));
    if (!pair) continue;

    try {
      const { path, source } = await resolveRoutePathForDay(dateKey, pair.start, pair.end);
      results.push({ dateKey, source, hops: path.length - 1 });
      console.log(`  ${dateKey}: ${pair.start.name} → ${pair.end.name} (${source}, ${path.length - 1} hops)`);
    } catch (err) {
      console.warn(`  ${dateKey}: ${pair.start.name} → ${pair.end.name} mislukt:`, err);
    }

    if (offset < days - 1) await sleep(NS_ROUTE_PREFETCH_DELAY_MS);
  }

  return results;
}

/** NL: Start/eind + NS-route (1 API-call/dag, gecached) / EN: Pair + cached daily NS route */
export async function resolveOverstapleDailyPuzzle(date = new Date()): Promise<DailyPuzzle | null> {
  const pair = getOverstaplePuzzlePair(date);
  if (!pair) return null;
  const dateKey = getDateKey(date);
  const { path, source } = await resolveRoutePathForDay(dateKey, pair.start, pair.end);
  if (source === 'graph') {
    console.warn(`[Overstaple] ${dateKey}: graaf-fallback (alleen zonder NS API-key)`);
  }
  return { ...pair, ...pathToDailyPuzzleFields(path) };
}

export async function resolveOverstapleDailyPuzzleFromKey(dateKey: string): Promise<DailyPuzzle | null> {
  return resolveOverstapleDailyPuzzle(new Date(`${dateKey}T12:00:00`));
}
