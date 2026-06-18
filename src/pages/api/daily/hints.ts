import type { APIRoute } from 'astro';
import { getDailyTarget, getDateKey, getPuzzleNumber, validateTodayPuzzle } from '../../../lib/game-logic';
import { getUnlockedHints } from '../../../lib/hints';

/**
 * GET /api/daily/hints?puzzle=&date=&attempts=
 * NL: Hintstatus herstellen na pagina-refresh (gevalideerd op server).
 */
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

  const hints = getUnlockedHints(Math.max(0, attempts), getDailyTarget(), false);
  return json({ hints });
};

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
