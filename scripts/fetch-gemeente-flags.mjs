/**
 * Haalt gemeentevlag-URL's op via Wikidata (P41, fallback P154 wapen).
 * Output: src/data/gemeente-flags.ts
 */

import { readFile, writeFile } from 'node:fs/promises';

const GEMEENTEN_PATH = new URL('../src/data/gemeenten.ts', import.meta.url);

/** NL Wikipedia-paginatitel → gemeente-id (handmatig voor afwijkende titels) */
const WIKI_TITLE_OVERRIDES = {
  "'s-Gravenhage": 'Den_Haag',
  "'s-Hertogenbosch": "'s-Hertogenbosch",
  'Nuenen c.a.': 'Nuenen,_Gerwen_en_Nederwetten',
  Bergen: null, // dubbel — via provincie
};

const SPARQL = `
SELECT ?item ?itemLabel ?flag ?coat WHERE {
  ?item wdt:P31/wdt:P279* wd:Q2039348 .
  ?item wdt:P17 wd:Q55 .
  OPTIONAL { ?item wdt:P41 ?flag . }
  OPTIONAL { ?item wdt:P154 ?coat . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en" . }
}`;

function commonsPath(url) {
  if (!url) return null;
  const m = url.match(/Special:FilePath\/(.+)$/);
  if (m) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(decodeURIComponent(m[1]))}?width=160`;
  }
  return url;
}

async function fetchWikidataFlags() {
  const res = await fetch('https://query.wikidata.org/sparql?format=json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/sparql-results+json',
      'User-Agent': 'Gemeentedle/1.0 (YDA; educational game)',
    },
    body: `query=${encodeURIComponent(SPARQL)}`,
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const data = await res.json();
  const byLabel = new Map();
  for (const b of data.results.bindings) {
    const label = b.itemLabel?.value;
    if (!label) continue;
    const flag = commonsPath(b.flag?.value);
    const coat = commonsPath(b.coat?.value);
    byLabel.set(label.toLowerCase(), flag || coat);
  }
  return byLabel;
}

async function fetchWikiFlag(title) {
  const url = `https://nl.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original&format=json&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Gemeentedle/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const src = page?.original?.source;
  if (!src) return null;
  return src.includes('width=') ? src : `${src}?width=160`;
}

/** Handmatige aanvullingen waar Wikidata/Wikipedia geen vlag leverde */
const FLAG_OVERRIDES = {
  's-gravenhage':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Den_Haag.svg?width=160',
  beek: 'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Beek_(Limburg).svg?width=160',
  bloemendaal:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Bloemendaal.svg?width=160',
  dantumadiel:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Dantumadiel.svg?width=160',
  'de-fryske-marren':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_De_Friese_Meren.svg?width=160',
  heusden:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Heusden.svg?width=160',
  hoogeveen:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Hoogeveen.svg?width=160',
  middelburg:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Middelburg.svg?width=160',
  'nuenen-gerwen-en-nederwetten':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Nuenen.svg?width=160',
  saba: 'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Saba.svg?width=160',
  'sint-eustatius':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Sint_Eustatius.svg?width=160',
  stein: 'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Stein_(Limburg).svg?width=160',
  tytsjerksteradiel:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Tytsjerksteradiel.svg?width=160',
};

function formatOverrideEntry([id, url]) {
  return `  ${JSON.stringify(id)}: ${JSON.stringify(url)}`;
}

function wikiTitle(name, province) {
  if (WIKI_TITLE_OVERRIDES[name] !== undefined && WIKI_TITLE_OVERRIDES[name] !== null) {
    return WIKI_TITLE_OVERRIDES[name];
  }
  if (name === 'Bergen') {
    return province === 'Limburg' ? 'Bergen_(Limburg)' : 'Bergen_(Noord-Holland)';
  }
  return name.replace(/ /g, '_');
}

async function main() {
  const src = await readFile(GEMEENTEN_PATH, 'utf-8');
  const entries = [...src.matchAll(/id: "([^"]+)", name: "([^"]+)", lat: [^,]+, lng: [^,]+, province: "([^"]+)"/g)];
  console.log(`${entries.length} gemeenten gevonden`);

  const wikidata = await fetchWikidataFlags();
  const flags = {};
  let found = 0;

  for (const [, id, name, province] of entries) {
    let url =
      wikidata.get(name.toLowerCase()) ||
      wikidata.get(name.replace(' c.a.', '').toLowerCase()) ||
      null;

    if (!url) {
      const title = wikiTitle(name, province);
      url = await fetchWikiFlag(title);
      await new Promise((r) => setTimeout(r, 80));
    }

    if (url) {
      flags[id] = url;
      found++;
      process.stdout.write(`✓ ${name}\n`);
    } else {
      process.stdout.write(`✗ ${name}\n`);
    }
  }

  const out = `/**
 * Gemeentevlag-URL's voor hints (Wikidata P41 / Wikipedia fallback)
 * NL: Automatisch gegenereerd — niet handmatig bewerken.
 * EN: Auto-generated flag image URLs keyed by gemeente id.
 * Run: npm run fetch:flags
 */

export const GEMEENTE_FLAG_URLS: Record<string, string> = ${JSON.stringify(flags, null, 2)};

/** Handmatige aanvullingen waar Wikidata/Wikipedia geen vlag leverde */
const FLAG_OVERRIDES: Record<string, string> = {
${Object.entries(FLAG_OVERRIDES).map(formatOverrideEntry).join(',\n')}
};

export function getGemeenteFlagUrl(id: string): string | null {
  return FLAG_OVERRIDES[id] ?? GEMEENTE_FLAG_URLS[id] ?? null;
}
`;

  await writeFile(new URL('../src/data/gemeente-flags.ts', import.meta.url), out, 'utf-8');
  console.log(`\nKlaar: ${found}/${entries.length} vlaggen opgeslagen.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
