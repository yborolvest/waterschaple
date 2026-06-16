# Waterschaple 🌊

Dagelijks geo-raadspel: raad het juiste Nederlandse waterschap in maximaal 6 pogingen.

Daily geo-guessing game: find the correct Dutch water board in up to 6 attempts.

## Functies / Features

- Dagelijkse puzzel op basis van kalenderdatum
- Afstand, richting en nabijheidsscore per gok
- Lokale statistieken: reeks, winst%, verdeling pogingen
- Community-teller: hoe vaak de puzzel vandaag wereldwijd is opgelost
- Volledig responsive, water-thema UI

## Ontwikkeling / Development

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build

```bash
npm run build
npm run preview
```

Statische output staat in `dist/` — geschikt voor Netlify, Vercel, Cloudflare Pages, etc.

## Projectstructuur / Structure

```
src/
  data/waterschappen.ts   # Waterschappen-dataset
  lib/                    # Spel-logica, stats, geo-berekeningen
  scripts/game-client.ts  # Client-side DOM & events
  pages/index.astro       # Hoofdpagina
```

## Configuratie / Configuration

In `src/lib/config.ts`:

- `USE_RANDOM_TARGET_FOR_TESTING` — `true` voor willekeurig doelwit (testen)
- `STORAGE_KEY` — localStorage-sleutel voor spelersstats

## Legacy

Het oorspronkelijke single-file prototype staat in `legacy-index.html`.

---

Your Digital Agency
