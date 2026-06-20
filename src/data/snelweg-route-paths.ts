/** NL: Routeschetsen uit steden langs de weg / EN: Route sketch paths from cities along each motorway */

export type SnelwegPath = [lat: number, lng: number];

/** Bekende punten [lat, lng] / Known place coordinates */
const CITY_COORDS: Record<string, SnelwegPath> = {
  Amsterdam: [52.3676, 4.9041],
  Oldenzaal: [52.459, 6.892],
  Maastricht: [50.8514, 5.691],
  Antwerpen: [51.2194, 4.4025],
  Hoofddorp: [52.303, 4.689],
  Badhoevedorp: [52.338, 4.787],
  Joure: [52.968, 5.798],
  Zaandam: [52.438, 4.826],
  'Bad Nieuweschans': [53.184, 7.199],
  Zaanstad: [52.453, 4.829],
  Alkmaar: [52.632, 4.748],
  'Den Haag': [52.0705, 4.3007],
  Arnhem: [51.9851, 5.8987],
  Rotterdam: [51.9225, 4.4792],
  Nijmegen: [51.8426, 5.8528],
  Dordrecht: [51.813, 4.673],
  Moerdijk: [51.702, 4.622],
  Doetinchem: [51.965, 6.296],
  Varsseveld: [51.943, 6.458],
  Gouda: [52.017, 4.708],
  Breda: [51.5719, 4.7683],
  Almere: [52.3508, 5.2647],
  Utrecht: [52.0907, 5.1214],
  Groningen: [53.2194, 6.5665],
  'Bergen op Zoom': [51.494, 4.287],
  Barneveld: [52.14, 5.585],
  Ede: [52.041, 5.658],
  Leeuwarden: [53.2012, 5.7999],
  Franeker: [53.185, 5.541],
  Meppel: [52.696, 6.194],
  Enschede: [52.2215, 6.8937],
  Zwolle: [52.5168, 6.083],
  Eindhoven: [51.4416, 5.4697],
  Oss: [51.765, 5.518],
  "'s-Hertogenbosch": [51.6978, 5.3037],
  Tilburg: [51.5555, 5.0913],
  Venlo: [51.37, 6.168],
  Heerlen: [50.888, 5.979],
  Duitsland: [50.998, 6.12],
  Amersfoort: [52.156, 5.387],
  Deventer: [52.255, 6.163],
  Leiden: [52.16, 4.493],
  Lelystad: [52.518, 5.471],
  Hoorn: [52.642, 5.059],
  Heerenveen: [52.959, 5.918],
  Gorinchem: [51.829, 4.974],
  Tiel: [51.886, 5.429],
  Roosendaal: [51.531, 4.465],
  Rijswijk: [52.036, 4.325],
  Spijkenisse: [51.845, 4.329],
  Hengelo: [52.266, 6.793],
  Emmeloord: [52.708, 5.748],
  Haarlem: [52.387, 4.646],
};

/**
 * Tussenstops langs de echte route (niet alleen eindpunten).
 * EN: Intermediate stops along the real corridor, not just endpoints.
 */
const ROUTE_WAYPOINTS: Record<string, string[]> = {
  a1: ['Amsterdam', 'Amersfoort', 'Deventer', 'Oldenzaal'],
  a2: ['Amsterdam', 'Utrecht', "'s-Hertogenbosch", 'Eindhoven', 'Maastricht'],
  a4: ['Amsterdam', 'Leiden', 'Den Haag', 'Rotterdam', 'Roosendaal', 'Antwerpen'],
  a5: ['Hoofddorp', 'Badhoevedorp'],
  a6: ['Amsterdam', 'Almere', 'Lelystad', 'Emmeloord', 'Joure'],
  a7: ['Zaandam', 'Hoorn', 'Heerenveen', 'Groningen', 'Bad Nieuweschans'],
  a8: ['Amsterdam', 'Zaanstad'],
  a9: ['Amsterdam', 'Haarlem', 'Alkmaar'],
  a12: ['Den Haag', 'Gouda', 'Utrecht', 'Arnhem'],
  a13: ['Den Haag', 'Rijswijk', 'Rotterdam'],
  a15: ['Rotterdam', 'Gorinchem', 'Tiel', 'Nijmegen'],
  a16: ['Rotterdam', 'Dordrecht', 'Breda', 'Antwerpen'],
  a17: ['Dordrecht', 'Moerdijk'],
  a18: ['Doetinchem', 'Varsseveld'],
  a20: ['Gouda', 'Rotterdam'],
  a27: ['Breda', 'Gorinchem', 'Utrecht', 'Almere'],
  a28: ['Utrecht', 'Amersfoort', 'Zwolle', 'Groningen'],
  a29: ['Rotterdam', 'Spijkenisse', 'Bergen op Zoom'],
  a30: ['Barneveld', 'Ede'],
  a31: ['Leeuwarden', 'Franeker'],
  a32: ['Meppel', 'Heerenveen', 'Leeuwarden'],
  a35: ['Enschede', 'Hengelo', 'Zwolle'],
  a50: ['Eindhoven', 'Oss', 'Nijmegen'],
  a58: ['Eindhoven', 'Tilburg', 'Breda', 'Roosendaal', 'Bergen op Zoom'],
  a59: ['Oss', "'s-Hertogenbosch"],
  a65: ['Tilburg', "'s-Hertogenbosch"],
  a67: ['Eindhoven', 'Venlo'],
  a73: ['Nijmegen', 'Venlo', 'Maastricht'],
  a76: ['Heerlen', 'Duitsland'],
  a79: ['Heerlen', 'Maastricht'],
};

/** Ring en andere vormen die niet uit eindpunten volgen / Ring roads and special shapes */
const PATH_OVERRIDES: Record<string, SnelwegPath[]> = {
  a10: [
    [52.4, 4.75],
    [52.42, 4.85],
    [52.43, 4.95],
    [52.42, 5.05],
    [52.38, 5.1],
    [52.32, 5.08],
    [52.28, 5.0],
    [52.28, 4.9],
    [52.32, 4.82],
    [52.36, 4.76],
  ],
};

function resolveCities(id: string, route: string): string[] {
  if (ROUTE_WAYPOINTS[id]) return ROUTE_WAYPOINTS[id];
  if (id === 'a10') return [];
  return route.split(/\s*[–—-]\s*/).map((s) => s.trim()).filter(Boolean);
}

function densifyPath(waypoints: SnelwegPath[], pointsPerLeg = 4): SnelwegPath[] {
  if (waypoints.length < 2) return waypoints;
  const out: SnelwegPath[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];
    for (let j = 0; j < pointsPerLeg; j++) {
      const t = j / pointsPerLeg;
      out.push([
        Math.round((lat1 + (lat2 - lat1) * t) * 10000) / 10000,
        Math.round((lng1 + (lng2 - lng1) * t) * 10000) / 10000,
      ]);
    }
  }
  const last = waypoints[waypoints.length - 1];
  out.push([Math.round(last[0] * 10000) / 10000, Math.round(last[1] * 10000) / 10000]);
  return out;
}

/** Bouw routepunten voor hint-kaart / Build route points for the hint map */
export function buildSnelwegPath(id: string, route: string): SnelwegPath[] {
  if (PATH_OVERRIDES[id]) return PATH_OVERRIDES[id];

  const cities = resolveCities(id, route);
  const waypoints = cities
    .map((city) => CITY_COORDS[city])
    .filter((p): p is SnelwegPath => p !== undefined);

  if (waypoints.length < 2) return [];
  return densifyPath(waypoints);
}
