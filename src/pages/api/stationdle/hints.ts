import type { APIRoute } from 'astro';
import { getDateKey, getPuzzleNumber, validateTodayPuzzle } from '../../../lib/game-logic';
import { getStationDailyTarget } from '../../../lib/stationdle/logic';
import { getStationUnlockedHints } from '../../../lib/stationdle/hints';

/** GET /api/stationdle/hints?puzzle=&date=&attempts= */
export const GET: APIRoute = async ({ url }) => {
  const puzzleParam = url.searchParams.get('puzzle');
  const dateKey = url.searchParams.get('date');
  const attemptsParam = url.searchParams.get('attempts');

  if (!puzzleParam || !dateKey) {
    return json({ error: 'Missing puzzle or date' }, 400);
  }

  const puzzleNumber = parseInt(puzzleParam, 10);
  const attempts = parseInt(attemptsParam ?? '0', 10);

  if (!Number.isFinite(puzzleNumber) || !validateTodayPuzzle(puzzleNumber, dateKey)) {
    return json(
      { error: 'Invalid puzzle for today', expected: { puzzleNumber: getPuzzleNumber(), dateKey: getDateKey() } },
      400,
    );
  }

  const hints = getStationUnlockedHints(Math.max(0, attempts), getStationDailyTarget(), false);
  return json({ hints });
};

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
