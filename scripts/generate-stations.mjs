/**
 * Genereert src/data/stations.ts uit NS Reisinformatie API + dienstregeling.
 * NL: Stations (NS API), provincie (gemeente) en traject-hint (Rijden de Treinen).
 * EN: Dutch railway stations from NS API with province and route hints.
 *
 * Bron stations: https://apiportal.ns.nl/ (reisinformatie-api v2/stations)
 * Bron trajecten: https://blobs.duckdb.org/nl-railway/ (Rijden de Treinen)
 *
 * Vereist: NS_API_SUBSCRIPTION_KEY in omgeving of .env
 */

import { readFile, writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';

const SERVICES_URL = 'https://blobs.duckdb.org/nl-railway/services-2025-03.csv.gz';
const NS_STATIONS_URL = 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/stations';
const PRORAIL_STATION_API =
  'https://api.pdok.nl/prorail/spoorwegen/ogc/v1/collections/station/items?limit=500';

async function loadEnvKey() {
  if (process.env.NS_API_SUBSCRIPTION_KEY) return process.env.NS_API_SUBSCRIPTION_KEY;
  try {
    const raw = await readFile(new URL('../.env', import.meta.url), 'utf8');
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
    // .env optional
  }
  return null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === ',' && !q) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeRoute(route) {
  const parts = route.split(' – ').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return route.trim();
  return parts.sort((a, b) => a.localeCompare(b, 'nl')).join(' – ');
}

function pickBestRoute(routeMap) {
  if (!routeMap || routeMap.size === 0) return null;
  const domestic = [...routeMap.entries()]
    .filter(([route]) => !/(Hbf|\(M\)|Berlin|Brussel|Antwerpen|Paris|London|Köln|Basel)/i.test(route))
    .sort((a, b) => b[1] - a[1]);
  const best = domestic[0] ?? [...routeMap.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? normalizeRoute(best[0]) : null;
}

function cleanKmlint(raw) {
  if (!raw) return null;
  let t = raw.trim().replace(/\s+/g, ' ');
  t = t.replace(/\s+(Aansl\.|Grens|Rangeerterrein|Goederenemplacement|gebied)\b.*$/gi, '');
  const parts = t
    .split(' - ')
    .map((p) => p.trim())
    .filter((p) => p && !/^(Venserpolder|Gaasperdammerweg|Duivendrecht|Herfte)/i.test(p));
  if (parts.length >= 2) {
    return normalizeRoute(`${parts[0]} – ${parts[parts.length - 1]}`);
  }
  return t || null;
}

async function loadGemeenten() {
  const src = await readFile(new URL('../src/data/gemeenten.ts', import.meta.url), 'utf8');
  const re =
    /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*lat:\s*([-\d.]+),\s*lng:\s*([-\d.]+),\s*province:\s*"([^"]+)"\s*\}/g;
  const gemeenten = [];
  let m;
  while ((m = re.exec(src))) {
    gemeenten.push({
      id: m[1],
      name: m[2],
      lat: parseFloat(m[3]),
      lng: parseFloat(m[4]),
      province: m[5],
    });
  }
  if (!gemeenten.length) throw new Error('Kon gemeenten niet parsen uit gemeenten.ts');
  return gemeenten;
}

function findProvince(lat, lng, gemeenten) {
  let best = gemeenten[0];
  let bestD = Infinity;
  for (const g of gemeenten) {
    const d = haversine(lat, lng, g.lat, g.lng);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best.province;
}

async function fetchNsStations(apiKey) {
  const res = await fetch(NS_STATIONS_URL, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!res.ok) throw new Error(`NS API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const payload = data.payload ?? [];
  return payload.filter(
    (s) =>
      s.land === 'NL' &&
      s.code &&
      typeof s.lat === 'number' &&
      typeof s.lng === 'number' &&
      s.namen?.lang,
  );
}

async function fetchProRailStations() {
  let url = PRORAIL_STATION_API;
  const items = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ProRail API ${res.status}`);
    const data = await res.json();
    items.push(...(data.features ?? []));
    url = data.links?.find((l) => l.rel === 'next')?.href ?? null;
  }
  return items.filter((f) => {
    const p = f.properties ?? {};
    const naam = p.naam ?? '';
    return (
      p.beheerder === 'ProRail' &&
      !/\(D\)|\(B\)|\(F\)/.test(naam) &&
      f.geometry?.coordinates &&
      p.evenement !== 'Ja'
    );
  });
}

async function loadRouteMap() {
  process.stdout.write('Trajecten laden uit dienstregeling…\n');
  const res = await fetch(SERVICES_URL);
  if (!res.ok) throw new Error(`Services download ${res.status}`);
  const text = zlib.gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
  const lines = text.split('\n');
  const routes = new Map();
  let svcId = null;
  let stops = [];

  function flush() {
    if (stops.length < 2) return;
    const route = `${stops[0].name} – ${stops[stops.length - 1].name}`;
    for (const s of stops) {
      if (!routes.has(s.code)) routes.set(s.code, new Map());
      routes.get(s.code).set(route, (routes.get(s.code).get(route) || 0) + 1);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = parseCsvLine(lines[i]);
    const id = cols[0];
    if (id !== svcId) {
      flush();
      svcId = id;
      stops = [];
    }
    const code = cols[9];
    const name = cols[10];
    if (!code || !name) continue;
    if (!stops.length || stops[stops.length - 1].code !== code) {
      stops.push({ code, name });
    }
  }
  flush();
  process.stdout.write(`  ${routes.size} stationcodes met trajecten\n`);
  return routes;
}

function formatStation(s) {
  return `  { id: ${JSON.stringify(s.id)}, code: ${JSON.stringify(s.code)}, name: ${JSON.stringify(s.name)}, lat: ${s.lat}, lng: ${s.lng}, province: ${JSON.stringify(s.province)}, traject: ${JSON.stringify(s.traject)} }`;
}

const gemeenten = await loadGemeenten();
const routeMap = await loadRouteMap();
const nsKey = await loadEnvKey();

const stations = [];
const usedIds = new Set();

if (nsKey) {
  process.stdout.write('Stations laden via NS API…\n');
  const nsStations = await fetchNsStations(nsKey);
  for (const s of nsStations) {
    const name = s.namen.lang.trim();
    const code = (s.code ?? '').toUpperCase();
    let id = slugify(name);
    if (usedIds.has(id)) id = `${id}-${code.toLowerCase()}`;
    usedIds.add(id);
    const lat = s.lat;
    const lng = s.lng;
    const traject = pickBestRoute(routeMap.get(code)) ?? 'Onbekend traject';
    stations.push({
      id,
      code,
      name,
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      province: findProvince(lat, lng, gemeenten),
      traject,
    });
  }
} else {
  process.stdout.write(
    'Waarschuwing: NS_API_SUBSCRIPTION_KEY ontbreekt, fallback naar ProRail PDOK.\n',
  );
  const features = await fetchProRailStations();
  for (const f of features) {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const name = p.naam.trim();
    let id = slugify(name);
    if (usedIds.has(id)) id = `${id}-${(p.afkorting ?? 'st').toLowerCase()}`;
    usedIds.add(id);
    const code = (p.afkorting ?? '').toUpperCase();
    const traject =
      pickBestRoute(routeMap.get(code)) ?? cleanKmlint(p.kmlint_omschrijving) ?? 'Onbekend traject';
    stations.push({
      id,
      code: p.afkorting ?? '',
      name,
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      province: findProvince(lat, lng, gemeenten),
      traject,
    });
  }
}

stations.sort((a, b) => a.name.localeCompare(b.name, 'nl'));

const unknownTraject = stations.filter((s) => s.traject === 'Onbekend traject');
if (unknownTraject.length) {
  process.stdout.write(`Waarschuwing: ${unknownTraject.length} stations zonder traject\n`);
}

const stationSource = nsKey ? 'NS Reisinformatie API' : 'ProRail (PDOK)';
const file = `/**
 * Nederlandse treinstations: dataset voor Stationdle & Overstaple
 * NL: ${stations.length} stations, bron: ${stationSource} + trajecten Rijden de Treinen.
 * EN: Dutch railway stations with province and passenger route hints.
 * @see https://apiportal.ns.nl/
 * @see https://www.rijdendetreinen.nl/open-data
 */

export interface Station {
  id: string;
  /** NS/ProRail-stationcode */
  code: string;
  name: string;
  lat: number;
  lng: number;
  province: string;
  /** NL: Passagierstraject als hint / EN: Passenger route hint */
  traject: string;
}

export type StationPublic = Pick<Station, 'id' | 'name' | 'province'>;

export function toPublicStation(s: Station): StationPublic {
  return { id: s.id, name: s.name, province: s.province };
}

export const STATIONS: Station[] = [
${stations.map(formatStation).join(',\n')}
];

export function findStationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

export function findStationByName(name: string): Station | undefined {
  const q = name.trim().toLowerCase();
  return STATIONS.find((s) => s.name.toLowerCase() === q);
}

export function getPublicStationsList(): StationPublic[] {
  return STATIONS.map(toPublicStation);
}
`;

await writeFile(new URL('../src/data/stations.ts', import.meta.url), file, 'utf-8');
console.log(`Klaar: ${stations.length} stations geschreven naar src/data/stations.ts`);
