import type { APIRoute } from 'astro';
import { getSolveCounterKey } from '../../../lib/game-logic';
import { getSolveCount, getStorageBackend } from '../../../lib/server/solve-store';

/** GET /api/solves/count?puzzle=532&date=2026-06-16 */
export const GET: APIRoute = async ({ url }) => {
  const puzzleParam = url.searchParams.get('puzzle');
  const dateKey = url.searchParams.get('date');

  if (!puzzleParam || !dateKey) {
    return json({ error: 'Missing puzzle or date parameter' }, 400);
  }

  const puzzleNumber = parseInt(puzzleParam, 10);
  if (!Number.isFinite(puzzleNumber) || puzzleNumber < 1) {
    return json({ error: 'Invalid puzzle number' }, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return json({ error: 'Invalid date format' }, 400);
  }

  const key = getSolveCounterKey(puzzleNumber, dateKey);
  const count = await getSolveCount(key);

  return json({
    puzzleNumber,
    date: dateKey,
    count,
    backend: getStorageBackend(),
  });
};

/** HEAD request for today's count shortcut */
export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
    },
  });
}
