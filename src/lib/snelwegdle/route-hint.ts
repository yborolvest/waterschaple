import { NL_MAP_BOUNDS } from '../../data/nl-map';
import { buildNlProvincesSvg, getDefaultMapSize, projectLatLng } from '../map/nl-basemap';
import type { SnelwegPath } from '../../data/snelweg-geometries';

export interface RouteHintSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  strokeWidth?: number;
}

function toPolylinePoints(
  path: SnelwegPath[],
  width: number,
  height: number,
  padding: number,
): string {
  const proj = { width, height, padding, bounds: NL_MAP_BOUNDS };
  return path
    .map(([lat, lng]) => {
      const [x, y] = projectLatLng(lat, lng, proj);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Genereer SVG-string met provinciekaart en snelwegroute / EN: SVG with province map + route */
export function buildRouteHintSvg(path: SnelwegPath[], options: RouteHintSvgOptions = {}): string {
  const defaults = getDefaultMapSize(200);
  const {
    width = defaults.width,
    height = defaults.height,
    padding = 14,
    stroke = '#EAB308',
    strokeWidth = 4,
  } = options;

  const proj = { width, height, padding, bounds: NL_MAP_BOUNDS };
  const basemap = buildNlProvincesSvg(proj);
  const routePts = toPolylinePoints(path, width, height, padding);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-hidden="true">
  <rect width="${width}" height="${height}" fill="#0f2840" rx="8"/>
  ${basemap}
  <polyline points="${routePts}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Teken routeschets in een container-element */
export function renderRouteHint(container: HTMLElement, path: SnelwegPath[]): void {
  container.innerHTML = buildRouteHintSvg(path);
}
