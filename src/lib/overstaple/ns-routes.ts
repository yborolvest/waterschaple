import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { STATIONS, type Station } from '../../data/stations';
import { findShortestPathIds } from './pathfinding';

const NS_TRIPS_URL = 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips';
const NS_TRIP_ADVICES = 8;
const NS_FETCH_TIMEOUT_MS = 20_000;
const NS_FETCH_RETRIES = 3;
const CACHE_DIR = join(process.cwd(), '.data', 'ns-routes');

/** NL: Vertrektijd voor dienstregeling (geen live-storingen) / EN: Departure time for timetable query */
export function dateKeyToPlannerDateTime(dateKey: string): string {
  return `${dateKey}T09:00`;
}

interface NsLegStop {
  name?: string;
  mediumName?: string;
  shortName?: string;
  passing?: boolean;
  code?: string;
  evaCode?: string;
  uicCode?: string;
}

interface NsTrip {
  status?: string;
  cancelled?: boolean;
  transfers?: number;
  legs?: {
    cancelled?: boolean;
    stops?: NsLegStop[];
    origin?: NsLegStop;
    destination?: NsLegStop;
  }[];
}

interface CachedRoute {
  path: string[];
  source: 'ns' | 'graph';
  cachedAt: string;
  startId: string;
  endId: string;
}

const memoryCache = new Map<string, CachedRoute>();
const inflight = new Map<string, Promise<string[]>>();
/** NL: Na 429 even geen NS-calls / EN: Pause NS calls after rate limit */
let nsCooldownUntil = 0;
const NS_COOLDOWN_MS = 60 * 60 * 1000;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''´`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** NL: NS gebruikt afkortingen (bijv. "v" i.p.v. "van") / EN: NS stop name abbreviation variants */
function nsNameVariants(name: string): string[] {
  const lower = name.trim().toLowerCase();
  const variants = new Set<string>([lower]);
  variants.add(
    lower
      .replace(/\bv\b/g, 'van')
      .replace(/\ba\/d\b/g, 'aan den')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  variants.add(
    lower
      .replace(/\bvan\b/g, 'v')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  return [...variants];
}

function buildStationLookups() {
  const byCode = new Map(STATIONS.map((s) => [s.code.toUpperCase(), s.id]));
  const bySlug = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const s of STATIONS) {
    for (const variant of nsNameVariants(s.name)) {
      bySlug.set(slugify(variant), s.id);
      byName.set(variant, s.id);
    }
  }
  return { byCode, bySlug, byName };
}

function lookupStationId(
  name: string,
  code: string,
  lookups: ReturnType<typeof buildStationLookups>,
): string | undefined {
  const normalizedCode = code.toUpperCase();
  if (normalizedCode) {
    const fromCode =
      normalizedCode.length <= 5
        ? lookups.byCode.get(normalizedCode.slice(-4)) ?? lookups.byCode.get(normalizedCode)
        : lookups.byCode.get(normalizedCode);
    if (fromCode) return fromCode;
  }
  for (const variant of nsNameVariants(name)) {
    const id = lookups.bySlug.get(slugify(variant)) ?? lookups.byName.get(variant);
    if (id) return id;
  }
  return undefined;
}

function getApiKey(): string | undefined {
  return process.env.NS_API_SUBSCRIPTION_KEY || import.meta.env.NS_API_SUBSCRIPTION_KEY;
}

function cacheFilePath(dateKey: string): string {
  return join(CACHE_DIR, `${dateKey}.json`);
}

function isTrustedCache(entry: CachedRoute, startId: string, endId: string): boolean {
  return (
    entry.source === 'ns' &&
    entry.startId === startId &&
    entry.endId === endId &&
    entry.path?.[0] === startId
  );
}

async function readDiskCache(dateKey: string, startId: string, endId: string): Promise<CachedRoute | null> {
  try {
    const raw = await readFile(cacheFilePath(dateKey), 'utf8');
    const entry = JSON.parse(raw) as CachedRoute;
    return isTrustedCache(entry, startId, endId) ? entry : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(dateKey: string, data: CachedRoute): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFilePath(dateKey), JSON.stringify(data), 'utf8');
}

export function extractStopNamesFromTrip(trip: NsTrip): string[] {
  const names: string[] = [];
  for (const leg of trip.legs ?? []) {
    const stops = leg.stops ?? [];
    if (stops.length) {
      for (const stop of stops) {
        if (stop.passing) continue;
        const name = stop.name ?? stop.mediumName ?? stop.shortName;
        if (name) names.push(name.trim());
      }
      continue;
    }
    if (leg.origin?.name) names.push(leg.origin.name.trim());
    if (leg.destination?.name) names.push(leg.destination.name.trim());
  }
  const out: string[] = [];
  for (const name of names) {
    if (out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

function tripDurationMinutes(trip: NsTrip): number {
  const start = trip.legs?.[0]?.origin as { plannedDateTime?: string } | undefined;
  const end = trip.legs?.at(-1)?.destination as { plannedDateTime?: string } | undefined;
  const startDt = start?.plannedDateTime ?? (trip.legs?.[0]?.stops?.[0] as { plannedDepartureDateTime?: string })?.plannedDepartureDateTime;
  const endDt = end?.plannedDateTime ?? (trip.legs?.at(-1)?.stops?.at(-1) as { plannedArrivalDateTime?: string })?.plannedArrivalDateTime;
  if (!startDt || !endDt) return Infinity;
  return (new Date(endDt).getTime() - new Date(startDt).getTime()) / 60_000;
}

function tripTransfers(trip: NsTrip): number {
  if (typeof trip.transfers === 'number') return trip.transfers;
  return Math.max(0, (trip.legs?.length ?? 1) - 1);
}

function tripStatusRank(trip: NsTrip): number {
  if (!trip.status || trip.status === 'NORMAL') return 0;
  if (trip.status === 'ALTERNATIVE_TRANSPORT') return 1;
  return 2;
}

function isViableNsTrip(trip: NsTrip): boolean {
  if (!trip.legs?.length) return false;
  if (trip.cancelled) return false;
  if (trip.status === 'CANCELLED') return false;
  return trip.legs.every((leg) => !leg.cancelled);
}

export function selectBestNsTrip(trips: NsTrip[]): NsTrip | null {
  const viable = trips.filter(isViableNsTrip);
  if (!viable.length) return null;
  viable.sort((a, b) => {
    const status = tripStatusRank(a) - tripStatusRank(b);
    if (status !== 0) return status;
    const dur = tripDurationMinutes(a) - tripDurationMinutes(b);
    if (dur !== 0) return dur;
    const tr = tripTransfers(a) - tripTransfers(b);
    if (tr !== 0) return tr;
    return extractStopNamesFromTrip(a).length - extractStopNamesFromTrip(b).length;
  });
  return viable[0];
}

function stopCode(stop: NsLegStop): string {
  return (stop.code ?? stop.evaCode ?? stop.uicCode ?? '').toString().toUpperCase();
}

function mapTripToPathIds(trip: NsTrip, startId: string, endId: string): string[] | null {
  const lookups = buildStationLookups();
  const ids: string[] = [];

  for (const leg of trip.legs ?? []) {
    const stops = leg.stops?.length ? leg.stops : [leg.origin, leg.destination].filter(Boolean) as NsLegStop[];
    for (const stop of stops) {
      if (!stop || stop.passing) continue;
      const name = (stop.name ?? stop.mediumName ?? stop.shortName ?? '').trim();
      const id = lookupStationId(name, stopCode(stop), lookups);
      if (!id) continue;
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
  }

  if (!ids.length) {
    for (const name of extractStopNamesFromTrip(trip)) {
      const id = lookupStationId(name, '', lookups);
      if (!id) continue;
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
  }

  if (!ids.length || ids[0] !== startId || ids[ids.length - 1] !== endId) return null;
  return ids;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchNsTrips(
  fromCode: string,
  toCode: string,
  apiKey: string,
  dateTime: string,
): Promise<NsTrip[] | null> {
  if (Date.now() < nsCooldownUntil) return null;

  const params = new URLSearchParams({
    fromStation: fromCode.toUpperCase(),
    toStation: toCode.toUpperCase(),
    dateTime,
    departure: 'true',
    previousAdvices: '0',
    nextAdvices: String(NS_TRIP_ADVICES),
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${NS_TRIPS_URL}?${params}`, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      signal: AbortSignal.timeout(NS_FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) {
      nsCooldownUntil = Date.now() + NS_COOLDOWN_MS;
      const retrySec = Number(res.headers.get('Retry-After') ?? 15);
      if (attempt === 0) await sleep((retrySec + 1) * 1000);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[Overstaple] NS trips ${res.status}: ${body.slice(0, 120)}`);
      return null;
    }

    const data = (await res.json()) as { trips?: NsTrip[] };
    return data.trips ?? [];
  }

  console.warn('[Overstaple] NS trips: rate limit, graaf-fallback (1 uur pauze)');
  nsCooldownUntil = Date.now() + NS_COOLDOWN_MS;
  return null;
}

async function fetchNsPath(start: Station, end: Station, dateKey: string): Promise<string[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  for (let attempt = 0; attempt < NS_FETCH_RETRIES; attempt++) {
    const trips = await fetchNsTrips(start.code, end.code, apiKey, dateKeyToPlannerDateTime(dateKey));
    if (!trips?.length) {
      if (attempt < NS_FETCH_RETRIES - 1) await sleep(1000 * (attempt + 1));
      continue;
    }
    const trip = selectBestNsTrip(trips);
    if (!trip) {
      if (attempt < NS_FETCH_RETRIES - 1) await sleep(1000 * (attempt + 1));
      continue;
    }
    const path = mapTripToPathIds(trip, start.id, end.id);
    if (path) return path;
    if (attempt < NS_FETCH_RETRIES - 1) await sleep(1000 * (attempt + 1));
  }
  return null;
}

function graphFallbackPath(startId: string, endId: string): string[] {
  return findShortestPathIds(startId, endId) ?? [startId, endId];
}

/**
 * NL: Route van vandaag: 1× NS API per dag, daarna cache.
 * EN: Today's route: one NS call per day, then cached.
 */
export async function resolveRoutePathForDay(
  dateKey: string,
  start: Station,
  end: Station,
): Promise<{ path: string[]; source: 'ns' | 'graph' | 'cache' }> {
  const mem = memoryCache.get(dateKey);
  if (mem && isTrustedCache(mem, start.id, end.id)) {
    return { path: mem.path, source: 'cache' };
  }

  const disk = await readDiskCache(dateKey, start.id, end.id);
  if (disk) {
    memoryCache.set(dateKey, disk);
    return { path: disk.path, source: 'cache' };
  }

  if (inflight.has(dateKey)) {
    const path = await inflight.get(dateKey)!;
    return { path, source: 'cache' };
  }
  const task = (async () => {
    const hasApiKey = !!getApiKey();
    let path = await fetchNsPath(start, end, dateKey);
    let source: CachedRoute['source'] = 'ns';

    if (!path) {
      if (hasApiKey) {
        console.error(
          `[Overstaple] NS-route niet beschikbaar voor ${dateKey} (${start.name} → ${end.name}); graaf-fallback uitgeschakeld`,
        );
        throw new Error('NS route unavailable');
      }
      console.warn(`[Overstaple] Geen NS API-key: graaf-fallback voor ${dateKey}`);
      path = graphFallbackPath(start.id, end.id);
      source = 'graph';
    }

    const entry: CachedRoute = {
      path,
      source,
      cachedAt: new Date().toISOString(),
      startId: start.id,
      endId: end.id,
    };
    if (source === 'ns') {
      memoryCache.set(dateKey, entry);
      await writeDiskCache(dateKey, entry);
    }
    return path;
  })();

  inflight.set(dateKey, task);
  try {
    const path = await task;
    const cached = memoryCache.get(dateKey);
    const source = cached?.source === 'ns' ? 'ns' : 'graph';
    return { path, source: source === 'ns' ? 'ns' : 'graph' };
  } catch (err) {
    console.warn('[Overstaple] Route ophalen mislukt:', err);
    throw err;
  } finally {
    inflight.delete(dateKey);
  }
}
