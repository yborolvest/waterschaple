/**
 * NS Reisinformatie API helpers
 * NL: Trips API voor canonieke route / EN: Trips API for canonical journey paths
 */

import { readFile } from 'node:fs/promises';

const NS_TRIPS_URL = 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips';

/** NL: Vaste dienstregeling-referentie (dinsdag 09:00, geen live-storingen) / EN: Fixed timetable reference */
export const NS_PLANNER_REFERENCE_DATETIME = '2026-09-15T09:00';

const NS_TRIP_ADVICES = 12;

export async function loadNsApiKey() {
  if (process.env.NS_API_SUBSCRIPTION_KEY) return process.env.NS_API_SUBSCRIPTION_KEY;
  try {
    const raw = await readFile(new URL('../../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'NS_API_SUBSCRIPTION_KEY' && val) return val;
    }
  } catch {
    // optional
  }
  return null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''´`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** NL: Stops uit NS-trip (alle haltes, incl. Sprinter) / EN: All stop names on recommended trip */
export function extractStopNamesFromTrip(trip) {
  const names = [];
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

  const out = [];
  for (const name of names) {
    if (out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

/** NL: Geplande reistijd in minuten / EN: Planned travel time in minutes */
export function tripDurationMinutes(trip) {
  const start = trip.legs?.[0]?.origin?.plannedDateTime;
  const end = trip.legs?.at(-1)?.destination?.plannedDateTime;
  if (!start || !end) return Infinity;
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
}

export function tripTransfers(trip) {
  if (typeof trip.transfers === 'number') return trip.transfers;
  return Math.max(0, (trip.legs?.length ?? 1) - 1);
}

export function tripStopCount(trip) {
  return extractStopNamesFromTrip(trip).length;
}

/** NL: Geen geannuleerde of afwijkende reizen / EN: Skip cancelled / abnormal trips */
export function isViableNsTrip(trip) {
  if (!trip?.legs?.length) return false;
  if (trip.cancelled) return false;
  if (trip.status && trip.status !== 'NORMAL') return false;
  return trip.legs.every((leg) => !leg.cancelled);
}

/**
 * NL: Beste reis — 1) reistijd 2) overstappen 3) haltes (geplande dienstregeling).
 * EN: Best trip by planned duration, then transfers, then stops.
 */
export function selectBestNsTrip(trips) {
  const viable = (trips ?? []).filter(isViableNsTrip);
  if (!viable.length) return null;
  viable.sort((a, b) => {
    const dur = tripDurationMinutes(a) - tripDurationMinutes(b);
    if (dur !== 0) return dur;
    const tr = tripTransfers(a) - tripTransfers(b);
    if (tr !== 0) return tr;
    return tripStopCount(a) - tripStopCount(b);
  });
  return viable[0];
}

function stopCode(stop) {
  return (stop.code ?? stop.evaCode ?? stop.uicCode ?? '').toString().toUpperCase();
}

/** Map NS stop names/codes naar interne station-ids */
export function mapStopNamesToIds(stopNames, stations) {
  const byCode = new Map(stations.map((s) => [s.code.toUpperCase(), s.id]));
  const bySlug = new Map(stations.map((s) => [slugify(s.name), s.id]));
  const byName = new Map(stations.map((s) => [s.name.toLowerCase(), s.id]));

  const ids = [];
  for (const name of stopNames) {
    const slug = slugify(name);
    const id = bySlug.get(slug) ?? byName.get(name.toLowerCase());
    if (!id) return null;
    if (ids[ids.length - 1] !== id) ids.push(id);
  }
  return ids.length ? ids : null;
}

export function mapTripToPathIds(trip, stations) {
  const names = extractStopNamesFromTrip(trip);
  if (!names.length) return null;

  const byCode = new Map(stations.map((s) => [s.code.toUpperCase(), s.id]));
  const bySlug = new Map(stations.map((s) => [slugify(s.name), s.id]));
  const byName = new Map(stations.map((s) => [s.name.toLowerCase(), s.id]));

  const ids = [];
  for (const leg of trip.legs ?? []) {
    const stops = leg.stops?.length ? leg.stops : [leg.origin, leg.destination].filter(Boolean);
    for (const stop of stops) {
      if (!stop || stop.passing) continue;
      const code = stopCode(stop);
      const name = (stop.name ?? stop.mediumName ?? '').trim();
      const id =
        (code.length <= 5 ? byCode.get(code.slice(-4)) || byCode.get(code) : null) ??
        bySlug.get(slugify(name)) ??
        byName.get(name.toLowerCase());
      if (!id) return null;
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
  }
  return ids.length ? ids : mapStopNamesToIds(names, stations);
}

/** @returns {Promise<object | null>} beste NS-trip volgens route-prioriteiten */
export async function fetchNsTrip({
  apiKey,
  fromCode,
  toCode,
  dateTime = NS_PLANNER_REFERENCE_DATETIME,
}) {
  const params = new URLSearchParams({
    fromStation: fromCode.toUpperCase(),
    toStation: toCode.toUpperCase(),
    dateTime,
    departure: 'true',
    previousAdvices: '0',
    nextAdvices: String(NS_TRIP_ADVICES),
  });

  const res = await fetch(`${NS_TRIPS_URL}?${params}`, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NS trips ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return selectBestNsTrip(data.trips ?? []);
}

export async function resolveNsPathIds(stations, startId, endId, apiKey) {
  const start = stations.find((s) => s.id === startId);
  const end = stations.find((s) => s.id === endId);
  if (!start?.code || !end?.code) return null;

  const trip = await fetchNsTrip({
    apiKey,
    fromCode: start.code,
    toCode: end.code,
  });
  if (!trip) return null;

  const path = mapTripToPathIds(trip, stations);
  if (!path || path[0] !== startId || path[path.length - 1] !== endId) return null;
  return path;
}

export function defaultNsDateTime() {
  return NS_PLANNER_REFERENCE_DATETIME;
}
