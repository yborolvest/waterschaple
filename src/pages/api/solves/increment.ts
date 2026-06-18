import type { APIRoute } from 'astro';
import {
  getSolveCounterKey,
  validateTodayPuzzle,
  getDateKey,
  getPuzzleNumber,
} from '../../../lib/game-logic';
import { incrementSolveCount, getStorageBackend } from '../../../lib/server/solve-store';
import { checkRateLimit, getClientIp } from '../../../lib/server/rate-limit';

interface IncrementBody {
  puzzleNumber?: number;
  dateKey?: string;
}

/**
 * POST /api/solves/increment
 * Body: { puzzleNumber, dateKey }
 * EN: Records a win for today's global puzzle (validated server-side).
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  const rate = checkRateLimit(ip);

  if (!rate.ok) {
    return json(
      { error: 'Too many requests', retryAfterSec: rate.retryAfterSec },
      429,
      { 'Retry-After': String(rate.retryAfterSec ?? 3600) },
    );
  }

  let body: IncrementBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { puzzleNumber, dateKey } = body;
  if (typeof puzzleNumber !== 'number' || typeof dateKey !== 'string') {
    return json({ error: 'puzzleNumber and dateKey required' }, 400);
  }

  if (!validateTodayPuzzle(puzzleNumber, dateKey)) {
    return json(
      {
        error: 'Invalid puzzle for today',
        expected: { puzzleNumber: getPuzzleNumber(), dateKey: getDateKey() },
      },
      400,
    );
  }

  const key = getSolveCounterKey(puzzleNumber, dateKey);
  const count = await incrementSolveCount(key);

  return json({
    puzzleNumber,
    date: dateKey,
    count,
    backend: getStorageBackend(),
  });
};

export const prerender = false;

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
