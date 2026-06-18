import { NL_MAP_BOUNDS, NL_PROVINCES, type MapRing } from '../../data/nl-map';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapProjectionOptions {
  width: number;
  height: number;
  padding: number;
  bounds?: MapBounds;
}

interface MapLayout {
  bounds: MapBounds;
  offsetX: number;
  offsetY: number;
  scale: number;
  lngScale: number;
}

/** Zoom-bounds rond punten met padding / EN: Fit bounds around points */
export function computeBoundsFromPoints(
  points: { lat: number; lng: number }[],
  {
    paddingRatio = 0.22,
    minSpanLat = 0.28,
    minSpanLng = 0.38,
    clip = NL_MAP_BOUNDS,
  }: {
    paddingRatio?: number;
    minSpanLat?: number;
    minSpanLng?: number;
    clip?: MapBounds;
  } = {},
): MapBounds {
  if (!points.length) return { ...clip };

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const padLat = Math.max(latSpan * paddingRatio, 0.06);
  const padLng = Math.max(lngSpan * paddingRatio, 0.08);

  let bounds: MapBounds = {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };

  const expandSpan = (min: number, max: number, minSpan: number): [number, number] => {
    const span = max - min;
    if (span >= minSpan) return [min, max];
    const c = (min + max) / 2;
    return [c - minSpan / 2, c + minSpan / 2];
  };

  [bounds.minLat, bounds.maxLat] = expandSpan(bounds.minLat, bounds.maxLat, minSpanLat);
  [bounds.minLng, bounds.maxLng] = expandSpan(bounds.minLng, bounds.maxLng, minSpanLng);

  bounds = {
    minLat: Math.max(bounds.minLat, clip.minLat),
    maxLat: Math.min(bounds.maxLat, clip.maxLat),
    minLng: Math.max(bounds.minLng, clip.minLng),
    maxLng: Math.min(bounds.maxLng, clip.maxLng),
  };

  return bounds;
}

/** NL: Geo-verhouding (lng gecorrigeerd voor breedtegraad) / EN: Geographic aspect ratio W/H */
export function getNlMapAspectRatio(bounds: MapBounds = NL_MAP_BOUNDS): number {
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const lngScale = Math.cos((centerLat * Math.PI) / 180);
  return (lngSpan * lngScale) / latSpan;
}

/** Standaard SVG-afmetingen met correcte verhouding / EN: Default SVG size preserving aspect */
export function getDefaultMapSize(height = 260, bounds: MapBounds = NL_MAP_BOUNDS): { width: number; height: number } {
  const aspect = getNlMapAspectRatio(bounds);
  return { width: Math.round(height * aspect), height };
}

function computeLayout({
  width,
  height,
  padding,
  bounds = NL_MAP_BOUNDS,
}: MapProjectionOptions): MapLayout {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const lngScale = Math.cos((centerLat * Math.PI) / 180);
  const geoW = lngSpan * lngScale;
  const geoH = latSpan;
  const scale = Math.min(innerW / geoW, innerH / geoH);
  const mapW = geoW * scale;
  const mapH = geoH * scale;

  return {
    bounds,
    scale,
    lngScale,
    offsetX: padding + (innerW - mapW) / 2,
    offsetY: padding + (innerH - mapH) / 2,
  };
}

function project(
  lat: number,
  lng: number,
  opts: MapProjectionOptions,
  layout = computeLayout(opts),
): [number, number] {
  const { bounds, scale, lngScale, offsetX, offsetY } = layout;
  const x = offsetX + (lng - bounds.minLng) * lngScale * scale;
  const y = offsetY + (bounds.maxLat - lat) * scale;
  return [x, y];
}

function ringToPath(ring: MapRing, opts: MapProjectionOptions, layout: MapLayout): string {
  if (!ring.length) return '';
  const parts = ring.map(([lat, lng], i) => {
    const [x, y] = project(lat, lng, opts, layout);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `${parts.join(' ')} Z`;
}

function polygonToPath(rings: MapRing[], opts: MapProjectionOptions, layout: MapLayout): string {
  return rings.map((ring) => ringToPath(ring, opts, layout)).join(' ');
}

export interface NlBasemapSvgStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  provinceStroke?: string;
  provinceStrokeWidth?: number;
}

/** SVG-laag met provinciegrenzen / EN: SVG layer with province borders */
export function buildNlProvincesSvg(
  opts: MapProjectionOptions,
  style: NlBasemapSvgStyle = {},
): string {
  const {
    fill = 'rgba(255,255,255,0.04)',
    stroke = 'rgba(255,255,255,0.22)',
    strokeWidth = 0.9,
    provinceStroke = stroke,
    provinceStrokeWidth = strokeWidth,
  } = style;

  const layout = computeLayout(opts);

  return NL_PROVINCES.map((province) => {
    const d = province.polygons.map((poly) => polygonToPath(poly, opts, layout)).join(' ');
    return `<path d="${d}" fill="${fill}" stroke="${provinceStroke}" stroke-width="${provinceStrokeWidth}" stroke-linejoin="round" fill-rule="evenodd"/>`;
  }).join('\n  ');
}

export function projectLatLng(
  lat: number,
  lng: number,
  opts: MapProjectionOptions,
): [number, number] {
  return project(lat, lng, opts);
}
