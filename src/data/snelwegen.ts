import { buildSnelwegPath, type SnelwegPath } from './snelweg-route-paths';
import { SNELWEG_GEOMETRIES, SNELWEG_GEOMETRIES_IS_OSM } from './snelweg-geometries';
import { haversineDistance } from '../lib/game-logic';

export type { SnelwegPath };

function resolveSnelwegPath(id: string, route: string): SnelwegPath[] {
  if (SNELWEG_GEOMETRIES_IS_OSM) {
    const osm = SNELWEG_GEOMETRIES[id];
    if (osm?.length >= 2) return osm;
  }
  return buildSnelwegPath(id, route);
}

export interface Snelweg {
  id: string;
  name: string;
  /** NL: Routebeschrijving / EN: Route description */
  route: string;
  lat: number;
  lng: number;
  /** Routepunten voor hint-kaart (zelfde bron als geo-middelpunt) */
  path: SnelwegPath[];
  /** Geschatte lengte in km (afgeleid van routepunten) */
  lengthKm: number;
}

function pathCentroid(path: SnelwegPath[]): { lat: number; lng: number } {
  const n = path.length;
  if (!n) return { lat: 52.1, lng: 5.3 };
  return {
    lat: path.reduce((s, p) => s + p[0], 0) / n,
    lng: path.reduce((s, p) => s + p[1], 0) / n,
  };
}

/** NL: Som van segmenten langs routepunten / EN: Path length from route points */
export function pathLengthKm(path: SnelwegPath[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  }
  return Math.round(total);
}

const SNELWEG_META: { id: string; name: string; route: string }[] = [
  { id: 'a1', name: 'A1', route: 'Amsterdam – Oldenzaal' },
  { id: 'a2', name: 'A2', route: 'Amsterdam – Maastricht' },
  { id: 'a4', name: 'A4', route: 'Amsterdam – Antwerpen' },
  { id: 'a5', name: 'A5', route: 'Hoofddorp – Badhoevedorp' },
  { id: 'a6', name: 'A6', route: 'Amsterdam – Joure' },
  { id: 'a7', name: 'A7', route: 'Zaandam – Bad Nieuweschans' },
  { id: 'a8', name: 'A8', route: 'Amsterdam – Zaanstad' },
  { id: 'a9', name: 'A9', route: 'Amsterdam – Alkmaar' },
  { id: 'a10', name: 'A10', route: 'Ring Amsterdam' },
  { id: 'a12', name: 'A12', route: 'Den Haag – Arnhem' },
  { id: 'a13', name: 'A13', route: 'Den Haag – Rotterdam' },
  { id: 'a15', name: 'A15', route: 'Rotterdam – Nijmegen' },
  { id: 'a16', name: 'A16', route: 'Rotterdam – Antwerpen' },
  { id: 'a17', name: 'A17', route: 'Dordrecht – Moerdijk' },
  { id: 'a18', name: 'A18', route: 'Doetinchem – Varsseveld' },
  { id: 'a20', name: 'A20', route: 'Gouda – Rotterdam' },
  { id: 'a27', name: 'A27', route: 'Breda – Almere' },
  { id: 'a28', name: 'A28', route: 'Utrecht – Groningen' },
  { id: 'a29', name: 'A29', route: 'Rotterdam – Bergen op Zoom' },
  { id: 'a30', name: 'A30', route: 'Barneveld – Ede' },
  { id: 'a31', name: 'A31', route: 'Leeuwarden – Franeker' },
  { id: 'a32', name: 'A32', route: 'Meppel – Leeuwarden' },
  { id: 'a35', name: 'A35', route: 'Enschede – Zwolle' },
  { id: 'a50', name: 'A50', route: 'Eindhoven – Nijmegen' },
  { id: 'a58', name: 'A58', route: 'Eindhoven – Bergen op Zoom' },
  { id: 'a59', name: 'A59', route: "Oss – 's-Hertogenbosch" },
  { id: 'a65', name: 'A65', route: "Tilburg – 's-Hertogenbosch" },
  { id: 'a67', name: 'A67', route: 'Eindhoven – Venlo' },
  { id: 'a73', name: 'A73', route: 'Nijmegen – Maastricht' },
  { id: 'a76', name: 'A76', route: 'Heerlen – Duitsland' },
  { id: 'a79', name: 'A79', route: 'Heerlen – Maastricht' },
];

/** Nederlandse rijksautosnelwegen — geo-middelpunt afgeleid van routepunten */
export const SNELWEGEN: Snelweg[] = SNELWEG_META.map((meta) => {
  const path = resolveSnelwegPath(meta.id, meta.route);
  const { lat, lng } = pathCentroid(path);
  const lengthKm = pathLengthKm(path);
  return { ...meta, path, lat, lng, lengthKm };
});

export function findSnelwegById(id: string): Snelweg | undefined {
  return SNELWEGEN.find((s) => s.id === id);
}

export function findSnelwegByName(name: string): Snelweg | undefined {
  const normalized = name.trim().toUpperCase();
  return SNELWEGEN.find((s) => s.name.toUpperCase() === normalized);
}

export function getSnelwegPath(id: string): SnelwegPath[] | null {
  const path = findSnelwegById(id)?.path;
  return path?.length ? path : null;
}

/** Sorteer op wegnummer (A1, A2, … A10) */
export function sortSnelwegen(roads: Snelweg[]): Snelweg[] {
  return [...roads].sort((a, b) => {
    const numA = parseInt(a.name.slice(1), 10);
    const numB = parseInt(b.name.slice(1), 10);
    return numA - numB;
  });
}
