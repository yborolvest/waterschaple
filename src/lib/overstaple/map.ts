import type { MapPoint, MapSegment, OverstapleMapData } from './logic';
import {
  buildNlProvincesSvg,
  computeBoundsFromPoints,
  getDefaultMapSize,
  projectLatLng,
  type MapProjectionOptions,
} from '../map/nl-basemap';

export interface OverstapleMapSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
}

function routeProjectionOptions(
  data: OverstapleMapData,
  options: OverstapleMapSvgOptions,
): MapProjectionOptions {
  const bounds = computeBoundsFromPoints([data.start, data.end, ...data.points]);
  const defaults = getDefaultMapSize(260, bounds);
  const { width = defaults.width, height = defaults.height, padding = 20 } = options;
  return { width, height, padding, bounds };
}

function segmentLine(seg: MapSegment, proj: MapProjectionOptions): string {
  const [x1, y1] = projectLatLng(seg.from.lat, seg.from.lng, proj);
  const [x2, y2] = projectLatLng(seg.to.lat, seg.to.lng, proj);
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#A78BFA" stroke-width="3" stroke-linecap="round"/>`;
}

function marker(point: MapPoint, proj: MapProjectionOptions): string {
  const [x, y] = projectLatLng(point.lat, point.lng, proj);

  let fill = '#C4B5FD';
  let stroke = '#EDE9FE';
  let r = 5;

  if (point.role === 'start') {
    fill = '#22C55E';
    stroke = '#BBF7D0';
    r = 7;
  } else if (point.role === 'end') {
    fill = '#8B5CF6';
    stroke = '#DDD6FE';
    r = 7;
  } else if (point.role === 'solution') {
    fill = '#F59E0B';
    stroke = '#FDE68A';
    r = 5;
  } else if (point.role === 'guess' && point.quality) {
    const guessColors = {
      connected: { fill: '#4ADE80', stroke: '#BBF7D0' },
      green: { fill: '#C4B5FD', stroke: '#EDE9FE' },
      orange: { fill: '#FB923C', stroke: '#FED7AA' },
      red: { fill: '#F87171', stroke: '#FECACA' },
    };
    const c = guessColors[point.quality];
    if (c) {
      fill = c.fill;
      stroke = c.stroke;
    }
  }

  const label = point.role === 'start' ? 'A' : point.role === 'end' ? 'B' : '';
  const labelSvg = label
    ? `<text x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#0A2540" font-size="8" font-weight="700">${label}</text>`
    : '';
  return `<g>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 2}" fill="${stroke}" opacity="0.9"/>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}"/>
    ${labelSvg}
  </g>`;
}

/** Genereer SVG met provinciekaart, spoorlijn en stations / EN: SVG map with provinces, route and markers */
export function buildOverstapleMapSvg(
  data: OverstapleMapData,
  options: OverstapleMapSvgOptions = {},
): string {
  const proj = routeProjectionOptions(data, options);
  const { width, height } = proj;
  const basemap = buildNlProvincesSvg(proj);
  const lines = data.segments.map((s) => segmentLine(s, proj)).join('\n  ');
  const markers = [
    ...data.points.map((p) => marker(p, proj)),
    marker(data.start, proj),
    marker(data.end, proj),
  ].join('\n  ');

  const title = `Route van ${data.start.name} naar ${data.end.name}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="${title}">
  <rect width="${width}" height="${height}" fill="#0f2840" rx="8"/>
  ${basemap}
  ${lines}
  ${markers}
</svg>`;
}

export function renderOverstapleMap(container: HTMLElement, data: OverstapleMapData): void {
  const bounds = computeBoundsFromPoints([data.start, data.end, ...data.points]);
  const { width, height } = getDefaultMapSize(260, bounds);
  container.style.aspectRatio = `${width} / ${height}`;
  container.innerHTML = buildOverstapleMapSvg(data, { width, height });
}
