import type { APIRoute } from 'astro';
import { findStationById, getPublicStationsList, toPublicStation } from '../../../data/stations';
import {
  getDateKey,
  getPuzzleNumber,
  getPuzzleNumberFromKey,
  getYesterdayDateKey,
  validateTodayPuzzle,
} from '../../../lib/game-logic';
import {
  getStationDailyTarget,
  getStationDailyTargetFromKey,
  getStationSolveCounterKey,
  getYesterdayStationTarget,
  evaluateStationGuess,
} from '../../../lib/stationdle/logic';
import { getStationUnlockedHints } from '../../../lib/stationdle/hints';
import { USE_RANDOM_TARGET_FOR_TESTING } from '../../../lib/stationdle/config';
import {
  getSolveCount,
  getStationWinCount,
  getStorageBackend,
  incrementSolveCount,
  incrementStationWinCount,
} from '../../../lib/server/solve-store';
import { checkRateLimit, getClientIp } from '../../../lib/server/rate-limit';

interface GuessBody {
  stationId?: string;
  puzzleNumber?: number;
  dateKey?: string;
  attemptNumber?: number;
}

/** GET /api/stationdle/daily */
export const GET: APIRoute = async () => {
  const today = new Date();
  const dateKey = getDateKey(today);
  const puzzleNumber = getPuzzleNumber(today);
  const yesterdayTarget = getYesterdayStationTarget(today);
  const yesterdayKey = getYesterdayDateKey(today);

  const counterKey = getStationSolveCounterKey(puzzleNumber, dateKey);
  const globalSolveCount = USE_RANDOM_TARGET_FOR_TESTING ? 0 : await getSolveCount(counterKey);

  return json({
    puzzleNumber,
    dateKey,
    yesterday: {
      ...toPublicStation(yesterdayTarget),
      puzzleNumber: getPuzzleNumberFromKey(yesterdayKey),
    },
    stations: getPublicStationsList(),
    globalSolveCount,
    backend: getStorageBackend(),
    testMode: USE_RANDOM_TARGET_FOR_TESTING,
  });
};

/** POST /api/stationdle/daily */
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

  const { stationId, puzzleNumber, dateKey, attemptNumber } = body;

  if (typeof stationId !== 'string' || typeof puzzleNumber !== 'number' || typeof dateKey !== 'string') {
    return json({ error: 'stationId, puzzleNumber and dateKey required' }, 400);
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

  const guess = findStationById(stationId);
  if (!guess) {
    return json({ error: 'Unknown station' }, 400);
  }

  const target = USE_RANDOM_TARGET_FOR_TESTING
    ? getStationDailyTargetFromKey(dateKey)
    : getStationDailyTarget();

  const result = evaluateStationGuess(guess, target);
  const counterKey = getStationSolveCounterKey(puzzleNumber, dateKey);

  let globalSolveCount = await getSolveCount(counterKey);
  let stationHistoricalWins: number | null = null;

  if (result.isCorrect && !USE_RANDOM_TARGET_FOR_TESTING) {
    globalSolveCount = await incrementSolveCount(counterKey);
    stationHistoricalWins = await incrementStationWinCount(target.id);
  } else if (result.isCorrect) {
    stationHistoricalWins = await getStationWinCount(target.id);
  }

  const isGameOver =
    result.isCorrect || (typeof attemptNumber === 'number' && attemptNumber >= 6);

  const response: Record<string, unknown> = {
    station: toPublicStation(guess),
    distance: Math.round(result.distance),
    arrow: result.arrow,
    proximity: result.proximity,
    isCorrect: result.isCorrect,
    globalSolveCount,
    stationHistoricalWins: result.isCorrect ? stationHistoricalWins : null,
  };

  if (isGameOver) {
    response.target = toPublicStation(target);
  }

  if (!result.isCorrect) {
    response.hints = getStationUnlockedHints(
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
