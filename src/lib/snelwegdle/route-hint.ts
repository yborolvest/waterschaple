import type { SnelwegPath } from '../../data/snelweg-geometries';
import {
  buildNlProvincesSvg,
  computeBoundsFromPoints,
  getDefaultMapSize,
  projectLatLng,
  type MapProjectionOptions,
} from '../map/nl-basemap';

/** Zelfde kaartgrootte als Overstaple / EN: Same map size as Overstaple */
const MAP_HEIGHT = 260;
const MAP_PADDING = 20;

export interface RouteHintSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  strokeWidth?: number;
}

function routeProjectionOptions(
  path: SnelwegPath[],
  options: RouteHintSvgOptions,
): MapProjectionOptions {
  const points = path.map(([lat, lng]) => ({ lat, lng }));
  const bounds = computeBoundsFromPoints(points);
  const defaults = getDefaultMapSize(MAP_HEIGHT, bounds);
  const { width = defaults.width, height = defaults.height, padding = MAP_PADDING } = options;
  return { width, height, padding, bounds };
}

/** Genereer SVG-string met provinciekaart en snelwegroute / EN: SVG with province map + route */
export function buildRouteHintSvg(path: SnelwegPath[], options: RouteHintSvgOptions = {}): string {
  const proj = routeProjectionOptions(path, options);
  const { width, height } = proj;
  const stroke = options.stroke ?? '#EAB308';
  const strokeWidth = options.strokeWidth ?? 4;
  const basemap = buildNlProvincesSvg(proj);

  const routePts = path
    .map(([lat, lng]) => {
      const [x, y] = projectLatLng(lat, lng, proj);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-hidden="true">
  <rect width="${width}" height="${height}" fill="#0f2840" rx="8"/>
  ${basemap}
  <polyline points="${routePts}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Teken routeschets in een container-element (zoom + aspect ratio zoals Overstaple) */
export function renderRouteHint(container: HTMLElement, path: SnelwegPath[]): void {
  const points = path.map(([lat, lng]) => ({ lat, lng }));
  const bounds = computeBoundsFromPoints(points);
  const { width, height } = getDefaultMapSize(MAP_HEIGHT, bounds);
  container.style.aspectRatio = `${width} / ${height}`;
  container.innerHTML = buildRouteHintSvg(path, { width, height });
}
