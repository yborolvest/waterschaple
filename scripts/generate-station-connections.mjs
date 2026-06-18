/**
 * Genereert stationverbindingen + dagelijkse Overstaple-puzzels uit dienstregeling.
 * NL: Volledige treingraaf — Sprinters tellen mee; kortste pad = minste tussenstops.
 * EN: Full train graph; shortest path = fewest intermediate stops.
 *
 * Bron: https://blobs.duckdb.org/nl-railway/services-2025-03.csv.gz
 */

import { readFile, writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';

const SERVICES_URL = 'https://blobs.duckdb.org/nl-railway/services-2025-03.csv.gz';
const MIN_HOPS = 4;
const MAX_HOPS = 9;
const PUZZLE_YEARS = 12;

/** NL: Lange-afstand + internationaal / EN: Long-distance and international services */
const EXPRESS_TYPES = new Set([
  'Intercity',
  'Intercity direct',
  'Sneltrein',
  'EuroCity',
  'Eurocity Direct',
  'Eurostar',
  'ICE International',
  'Nightjet',
  'European Sleeper',
  'Nachttrein',
]);

const LOCAL_TYPES = new Set(['Sprinter', 'Stoptrein']);

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

async function loadStations() {
  const src = await readFile(new URL('../src/data/stations.ts', import.meta.url), 'utf8');
  const re =
    /\{\s*id:\s*"([^"]+)",\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)",/g;
  const byCode = new Map();
  const list = [];
  let m;
  while ((m = re.exec(src))) {
    const station = { id: m[1], code: m[2].toUpperCase(), name: m[3] };
    byCode.set(station.code, station);
    list.push(station);
  }
  if (!list.length) throw new Error('Kon stations niet parsen');
  return { byCode, list };
}

async function loadServices() {
  process.stdout.write('Dienstregeling laden…\n');
  const res = await fetch(SERVICES_URL);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const text = zlib.gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
  return text.split('\n');
}

function buildGraph(lines, byCode, mode) {
  const neighbors = new Map();

  function addEdge(a, b) {
    if (a === b) return;
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a).add(b);
    neighbors.get(b).add(a);
  }

  let svcId = null;
  let svcType = null;
  let stops = [];

  function flush() {
    const useService =
      mode === 'express'
        ? EXPRESS_TYPES.has(svcType)
        : mode === 'local'
          ? LOCAL_TYPES.has(svcType)
          : EXPRESS_TYPES.has(svcType) || LOCAL_TYPES.has(svcType);
    if (!useService) return;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = byCode.get(stops[i]);
      const b = byCode.get(stops[i + 1]);
      if (a && b) addEdge(a.id, b.id);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = parseCsvLine(lines[i]);
    const id = cols[0];
    if (id !== svcId) {
      flush();
      svcId = id;
      svcType = cols[2] ?? '';
      stops = [];
    }
    const code = (cols[9] ?? '').toUpperCase();
    if (!code) continue;
    if (!stops.length || stops[stops.length - 1] !== code) stops.push(code);
  }
  flush();

  const graph = {};
  for (const [id, set] of neighbors) {
    graph[id] = [...set].sort();
  }
  return graph;
}

function sortedNeighbors(graph, stationId) {
  return [...(graph[stationId] ?? [])].sort();
}

function bfsDistances(graph, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(cur);
    for (const n of sortedNeighbors(graph, cur)) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Eén kortste pad — min. tussenstops, deterministische tie-break */
function findShortestPathIds(graph, start, end) {
  const parent = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === end) break;
    for (const n of sortedNeighbors(graph, cur)) {
      if (parent.has(n)) continue;
      parent.set(n, cur);
      queue.push(n);
    }
  }
  if (!parent.has(end)) return null;
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(cur);
  }
  return path;
}

function routeFromPath(path) {
  if (!path || path.length - 1 < MIN_HOPS) return null;
  const intermediate = path.slice(1, -1);
  if (!intermediate.length) return null;
  return { hops: path.length - 1, intermediate, path };
}

function hash32(n) {
  let x = n | 0;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = (x >>> 16) ^ x;
  return x >>> 0;
}

function buildPuzzles(graph, stations) {
  const puzzles = [];
  const totalDays = PUZZLE_YEARS * 366;
  const ids = stations.map((s) => s.id).filter((id) => graph[id]?.length);

  for (let day = 0; day < totalDays; day++) {
    const startIdx = hash32(day) % ids.length;
    const start = ids[startIdx];
    const dists = bfsDistances(graph, start);
    const candidates = [];

    for (const [end, hops] of dists) {
      if (end === start) continue;
      if (hops < MIN_HOPS || hops > MAX_HOPS) continue;
      const path = findShortestPathIds(graph, start, end);
      const route = path ? routeFromPath(path) : null;
      if (!route || route.intermediate.length < 2) continue;
      candidates.push({ end, hops: route.hops, intermediate: route.intermediate, path: route.path });
    }

    if (!candidates.length) {
      puzzles.push(null);
      continue;
    }

    candidates.sort((a, b) => a.hops - b.hops || a.end.localeCompare(b.end));
    const pick = candidates[hash32(day + 7919) % candidates.length];
    puzzles.push({
      start,
      end: pick.end,
      intermediate: pick.intermediate,
      path: pick.path,
      hops: pick.hops,
    });
  }

  const valid = puzzles.filter(Boolean);
  if (valid.length < 365) throw new Error(`Te weinig puzzels: ${valid.length}`);
  process.stdout.write(`  ${valid.length} puzzels gegenereerd\n`);
  return puzzles;
}

const { byCode, list: stations } = await loadStations();
const lines = await loadServices();
const expressGraph = buildGraph(lines, byCode, 'express');
const localGraph = buildGraph(lines, byCode, 'local');
const fullGraph = buildGraph(lines, byCode, 'all');
process.stdout.write(`  ${Object.keys(fullGraph).length} stations in treingraaf\n`);
process.stdout.write(`  ${Object.keys(expressGraph).length} stations in express-graaf\n`);
process.stdout.write(`  ${Object.keys(localGraph).length} stations in sprinter-graaf\n`);

const puzzles = buildPuzzles(fullGraph, stations);

const file = `/**
 * Stationverbindingen en Overstaple-puzzels
 * NL: Volledige treingraaf voor kortste pad; express/sprinter apart voor referentie.
 * EN: Full train graph for puzzles; express/local graphs stored separately.
 * @generated scripts/generate-station-connections.mjs
 */

/**
 * NL: Buren via alle treintypes (IC, Sprinter, internationaal) — kortste pad = minste tussenstops.
 * EN: Neighbors via all scheduled train services.
 */
export const STATION_NEIGHBORS: Record<string, string[]> = ${JSON.stringify(fullGraph, null, 2)};

/** NL: Alleen IC/sneltrein/internationaal / EN: Long-distance services only */
export const STATION_NEIGHBORS_EXPRESS: Record<string, string[]> = ${JSON.stringify(expressGraph, null, 2)};

/** NL: Alleen Sprinter/Stoptrein / EN: Local train edges only */
export const STATION_NEIGHBORS_LOCAL: Record<string, string[]> = ${JSON.stringify(localGraph, null, 2)};

export interface OverstaplePuzzleDef {
  start: string;
  end: string;
  /** Tussenstations op het kortste pad (excl. start/eind) */
  intermediate: string[];
  /** Geordend kortste pad incl. start/eind */
  path: string[];
  hops: number;
}

/** NL: Puzzel per dag-index (epoch) / EN: Puzzle per day index */
export const OVERSTAPLE_PUZZLES: (OverstaplePuzzleDef | null)[] = ${JSON.stringify(puzzles, null, 2)};
`;

await writeFile(new URL('../src/data/station-connections.ts', import.meta.url), file, 'utf8');
console.log('Klaar: src/data/station-connections.ts');
