/** NL: Overzicht van alle dagelijkse geo-spellen / EN: Daily games registry */

export type GameTheme = 'gemeente' | 'waterschap' | 'highway' | 'rail' | 'transfer';

export interface DailyGame {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  href: string;
  available: boolean;
  /** localStorage-sleutel voor voortgang / progress storage key */
  storageKey: string;
  theme: GameTheme;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  ctaClass: string;
}

export const DAILY_GAMES: DailyGame[] = [
  {
    id: 'gemeentedle',
    slug: 'gemeentedle',
    name: 'Gemeentedle',
    emoji: '🏛️',
    tagline: 'Voor de lokaal bestuur liefhebbers',
    description:
      'Vind de juiste Nederlandse gemeente in 6 pogingen.',
    href: '/gemeentedle',
    available: true,
    storageKey: 'gemeentedle_stats_v1',
    theme: 'gemeente',
    accentText: 'text-orange-light',
    accentBg: 'bg-orange-accent/15',
    accentBorder: 'border-orange-accent/35',
    ctaClass: 'bg-orange-accent hover:bg-orange-400 text-royal-950 shadow-orange-accent/30',
  },
  {
    id: 'waterschaple',
    slug: 'waterschaple',
    name: 'Waterschaple',
    emoji: '🌊',
    tagline: 'Spitter spetter spater',
    description:
      'Vind het juiste Nederlandse waterschap.',
    href: '/waterschaple',
    available: true,
    storageKey: 'waterschaple_stats_v1',
    theme: 'waterschap',
    accentText: 'text-teal-light',
    accentBg: 'bg-teal-accent/15',
    accentBorder: 'border-teal-accent/35',
    ctaClass: 'bg-teal-accent hover:bg-teal-400 text-royal-950 shadow-teal-accent/30',
  },
  {
    id: 'snelwegdle',
    slug: 'snelwegdle',
    name: 'Snelwegdle',
    emoji: '🛣️',
    tagline: 'Van A1 tot Z',
    description:
      'Vind de juiste Nederlandse rijksautosnelweg.',
    href: '/snelwegdle',
    available: true,
    storageKey: 'snelwegdle_stats_v1',
    theme: 'highway',
    accentText: 'text-highway-light',
    accentBg: 'bg-highway-accent/15',
    accentBorder: 'border-highway-accent/35',
    ctaClass: 'bg-highway-accent hover:bg-highway-400 text-royal-950 shadow-highway-accent/30',
  },
  {
    id: 'stationdle',
    slug: 'stationdle',
    name: 'Stationdle',
    emoji: '🚉',
    tagline: 'Waar brengt de trein ons heen?',
    description:
      'Raad het juiste Nederlandse treinstation.',
    href: '/stationdle',
    available: true,
    storageKey: 'stationdle_stats_v1',
    theme: 'rail',
    accentText: 'text-rail-light',
    accentBg: 'bg-rail-accent/15',
    accentBorder: 'border-rail-accent/35',
    ctaClass: 'bg-rail-accent hover:bg-rail-400 text-white shadow-rail-accent/30',
  },
  {
    id: 'overstaple',
    slug: 'overstaple',
    name: 'Overstaple',
    emoji: '🔄',
    tagline: 'Reis van station naar station',
    description:
      'Neem de meest efficiënte route tussen start en eind.',
    href: '/overstaple',
    available: true,
    storageKey: 'overstaple_stats_v1',
    theme: 'transfer',
    accentText: 'text-transfer-light',
    accentBg: 'bg-transfer-accent/15',
    accentBorder: 'border-transfer-accent/35',
    ctaClass: 'bg-transfer-accent hover:bg-transfer-400 text-white shadow-transfer-accent/30',
  },
];
