/**
 * Test NS-route voor Schiphol → Heerlen (vergelijk met reisplanner)
 * Usage: node scripts/verify-ns-route.mjs
 */
import { readFile } from 'node:fs/promises';
import { loadNsApiKey, fetchNsTrip, extractStopNamesFromTrip, mapTripToPathIds, tripDurationMinutes, tripTransfers, tripStopCount } from './lib/ns-api.mjs';

async function loadStations() {
  const src = await readFile(new URL('../src/data/stations.ts', import.meta.url), 'utf8');
  const list = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) list.push({ id: m[1], code: m[2], name: m[3] });
  return list;
}

const apiKey = await loadNsApiKey();
if (!apiKey) {
  console.error('Zet NS_API_SUBSCRIPTION_KEY in .env');
  process.exit(1);
}

const stations = await loadStations();
const start = stations.find((s) => s.id === 'schiphol-airport');
const end = stations.find((s) => s.id === 'heerlen');
if (!start || !end) throw new Error('Stations niet gevonden');

const trip = await fetchNsTrip({ apiKey, fromCode: start.code, toCode: end.code });
if (!trip) {
  console.log('Geen trip gevonden');
  process.exit(0);
}

const names = extractStopNamesFromTrip(trip);
const ids = mapTripToPathIds(trip, stations);
console.log('Reistijd:', Math.round(tripDurationMinutes(trip)), 'min');
console.log('Overstappen:', tripTransfers(trip));
console.log('Haltes:', tripStopCount(trip));
console.log('NS haltes:', names.join(' → '));
console.log('Mapped ids:', ids?.join(' → '));
