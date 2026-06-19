/** NL: Site-brede SEO- en social metadata / EN: Site-wide SEO and social metadata */

import { DAILY_GAMES } from '../data/games';
import { BRAND_ASSETS } from './brand';

export const SITE_NAME = 'Rijkdle';
export const SITE_URL = 'https://rijkdle.nl';
export const SITE_LOCALE = 'nl_NL';
export const SITE_LANGUAGE = 'nl';
export const SITE_AUTHOR = 'Your Digital Agency';

export const DEFAULT_DESCRIPTION =
  'Speel dagelijkse Nederlandse geo-raadspellen op Rijkdle — Gemeentedle, Waterschaple, Snelwegdle, Stationdle en Overstaple.';

export const DEFAULT_OG_IMAGE = {
  url: '/logo@2x.png',
  width: BRAND_ASSETS.logo.light.width,
  height: BRAND_ASSETS.logo.light.height,
  alt: 'Rijkdle — dagelijkse Nederlandse geo-raadspellen',
} as const;

export const SITEMAP_PATHS = [
  '/',
  '/gemeentedle',
  '/waterschaple',
  '/snelwegdle',
  '/stationdle',
  '/overstaple',
  '/privacy',
] as const;

export type OgType = 'website' | 'article';

export interface PageSeo {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: OgType;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, SITE_URL).href;
}

export function formatPageTitle(title: string, options?: { includeBrand?: boolean }): string {
  const includeBrand = options?.includeBrand ?? true;
  if (!includeBrand || title === SITE_NAME) return title;
  return `${title} | ${SITE_NAME}`;
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: {
      '@type': 'Organization',
      name: SITE_AUTHOR,
      url: 'https://yourdigitalagency.nl',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(BRAND_ASSETS.logo.light.png2x),
      },
    },
  };
}

export function buildGameListJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITE_NAME} spellen`,
    itemListElement: DAILY_GAMES.filter((game) => game.available).map((game, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: game.name,
      url: absoluteUrl(game.href),
      description: game.description,
    })),
  };
}

export function buildGameJsonLd(gameId: string): Record<string, unknown> | undefined {
  const game = DAILY_GAMES.find((entry) => entry.id === gameId);
  if (!game) return undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: game.name,
    url: absoluteUrl(game.href),
    description: game.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    inLanguage: SITE_LANGUAGE,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  };
}

export function gamePageSeo(gameId: string): Pick<PageSeo, 'title' | 'description' | 'canonicalPath' | 'jsonLd'> {
  const game = DAILY_GAMES.find((entry) => entry.id === gameId);
  if (!game) {
    return {
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      canonicalPath: '/',
    };
  }

  const descriptions: Record<string, string> = {
    gemeentedle:
      'Raad de Nederlandse gemeente van vandaag in 10 pogingen. Dagelijks nieuw puzzel, hints via afstand en provincie — het Nederlandse geo-raadspel op Rijkdle.',
    waterschaple:
      'Raad het Nederlandse waterschap van vandaag. Dagelijks hetzelfde doelwit voor iedereen — test je kennis van waterschappen op Rijkdle.',
    snelwegdle:
      'Raad de Nederlandse rijksautosnelweg van vandaag. Van A1 tot A76 — het dagelijkse snelweg-raadspel op Rijkdle.',
    stationdle:
      'Raad het Nederlandse treinstation van vandaag. Dagelijks puzzel met hints — voor treinliefhebbers op Rijkdle.',
    overstaple:
      'Reis van station naar station en raad alle tussenstations op het kortste treinpad. Het dagelijkse NS-raadspel op Rijkdle.',
  };

  return {
    title: `${game.name} ${game.emoji}`,
    description: descriptions[game.id] ?? game.description,
    canonicalPath: game.href,
    jsonLd: buildGameJsonLd(game.id),
  };
}

export function resolvePageSeo(input: {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: OgType;
  noindex?: boolean;
  jsonLd?: PageSeo['jsonLd'];
  gameId?: string;
}): PageSeo {
  const gameDefaults = input.gameId ? gamePageSeo(input.gameId) : undefined;

  const title = input.title ?? gameDefaults?.title ?? SITE_NAME;
  const description = input.description ?? gameDefaults?.description ?? DEFAULT_DESCRIPTION;
  const canonicalPath = input.canonicalPath ?? gameDefaults?.canonicalPath ?? '/';
  const jsonLd = input.jsonLd ?? gameDefaults?.jsonLd;

  return {
    title,
    description,
    canonicalPath,
    ogImage: input.ogImage ?? DEFAULT_OG_IMAGE.url,
    ogImageAlt: input.ogImageAlt ?? DEFAULT_OG_IMAGE.alt,
    ogImageWidth: input.ogImageWidth ?? DEFAULT_OG_IMAGE.width,
    ogImageHeight: input.ogImageHeight ?? DEFAULT_OG_IMAGE.height,
    ogType: input.ogType ?? 'website',
    noindex: input.noindex ?? false,
    jsonLd,
  };
}

export function jsonLdScript(jsonLd: PageSeo['jsonLd']): string | undefined {
  if (!jsonLd) return undefined;
  const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return JSON.stringify(payload.length === 1 ? payload[0] : payload);
}
