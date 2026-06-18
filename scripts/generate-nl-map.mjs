/**
 * Genereert src/data/nl-map.ts uit CBS-provinciegrenzen (cartomap/PDOK).
 * NL: WGS84-provincies met interne grenzen.
 * EN: Dutch province boundaries for SVG basemap.
 *
 * Bron: https://cartomap.github.io/nl/wgs84/provincie_2020.geojson
 */

import { writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://cartomap.github.io/nl/wgs84/provincie_2020.geojson';

function round4(n) {
  return +n.toFixed(4);
}

function ringsFromGeometry(geometry) {
  const polygons = [];
  if (geometry.type === 'Polygon') {
    polygons.push(
      geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [round4(lat), round4(lng)])),
    );
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      polygons.push(poly.map((ring) => ring.map(([lng, lat]) => [round4(lat), round4(lng)])));
    }
  }
  return polygons;
}

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Download ${res.status}`);
const geo = await res.json();

const provinces = geo.features.map((f) => ({
  name: f.properties.statnaam,
  code: f.properties.statcode,
  polygons: ringsFromGeometry(f.geometry),
}));

let minLat = Infinity;
let maxLat = -Infinity;
let minLng = Infinity;
let maxLng = -Infinity;

for (const p of provinces) {
  for (const poly of p.polygons) {
    for (const ring of poly) {
      for (const [lat, lng] of ring) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }
  }
}

const file = `/**
 * Nederland — provinciegrenzen (CBS 2020, gesimplificeerd)
 * NL: gegenereerd uit cartomap/PDOK WGS84-data.
 * EN: Dutch province boundaries for map backgrounds.
 * @generated scripts/generate-nl-map.mjs
 * @see https://cartomap.github.io/nl/wgs84/provincie_2020.geojson
 */

/** Ring = array van [lat, lng] punten */
export type MapRing = [lat: number, lng: number][];

/** Polygon = buitenring + optionele gaten */
export type MapPolygonRings = MapRing[];

export interface NlProvinceMap {
  name: string;
  code: string;
  /** Hoofdland + eilanden per provincie */
  polygons: MapPolygonRings[];
}

export const NL_MAP_BOUNDS = {
  minLat: ${minLat},
  maxLat: ${maxLat},
  minLng: ${minLng},
  maxLng: ${maxLng},
} as const;

export const NL_PROVINCES: NlProvinceMap[] = ${JSON.stringify(provinces, null, 2)};
`;

await writeFile(new URL('../src/data/nl-map.ts', import.meta.url), file, 'utf8');
console.log(`Klaar: ${provinces.length} provincies → src/data/nl-map.ts`);
