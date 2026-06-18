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
  buildOverstapleMapData,
  countRemaining,
  evaluateOverstapleGuess,
  getOverstapleSolveCounterKey,
  getYesterdayOverstaplePuzzlePair,
  isOverstapleWin,
  type DailyPuzzle,
  type MapGuessInput,
} from '../../../lib/overstaple/logic';
import {
  resolveOverstapleDailyPuzzle,
  resolveOverstapleDailyPuzzleFromKey,
  prefetchOverstapleRoutes,
} from '../../../lib/overstaple/resolve-daily';
import { ROUTE_PREFETCH_DAYS } from '../../../lib/overstaple/config';
import type { GuessQuality } from '../../../lib/overstaple/types';
import { USE_RANDOM_TARGET_FOR_TESTING } from '../../../lib/overstaple/config';
import { getSolveCount, getStorageBackend, incrementSolveCount } from '../../../lib/server/solve-store';
import { checkRateLimit, getClientIp } from '../../../lib/server/rate-limit';

interface GuessBody {
  stationId?: string;
  puzzleNumber?: number;
  dateKey?: string;
  guessCount?: number;
  correctIds?: string[];
  guessedIds?: string[];
  guesses?: MapGuessInput[];
}

const VALID_QUALITIES = new Set<GuessQuality>(['connected', 'green', 'orange', 'red']);

function parseGuessesParam(param: string | null): MapGuessInput[] {
  if (!param) return [];
  return param
    .split(',')
    .map((part) => {
      const [id, quality] = part.split(':');
      const q = quality as GuessQuality;
      if (!id?.trim() || !VALID_QUALITIES.has(q)) return null;
      return { id: id.trim(), quality: q };
    })
    .filter((g): g is MapGuessInput => g !== null);
}

function parseGuessesBody(raw: unknown): MapGuessInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (g): g is MapGuessInput =>
        !!g &&
        typeof g === 'object' &&
        typeof (g as MapGuessInput).id === 'string' &&
        VALID_QUALITIES.has((g as MapGuessInput).quality),
    )
    .map((g) => ({ id: g.id, quality: g.quality }));
}

function puzzleToRoute(puzzle: DailyPuzzle) {
  return {
    start: toPublicStation(puzzle.start),
    end: toPublicStation(puzzle.end),
    intermediateCount: puzzle.intermediate.length,
  };
}

/** GET /api/overstaple/daily */
export const GET: APIRoute = async ({ url }) => {
  const today = new Date();
  const dateKey = getDateKey(today);
  const puzzleNumber = getPuzzleNumber(today);
  const puzzle = await resolveOverstapleDailyPuzzle(today);
  const yesterdayPair = getYesterdayOverstaplePuzzlePair(today);
  const yesterdayKey = getYesterdayDateKey(today);

  if (!puzzle) {
    return json({ error: 'Geen puzzel beschikbaar' }, 500);
  }

  void prefetchOverstapleRoutes(today, ROUTE_PREFETCH_DAYS).catch((err) => {
    console.warn('[Overstaple] Route prefetch mislukt:', err);
  });

  const correctIdsParam = url.searchParams.get('correctIds');
  const restoredCorrectIds = correctIdsParam
    ? correctIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
    : [];
  const restoredGameOver = url.searchParams.get('gameOver') === 'true';
  const restoredGuesses = parseGuessesParam(url.searchParams.get('guesses'));

  const counterKey = getOverstapleSolveCounterKey(puzzleNumber, dateKey);
  const globalSolveCount = USE_RANDOM_TARGET_FOR_TESTING ? 0 : await getSolveCount(counterKey);

  return json({
    puzzleNumber,
    dateKey,
    route: puzzleToRoute(puzzle),
    map: buildOverstapleMapData(puzzle, restoredCorrectIds, restoredGuesses, restoredGameOver),
    stations: getPublicStationsList(),
    globalSolveCount,
    backend: getStorageBackend(),
    testMode: USE_RANDOM_TARGET_FOR_TESTING,
    yesterday: yesterdayPair
      ? {
          start: toPublicStation(yesterdayPair.start),
          end: toPublicStation(yesterdayPair.end),
          puzzleNumber: getPuzzleNumberFromKey(yesterdayKey),
        }
      : null,
  });
};

/** POST /api/overstaple/daily */
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

  const { stationId, puzzleNumber, dateKey, guessCount, correctIds = [], guessedIds = [], guesses = [] } = body;

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

  const puzzle = USE_RANDOM_TARGET_FOR_TESTING
    ? await resolveOverstapleDailyPuzzleFromKey(dateKey)
    : await resolveOverstapleDailyPuzzle();

  if (!puzzle) {
    return json({ error: 'Geen puzzel beschikbaar' }, 500);
  }

  const safeCorrect = Array.isArray(correctIds) ? correctIds.filter((id) => typeof id === 'string') : [];
  const safeGuessed = Array.isArray(guessedIds) ? guessedIds.filter((id) => typeof id === 'string') : [];

  const { quality, isDuplicate } = evaluateOverstapleGuess(
    stationId,
    puzzle,
    safeCorrect,
    safeGuessed,
  );

  if (quality === 'invalid') {
    return json({ error: 'Start- en eindstation kun je niet raden' }, 400);
  }

  const newCorrect = [...safeCorrect];
  if ((quality === 'green' || quality === 'connected') && !isDuplicate) {
    newCorrect.push(stationId);
  }

  const won = isOverstapleWin(newCorrect, puzzle);
  const gameOver = won;

  const counterKey = getOverstapleSolveCounterKey(puzzleNumber, dateKey);
  let globalSolveCount = await getSolveCount(counterKey);

  if (won && !USE_RANDOM_TARGET_FOR_TESTING) {
    globalSolveCount = await incrementSolveCount(counterKey);
  }

  const safeGuesses = parseGuessesBody(guesses);
  const guessesForMap: MapGuessInput[] = isDuplicate
    ? safeGuesses
    : [...safeGuesses, { id: stationId, quality }];

  const response: Record<string, unknown> = {
    station: toPublicStation(guess),
    quality,
    isDuplicate,
    globalSolveCount,
    gameOver,
    won,
    correctIds: newCorrect,
    remaining: countRemaining(puzzle, newCorrect),
    map: buildOverstapleMapData(puzzle, newCorrect, guessesForMap, gameOver),
  };

  if (gameOver) {
    response.solution = {
      start: toPublicStation(puzzle.start),
      end: toPublicStation(puzzle.end),
      intermediate: puzzle.intermediate
        .map((id) => findStationById(id))
        .filter(Boolean)
        .map((s) => toPublicStation(s!)),
    };
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
