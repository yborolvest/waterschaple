/**
 * Genereert src/data/gemeenten.ts vanuit Wikipedia-lijst + PDOK-coördinaten.
 * Bron namen: https://nl.wikipedia.org/wiki/Lijst_van_Nederlandse_gemeenten_per_provincie
 * Bron coords: https://api.pdok.nl/bzk/locatieserver/
 */

import { writeFile } from 'node:fs/promises';

/** [officiële naam, provincie, PDOK-zoekterm indien afwijkend] */
const RAW = [
  // Drenthe (12)
  ['Aa en Hunze', 'Drenthe'],
  ['Assen', 'Drenthe'],
  ['Borger-Odoorn', 'Drenthe'],
  ['Coevorden', 'Drenthe'],
  ['Emmen', 'Drenthe'],
  ['Hoogeveen', 'Drenthe'],
  ['Meppel', 'Drenthe'],
  ['Midden-Drenthe', 'Drenthe'],
  ['Noordenveld', 'Drenthe'],
  ['Tynaarlo', 'Drenthe'],
  ['Westerveld', 'Drenthe'],
  ['De Wolden', 'Drenthe'],
  // Flevoland (6)
  ['Almere', 'Flevoland'],
  ['Dronten', 'Flevoland'],
  ['Lelystad', 'Flevoland'],
  ['Noordoostpolder', 'Flevoland'],
  ['Urk', 'Flevoland'],
  ['Zeewolde', 'Flevoland'],
  // Friesland (18)
  ['Achtkarspelen', 'Friesland'],
  ['Ameland', 'Friesland'],
  ['Dantumadiel', 'Friesland'],
  ['De Fryske Marren', 'Friesland'],
  ['Harlingen', 'Friesland'],
  ['Heerenveen', 'Friesland'],
  ['Leeuwarden', 'Friesland'],
  ['Noardeast-Fryslân', 'Friesland'],
  ['Ooststellingwerf', 'Friesland'],
  ['Opsterland', 'Friesland'],
  ['Schiermonnikoog', 'Friesland'],
  ['Smallingerland', 'Friesland'],
  ['Súdwest-Fryslân', 'Friesland'],
  ['Terschelling', 'Friesland'],
  ['Tytsjerksteradiel', 'Friesland'],
  ['Vlieland', 'Friesland'],
  ['Waadhoeke', 'Friesland'],
  ['Weststellingwerf', 'Friesland'],
  // Gelderland (51)
  ['Aalten', 'Gelderland'],
  ['Apeldoorn', 'Gelderland'],
  ['Arnhem', 'Gelderland'],
  ['Barneveld', 'Gelderland'],
  ['Berg en Dal', 'Gelderland'],
  ['Berkelland', 'Gelderland'],
  ['Beuningen', 'Gelderland'],
  ['Bronckhorst', 'Gelderland'],
  ['Brummen', 'Gelderland'],
  ['Buren', 'Gelderland'],
  ['Culemborg', 'Gelderland'],
  ['Doesburg', 'Gelderland'],
  ['Doetinchem', 'Gelderland'],
  ['Druten', 'Gelderland'],
  ['Duiven', 'Gelderland'],
  ['Ede', 'Gelderland'],
  ['Elburg', 'Gelderland'],
  ['Epe', 'Gelderland'],
  ['Ermelo', 'Gelderland'],
  ['Harderwijk', 'Gelderland'],
  ['Hattem', 'Gelderland'],
  ['Heerde', 'Gelderland'],
  ['Heumen', 'Gelderland'],
  ['Lingewaard', 'Gelderland'],
  ['Lochem', 'Gelderland'],
  ['Maasdriel', 'Gelderland'],
  ['Montferland', 'Gelderland'],
  ['Neder-Betuwe', 'Gelderland'],
  ['Nijkerk', 'Gelderland'],
  ['Nijmegen', 'Gelderland'],
  ['Nunspeet', 'Gelderland'],
  ['Oldebroek', 'Gelderland'],
  ['Oost Gelre', 'Gelderland'],
  ['Oude IJsselstreek', 'Gelderland'],
  ['Overbetuwe', 'Gelderland'],
  ['Putten', 'Gelderland'],
  ['Renkum', 'Gelderland'],
  ['Rheden', 'Gelderland'],
  ['Rozendaal', 'Gelderland'],
  ['Scherpenzeel', 'Gelderland'],
  ['Tiel', 'Gelderland'],
  ['Voorst', 'Gelderland'],
  ['Wageningen', 'Gelderland'],
  ['West Betuwe', 'Gelderland'],
  ['West Maas en Waal', 'Gelderland'],
  ['Westervoort', 'Gelderland'],
  ['Wijchen', 'Gelderland'],
  ['Winterswijk', 'Gelderland'],
  ['Zaltbommel', 'Gelderland'],
  ['Zevenaar', 'Gelderland'],
  ['Zutphen', 'Gelderland'],
  // Groningen (10)
  ['Eemsdelta', 'Groningen'],
  ['Groningen', 'Groningen'],
  ['Het Hogeland', 'Groningen'],
  ['Midden-Groningen', 'Groningen'],
  ['Oldambt', 'Groningen'],
  ['Pekela', 'Groningen'],
  ['Stadskanaal', 'Groningen'],
  ['Veendam', 'Groningen'],
  ['Westerkwartier', 'Groningen'],
  ['Westerwolde', 'Groningen'],
  // Limburg (31)
  ['Beek', 'Limburg'],
  ['Beekdaelen', 'Limburg'],
  ['Beesel', 'Limburg'],
  ['Bergen (L.)', 'Limburg', 'Bergen Limburg gemeente'],
  ['Brunssum', 'Limburg'],
  ['Echt-Susteren', 'Limburg'],
  ['Eijsden-Margraten', 'Limburg'],
  ['Gennep', 'Limburg'],
  ['Gulpen-Wittem', 'Limburg'],
  ['Heerlen', 'Limburg'],
  ['Horst aan de Maas', 'Limburg'],
  ['Kerkrade', 'Limburg'],
  ['Landgraaf', 'Limburg'],
  ['Leudal', 'Limburg'],
  ['Maasgouw', 'Limburg'],
  ['Maastricht', 'Limburg'],
  ['Meerssen', 'Limburg'],
  ['Mook en Middelaar', 'Limburg'],
  ['Nederweert', 'Limburg'],
  ['Peel en Maas', 'Limburg'],
  ['Roerdalen', 'Limburg'],
  ['Roermond', 'Limburg'],
  ['Simpelveld', 'Limburg'],
  ['Sittard-Geleen', 'Limburg'],
  ['Stein', 'Limburg'],
  ['Vaals', 'Limburg'],
  ['Valkenburg aan de Geul', 'Limburg'],
  ['Venlo', 'Limburg'],
  ['Venray', 'Limburg'],
  ['Voerendaal', 'Limburg'],
  ['Weert', 'Limburg'],
  // Noord-Brabant (56)
  ['Alphen-Chaam', 'Noord-Brabant'],
  ['Altena', 'Noord-Brabant'],
  ['Asten', 'Noord-Brabant'],
  ['Baarle-Nassau', 'Noord-Brabant'],
  ['Bergeijk', 'Noord-Brabant'],
  ['Bergen op Zoom', 'Noord-Brabant'],
  ['Bernheze', 'Noord-Brabant'],
  ['Best', 'Noord-Brabant'],
  ['Bladel', 'Noord-Brabant'],
  ['Boekel', 'Noord-Brabant'],
  ['Boxtel', 'Noord-Brabant'],
  ['Breda', 'Noord-Brabant'],
  ['Cranendonck', 'Noord-Brabant'],
  ['Deurne', 'Noord-Brabant'],
  ['Dongen', 'Noord-Brabant'],
  ['Drimmelen', 'Noord-Brabant'],
  ['Eersel', 'Noord-Brabant'],
  ['Eindhoven', 'Noord-Brabant'],
  ['Etten-Leur', 'Noord-Brabant'],
  ['Geertruidenberg', 'Noord-Brabant'],
  ['Geldrop-Mierlo', 'Noord-Brabant'],
  ['Gemert-Bakel', 'Noord-Brabant'],
  ['Gilze en Rijen', 'Noord-Brabant'],
  ['Goirle', 'Noord-Brabant'],
  ['Halderberge', 'Noord-Brabant'],
  ['Heeze-Leende', 'Noord-Brabant'],
  ['Helmond', 'Noord-Brabant'],
  ["'s-Hertogenbosch", 'Noord-Brabant'],
  ['Heusden', 'Noord-Brabant'],
  ['Hilvarenbeek', 'Noord-Brabant'],
  ['Laarbeek', 'Noord-Brabant'],
  ['Land van Cuijk', 'Noord-Brabant'],
  ['Loon op Zand', 'Noord-Brabant'],
  ['Maashorst', 'Noord-Brabant'],
  ['Meierijstad', 'Noord-Brabant'],
  ['Moerdijk', 'Noord-Brabant'],
  ['Nuenen, Gerwen en Nederwetten', 'Noord-Brabant'],
  ['Oirschot', 'Noord-Brabant'],
  ['Oisterwijk', 'Noord-Brabant'],
  ['Oosterhout', 'Noord-Brabant'],
  ['Oss', 'Noord-Brabant'],
  ['Reusel-De Mierden', 'Noord-Brabant'],
  ['Roosendaal', 'Noord-Brabant'],
  ['Rucphen', 'Noord-Brabant'],
  ['Sint-Michielsgestel', 'Noord-Brabant'],
  ['Someren', 'Noord-Brabant'],
  ['Son en Breugel', 'Noord-Brabant'],
  ['Steenbergen', 'Noord-Brabant'],
  ['Tilburg', 'Noord-Brabant'],
  ['Valkenswaard', 'Noord-Brabant'],
  ['Veldhoven', 'Noord-Brabant'],
  ['Vught', 'Noord-Brabant'],
  ['Waalre', 'Noord-Brabant'],
  ['Waalwijk', 'Noord-Brabant'],
  ['Woensdrecht', 'Noord-Brabant'],
  ['Zundert', 'Noord-Brabant'],
  // Noord-Holland (44)
  ['Aalsmeer', 'Noord-Holland'],
  ['Alkmaar', 'Noord-Holland'],
  ['Amstelveen', 'Noord-Holland'],
  ['Amsterdam', 'Noord-Holland'],
  ['Bergen (NH)', 'Noord-Holland', 'Bergen Noord-Holland gemeente'],
  ['Beverwijk', 'Noord-Holland'],
  ['Blaricum', 'Noord-Holland'],
  ['Bloemendaal', 'Noord-Holland'],
  ['Castricum', 'Noord-Holland'],
  ['Den Helder', 'Noord-Holland'],
  ['Diemen', 'Noord-Holland'],
  ['Dijk en Waard', 'Noord-Holland'],
  ['Drechterland', 'Noord-Holland'],
  ['Edam-Volendam', 'Noord-Holland'],
  ['Enkhuizen', 'Noord-Holland'],
  ['Gooise Meren', 'Noord-Holland'],
  ['Haarlem', 'Noord-Holland'],
  ['Haarlemmermeer', 'Noord-Holland'],
  ['Heemskerk', 'Noord-Holland'],
  ['Heemstede', 'Noord-Holland'],
  ['Heiloo', 'Noord-Holland'],
  ['Hilversum', 'Noord-Holland'],
  ['Hollands Kroon', 'Noord-Holland'],
  ['Hoorn', 'Noord-Holland'],
  ['Huizen', 'Noord-Holland'],
  ['Koggenland', 'Noord-Holland'],
  ['Landsmeer', 'Noord-Holland'],
  ['Laren', 'Noord-Holland'],
  ['Medemblik', 'Noord-Holland'],
  ['Oostzaan', 'Noord-Holland'],
  ['Opmeer', 'Noord-Holland'],
  ['Ouder-Amstel', 'Noord-Holland'],
  ['Purmerend', 'Noord-Holland'],
  ['Schagen', 'Noord-Holland'],
  ['Stede Broec', 'Noord-Holland'],
  ['Texel', 'Noord-Holland'],
  ['Uitgeest', 'Noord-Holland'],
  ['Uithoorn', 'Noord-Holland'],
  ['Velsen', 'Noord-Holland'],
  ['Waterland', 'Noord-Holland'],
  ['Wijdemeren', 'Noord-Holland'],
  ['Wormerland', 'Noord-Holland'],
  ['Zaanstad', 'Noord-Holland'],
  ['Zandvoort', 'Noord-Holland'],
  // Overijssel (25)
  ['Almelo', 'Overijssel'],
  ['Borne', 'Overijssel'],
  ['Dalfsen', 'Overijssel'],
  ['Deventer', 'Overijssel'],
  ['Dinkelland', 'Overijssel'],
  ['Enschede', 'Overijssel'],
  ['Haaksbergen', 'Overijssel'],
  ['Hardenberg', 'Overijssel'],
  ['Hellendoorn', 'Overijssel'],
  ['Hengelo', 'Overijssel'],
  ['Hof van Twente', 'Overijssel'],
  ['Kampen', 'Overijssel'],
  ['Losser', 'Overijssel'],
  ['Oldenzaal', 'Overijssel'],
  ['Olst-Wijhe', 'Overijssel'],
  ['Ommen', 'Overijssel'],
  ['Raalte', 'Overijssel'],
  ['Rijssen-Holten', 'Overijssel'],
  ['Staphorst', 'Overijssel'],
  ['Steenwijkerland', 'Overijssel'],
  ['Tubbergen', 'Overijssel'],
  ['Twenterand', 'Overijssel'],
  ['Wierden', 'Overijssel'],
  ['Zwartewaterland', 'Overijssel'],
  ['Zwolle', 'Overijssel'],
  // Utrecht (26)
  ['Amersfoort', 'Utrecht'],
  ['Baarn', 'Utrecht'],
  ['De Bilt', 'Utrecht'],
  ['Bunnik', 'Utrecht'],
  ['Bunschoten', 'Utrecht'],
  ['Eemnes', 'Utrecht'],
  ['Houten', 'Utrecht'],
  ['IJsselstein', 'Utrecht'],
  ['Leusden', 'Utrecht'],
  ['Lopik', 'Utrecht'],
  ['Montfoort', 'Utrecht'],
  ['Nieuwegein', 'Utrecht'],
  ['Oudewater', 'Utrecht'],
  ['Renswoude', 'Utrecht'],
  ['Rhenen', 'Utrecht'],
  ['De Ronde Venen', 'Utrecht'],
  ['Soest', 'Utrecht'],
  ['Stichtse Vecht', 'Utrecht'],
  ['Utrecht', 'Utrecht'],
  ['Utrechtse Heuvelrug', 'Utrecht'],
  ['Veenendaal', 'Utrecht'],
  ['Vijfheerenlanden', 'Utrecht'],
  ['Wijk bij Duurstede', 'Utrecht'],
  ['Woerden', 'Utrecht'],
  ['Woudenberg', 'Utrecht'],
  ['Zeist', 'Utrecht'],
  // Zeeland (13)
  ['Borsele', 'Zeeland'],
  ['Goes', 'Zeeland'],
  ['Hulst', 'Zeeland'],
  ['Kapelle', 'Zeeland'],
  ['Middelburg', 'Zeeland'],
  ['Noord-Beveland', 'Zeeland'],
  ['Reimerswaal', 'Zeeland'],
  ['Schouwen-Duiveland', 'Zeeland'],
  ['Sluis', 'Zeeland'],
  ['Terneuzen', 'Zeeland'],
  ['Tholen', 'Zeeland'],
  ['Veere', 'Zeeland'],
  ['Vlissingen', 'Zeeland'],
  // Zuid-Holland (50)
  ['Alblasserdam', 'Zuid-Holland'],
  ['Albrandswaard', 'Zuid-Holland'],
  ['Alphen aan den Rijn', 'Zuid-Holland'],
  ['Barendrecht', 'Zuid-Holland'],
  ['Bodegraven-Reeuwijk', 'Zuid-Holland'],
  ['Capelle aan den IJssel', 'Zuid-Holland'],
  ['Delft', 'Zuid-Holland'],
  ["'s-Gravenhage", 'Zuid-Holland'],
  ['Dordrecht', 'Zuid-Holland'],
  ['Goeree-Overflakkee', 'Zuid-Holland'],
  ['Gorinchem', 'Zuid-Holland'],
  ['Gouda', 'Zuid-Holland'],
  ['Hardinxveld-Giessendam', 'Zuid-Holland'],
  ['Hendrik-Ido-Ambacht', 'Zuid-Holland'],
  ['Hillegom', 'Zuid-Holland'],
  ['Hoeksche Waard', 'Zuid-Holland'],
  ['Kaag en Braassem', 'Zuid-Holland'],
  ['Katwijk', 'Zuid-Holland'],
  ['Krimpen aan den IJssel', 'Zuid-Holland'],
  ['Krimpenerwaard', 'Zuid-Holland'],
  ['Lansingerland', 'Zuid-Holland'],
  ['Leiden', 'Zuid-Holland'],
  ['Leiderdorp', 'Zuid-Holland'],
  ['Leidschendam-Voorburg', 'Zuid-Holland'],
  ['Lisse', 'Zuid-Holland'],
  ['Maassluis', 'Zuid-Holland'],
  ['Midden-Delfland', 'Zuid-Holland'],
  ['Molenlanden', 'Zuid-Holland'],
  ['Nieuwkoop', 'Zuid-Holland'],
  ['Nissewaard', 'Zuid-Holland'],
  ['Noordwijk', 'Zuid-Holland'],
  ['Oegstgeest', 'Zuid-Holland'],
  ['Papendrecht', 'Zuid-Holland'],
  ['Pijnacker-Nootdorp', 'Zuid-Holland'],
  ['Ridderkerk', 'Zuid-Holland'],
  ['Rijswijk', 'Zuid-Holland'],
  ['Rotterdam', 'Zuid-Holland'],
  ['Schiedam', 'Zuid-Holland'],
  ['Sliedrecht', 'Zuid-Holland'],
  ['Teylingen', 'Zuid-Holland'],
  ['Vlaardingen', 'Zuid-Holland'],
  ['Voorne aan Zee', 'Zuid-Holland'],
  ['Voorschoten', 'Zuid-Holland'],
  ['Waddinxveen', 'Zuid-Holland'],
  ['Wassenaar', 'Zuid-Holland'],
  ['Westland', 'Zuid-Holland'],
  ['Zoetermeer', 'Zuid-Holland'],
  ['Zoeterwoude', 'Zuid-Holland'],
  ['Zuidplas', 'Zuid-Holland'],
  ['Zwijndrecht', 'Zuid-Holland'],
];

/**
 * Bijzondere gemeenten (openbare lichamen): Caribisch Nederland
 * @see https://nl.wikipedia.org/wiki/Caribisch_Nederland
 * Coördinaten: gemeentelijke centroiden (PDOK dekt CN niet; handmatig)
 */
const CARIBISCH_RAW = [
  ['Bonaire', 'Caribisch Nederland', { lat: 12.2019, lng: -68.2624 }],
  ['Saba', 'Caribisch Nederland', { lat: 17.6355, lng: -63.2327 }],
  ['Sint Eustatius', 'Caribisch Nederland', { lat: 17.4897, lng: -62.9742 }],
];

const DISPLAY_OVERRIDES = {
  'Bergen (L.)': 'Bergen',
  'Bergen (NH)': 'Bergen',
  'Nuenen, Gerwen en Nederwetten': 'Nuenen c.a.',
};

function toTsString(s) {
  return JSON.stringify(s);
}

function formatGemeente(g) {
  return `  { id: ${toTsString(g.id)}, name: ${toTsString(g.name)}, lat: ${g.lat}, lng: ${g.lng}, province: ${toTsString(g.province)} }`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\(l\)|\(nh\)/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCoords(name, searchTerm) {
  const q = encodeURIComponent(searchTerm ?? name);
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${q}&fq=type:gemeente&rows=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDOK ${res.status} for ${name}`);
  const data = await res.json();
  const doc = data.response?.docs?.[0];
  if (!doc?.centroide_ll) throw new Error(`Geen coords voor ${name}`);
  const match = doc.centroide_ll.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (!match) throw new Error(`Parse fout voor ${name}`);
  return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
}

const gemeenten = [];
const failed = [];

for (const row of RAW) {
  const [name, province, searchTerm] = row;
  const displayName = DISPLAY_OVERRIDES[name] ?? name;
  let id = slugify(name);
  if (gemeenten.some((g) => g.id === id)) {
    id = `${id}-${slugify(province)}`;
  }

  try {
    const { lat, lng } = await fetchCoords(name, searchTerm ?? name);
    gemeenten.push({ id, name: displayName, lat: +lat.toFixed(4), lng: +lng.toFixed(4), province });
    process.stdout.write(`✓ ${displayName}\n`);
  } catch (e) {
    failed.push({ name: displayName, error: e.message });
    process.stdout.write(`✗ ${displayName}: ${e.message}\n`);
  }
  await sleep(120);
}

for (const row of CARIBISCH_RAW) {
  const [name, province, coords] = row;
  const id = slugify(name);
  gemeenten.push({
    id,
    name,
    lat: +coords.lat.toFixed(4),
    lng: +coords.lng.toFixed(4),
    province,
  });
  process.stdout.write(`✓ ${name} (Caribisch Nederland)\n`);
}

gemeenten.sort((a, b) => a.name.localeCompare(b.name, 'nl'));

const file = `/**
 * Nederlandse gemeenten: dataset voor Gemeentedle
 * NL: ${gemeenten.length} gemeenten (342 EU + 3 Caribisch Nederland), bron: Wikipedia + PDOK/handmatig.
 * EN: Dutch municipalities incl. Caribbean special municipalities (BES islands).
 * @see https://nl.wikipedia.org/wiki/Lijst_van_Nederlandse_gemeenten_per_provincie
 * @see https://nl.wikipedia.org/wiki/Caribisch_Nederland
 */

export interface Gemeente {
  id: string;
  name: string;
  lat: number;
  lng: number;
  province: string;
}

/** Publieke velden zonder coördinaten (veilig voor client) */
export type GemeentePublic = Pick<Gemeente, 'id' | 'name' | 'province'>;

export function toPublicGemeente(g: Gemeente): GemeentePublic {
  return { id: g.id, name: g.name, province: g.province };
}

export const GEMEENTEN: Gemeente[] = [
${gemeenten.map(formatGemeente).join(',\n')}
];

export function findGemeenteById(id: string): Gemeente | undefined {
  return GEMEENTEN.find((g) => g.id === id);
}

export function findGemeenteByName(name: string): Gemeente | undefined {
  const q = name.trim().toLowerCase();
  return GEMEENTEN.find((g) => g.name.toLowerCase() === q);
}

export function getPublicGemeentenList(): GemeentePublic[] {
  return GEMEENTEN.map(toPublicGemeente);
}
`;

await writeFile(new URL('../src/data/gemeenten.ts', import.meta.url), file, 'utf-8');
console.log(`\nKlaar: ${gemeenten.length} gemeenten geschreven.`);
if (failed.length) {
  console.error('Mislukt:', failed);
  process.exit(1);
}
