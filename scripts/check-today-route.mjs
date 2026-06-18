import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function loadEnv() {
  try {
    const raw = await readFile(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch { /* optional */ }
}

await loadEnv();

const dateKey = process.argv[2] ?? '2026-06-18';
const { getOverstaplePuzzlePair } = await import('../src/lib/overstaple/logic.ts');
const { findStationById } = await import('../src/data/stations.ts');
const {
  fetchNsTrip,
  extractStopNamesFromTrip,
  mapTripToPathIds,
  tripDurationMinutes,
  tripTransfers,
  dateKeyToPlannerDateTime,
} = await import('./lib/ns-api.mjs');

const pair = getOverstaplePuzzlePair(new Date(`${dateKey}T12:00:00`));
if (!pair) {
  console.log('Geen puzzel');
  process.exit(1);
}

console.log('Puzzel:', pair.start.name, '→', pair.end.name);

try {
  const cache = JSON.parse(await readFile(join('.data/ns-routes', `${dateKey}.json`), 'utf8'));
  const names = cache.path.map((id) => findStationById(id)?.name);
  console.log('\nCache (' + cache.source + '):', names.join(' → '));
  console.log('Tussenstations:', cache.path.length - 2);
} catch {
  console.log('\nGeen cache');
}

const apiKey = process.env.NS_API_SUBSCRIPTION_KEY;
if (apiKey) {
  const trip = await fetchNsTrip({
    apiKey,
    fromCode: pair.start.code,
    toCode: pair.end.code,
    dateTime: dateKeyToPlannerDateTime(dateKey),
  });
  if (trip) {
    const names = extractStopNamesFromTrip(trip);
    const ids = mapTripToPathIds(trip, (await import('../src/data/stations.ts')).STATIONS.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
    })));
    console.log('\nNS API:', names.join(' → '));
    console.log('Tussenstations:', names.length - 2);
    console.log('Duur:', Math.round(tripDurationMinutes(trip)), 'min, overstappen:', tripTransfers(trip));
    console.log('Mapped ids:', ids?.length - 2, 'tussenstations');
  }
}
