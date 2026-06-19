import type { APIRoute } from 'astro';
import { findGemeenteById, getPublicGemeentenList, toPublicGemeente } from '../../data/gemeenten';
import {
  evaluateGuess,
  getDailyTarget,
  getDailyTargetFromKey,
  getDateKey,
  getPuzzleNumber,
  getSolveCounterKey,
  getYesterdayDateKey,
  getYesterdayTarget,
  getPuzzleNumberFromKey,
  validateTodayPuzzle,
} from '../../lib/game-logic';
import {
  getGemeenteWinCount,
  getSolveCount,
  getStorageBackend,
  incrementGemeenteWinCount,
  incrementSolveCount,
} from '../../lib/server/solve-store';
import { checkRateLimit, getClientIp } from '../../lib/server/rate-limit';
import { getUnlockedHints } from '../../lib/hints';
import { USE_RANDOM_TARGET_FOR_TESTING, MAX_ATTEMPTS } from '../../lib/gemeentedle/config';

interface GuessBody {
  gemeenteId?: string;
  puzzleNumber?: number;
  dateKey?: string;
  attemptNumber?: number;
}

/**
 * GET /api/daily
 * NL: Puzzelmetadata, gisteren, gemeentenlijst (zonder coördinaten), community-teller.
 * EN: Never exposes today's target coordinates or identity.
 */
export const GET: APIRoute = async () => {
  const today = new Date();
  const dateKey = getDateKey(today);
  const puzzleNumber = getPuzzleNumber(today);
  const yesterdayTarget = getYesterdayTarget(today);
  const yesterdayKey = getYesterdayDateKey(today);

  const counterKey = getSolveCounterKey(puzzleNumber, dateKey);
  const globalSolveCount = USE_RANDOM_TARGET_FOR_TESTING ? 0 : await getSolveCount(counterKey);

  return json({
    puzzleNumber,
    dateKey,
    yesterday: {
      ...toPublicGemeente(yesterdayTarget),
      puzzleNumber: getPuzzleNumberFromKey(yesterdayKey),
    },
    gemeenten: getPublicGemeentenList(),
    globalSolveCount,
    backend: getStorageBackend(),
    testMode: USE_RANDOM_TARGET_FOR_TESTING,
  });
};

/**
 * POST /api/daily
 * NL: Valideert gok server-side, retourneert afstand/richting/nabijheid.
 * EN: Increments counters on correct guess; reveals target only on game over.
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

  let body: GuessBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { gemeenteId, puzzleNumber, dateKey, attemptNumber } = body;

  if (typeof gemeenteId !== 'string' || typeof puzzleNumber !== 'number' || typeof dateKey !== 'string') {
    return json({ error: 'gemeenteId, puzzleNumber and dateKey required' }, 400);
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

  const guess = findGemeenteById(gemeenteId);
  if (!guess) {
    return json({ error: 'Unknown gemeente' }, 400);
  }

  const target = USE_RANDOM_TARGET_FOR_TESTING
    ? getDailyTargetFromKey(dateKey)
    : getDailyTarget();

  const result = evaluateGuess(guess, target);
  const counterKey = getSolveCounterKey(puzzleNumber, dateKey);

  let globalSolveCount = await getSolveCount(counterKey);
  let gemeenteHistoricalWins: number | null = null;

  if (result.isCorrect && !USE_RANDOM_TARGET_FOR_TESTING) {
    globalSolveCount = await incrementSolveCount(counterKey);
    gemeenteHistoricalWins = await incrementGemeenteWinCount(target.id);
  } else if (result.isCorrect) {
    gemeenteHistoricalWins = await getGemeenteWinCount(target.id);
  }

  const isGameOver =
    result.isCorrect || (typeof attemptNumber === 'number' && attemptNumber >= MAX_ATTEMPTS);

  const response: Record<string, unknown> = {
    gemeente: toPublicGemeente(guess),
    distance: Math.round(result.distance),
    arrow: result.arrow,
    proximity: result.proximity,
    isCorrect: result.isCorrect,
    globalSolveCount,
    gemeenteHistoricalWins: result.isCorrect ? gemeenteHistoricalWins : null,
  };

  if (isGameOver) {
    response.target = toPublicGemeente(target);
  }

  if (!result.isCorrect) {
    response.hints = getUnlockedHints(
      typeof attemptNumber === 'number' ? attemptNumber : 0,
      target,
      false,
    );
  }

  return json(response);
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
