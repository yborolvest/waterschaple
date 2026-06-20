/** NL: Type + optionele OSM-export (npm run generate:snelweg-geometries) */
/** EN: Type + optional OSM export from generate script */

export type SnelwegPath = [lat: number, lng: number];

/**
 * Alleen gevuld na `npm run generate:snelweg-geometries`.
 * Tot die tijd gebruikt snelwegen.ts waypoint-routes uit snelweg-route-paths.ts.
 */
export const SNELWEG_GEOMETRIES_IS_OSM = false;

export const SNELWEG_GEOMETRIES: Record<string, SnelwegPath[]> = {};

export function getSnelwegGeometry(id: string): SnelwegPath[] | null {
  const path = SNELWEG_GEOMETRIES[id];
  return path?.length ? path : null;
}
