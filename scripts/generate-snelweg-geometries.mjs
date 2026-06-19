#!/usr/bin/env node
/**
 * Genereert vereenvoudigde snelweggeometrie uit OpenStreetMap (Overpass API).
 * NL: npm run generate:snelweg-geometries
 * EN: Fetches motorway ways per ref and writes simplified lat/lng paths.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/snelweg-geometries.ts');

/** Wegnummers in dezelfde volgorde als snelwegen.ts */
const ROAD_REFS = [
  'A1', 'A2', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A12', 'A13', 'A15', 'A16', 'A17', 'A18',
  'A20', 'A27', 'A28', 'A29', 'A30', 'A31', 'A32', 'A35', 'A50', 'A58', 'A59', 'A65', 'A67', 'A73',
  'A76', 'A79',
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_POINTS = 80;
const DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function simplify(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const out = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    out.push(points[idx]);
  }
  return out;
}

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Merge OSM ways into longest continuous chain by endpoint proximity */
function mergeWays(elements) {
  const segments = elements
    .filter((e) => e.type === 'way' && e.geometry?.length >= 2)
    .map((e) => e.geometry.map((g) => [g.lat, g.lon]));

  if (!segments.length) return [];

  const used = new Set();
  let best = [];

  for (let start = 0; start < segments.length; start++) {
    let chain = [...segments[start]];
    used.add(start);

    let extended = true;
    while (extended) {
      extended = false;
      const end = chain[chain.length - 1];
      const begin = chain[0];

      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        const seg = segments[i];
        const segStart = seg[0];
        const segEnd = seg[seg.length - 1];

        if (haversine(end, segStart) < 2) {
          chain = chain.concat(seg.slice(1));
          used.add(i);
          extended = true;
          break;
        }
        if (haversine(end, segEnd) < 2) {
          chain = chain.concat([...seg].reverse().slice(1));
          used.add(i);
          extended = true;
          break;
        }
        if (haversine(begin, segEnd) < 2) {
          chain = seg.slice(0, -1).concat(chain);
          used.add(i);
          extended = true;
          break;
        }
        if (haversine(begin, segStart) < 2) {
          chain = [...seg].reverse().slice(0, -1).concat(chain);
          used.add(i);
          extended = true;
          break;
        }
      }
    }

    if (chain.length > best.length) best = chain;
    used.clear();
  }

  return best;
}

async function fetchRoadGeometry(ref) {
  const query = `
    [out:json][timeout:90];
    area["ISO3166-1"="NL"]->.nl;
    way["highway"="motorway"]["ref"~"^${ref}$"](area.nl);
    out geom;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass ${ref}: HTTP ${res.status}`);
  const data = await res.json();
  const merged = mergeWays(data.elements ?? []);
  if (merged.length < 2) {
    console.warn(`  ⚠ ${ref}: onvoldoende punten (${merged.length})`);
    return null;
  }
  return simplify(merged, MAX_POINTS);
}

async function main() {
  const geometries = {};

  for (const ref of ROAD_REFS) {
    const id = ref.toLowerCase();
    process.stdout.write(`Ophalen ${ref}… `);
    try {
      const path = await fetchRoadGeometry(ref);
      if (path) {
        geometries[id] = path.map(([lat, lng]) => [
          Math.round(lat * 10000) / 10000,
          Math.round(lng * 10000) / 10000,
        ]);
        console.log(`✓ ${geometries[id].length} punten`);
      } else {
        console.log('overgeslagen');
      }
    } catch (e) {
      console.log(`fout: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const lines = Object.entries(geometries)
    .map(([id, path]) => {
      const pts = path.map(([lat, lng]) => `[${lat}, ${lng}]`).join(', ');
      return `  ${id}: [${pts}],`;
    })
    .join('\n');

  const content = `/** AUTO-GENERATED: npm run generate:snelweg-geometries */
/** NL: Vereenvoudigde routecoördinaten [lat, lng] per snelweg (bron: OpenStreetMap) */
/** EN: Simplified route coordinates per motorway from OSM Overpass */

export type SnelwegPath = [lat: number, lng: number];

export const SNELWEG_GEOMETRIES: Record<string, SnelwegPath[]> = {
${lines}
};

export function getSnelwegGeometry(id: string): SnelwegPath[] | null {
  return SNELWEG_GEOMETRIES[id] ?? null;
}
`;

  writeFileSync(OUT, content, 'utf8');
  console.log(`\nGeschreven: ${OUT} (${Object.keys(geometries).length} snelwegen)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
