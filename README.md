# Waterschaple 🌊

Dagelijks geo-raadspel: raad het juiste Nederlandse waterschap in maximaal 6 pogingen.

Daily geo-guessing game: find the correct Dutch water board in up to 6 attempts.

## Functies / Features

- Dagelijkse puzzel op basis van **Nederlandse tijd** (`Europe/Amsterdam`) — wereldwijd hetzelfde
- Gisteren's antwoord altijd zichtbaar
- Afstand, richting en nabijheidsscore per gok
- Lokale statistieken: reeks, winst%, verdeling pogingen
- **Community-teller via eigen API** — betrouwbare server-side opslag
- Volledig responsive, water-thema UI

## Ontwikkeling / Development

```bash
npm install
cp .env.example .env   # optioneel: Upstash Redis voor prod-like storage
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

Zonder Upstash-credentials wordt de teller lokaal opgeslagen in `.data/solves.json`.

## Build & deploy

```bash
npm run build
npm run start
```

**NL:** Hybrid Astro-app — vereist een **Node-server** (geen pure static hosting).  
**EN:** Requires Node runtime (`@astrojs/node`). Deploy to Railway, Render, Fly.io, or similar.

### Nixpacks (Coolify / Railway)

Het project bevat een `nixpacks.toml`. De build draait `npm ci` + `npm run build`; de container start met `npm run start` (`node ./dist/server/entry.mjs`).

1. Koppel de repo aan je platform (Nixpacks als buildpack)
2. Zet omgevingsvariabelen:
   - `UPSTASH_REDIS_REST_URL` (aanbevolen in productie)
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NS_API_SUBSCRIPTION_KEY` (optioneel, voor Overstaple NS-routes)
3. `PORT` wordt door het platform gezet; `HOST=0.0.0.0` staat in `nixpacks.toml`

### Productie / Production

1. Maak een gratis [Upstash Redis](https://upstash.com) database
2. Zet env vars op je host:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. `npm run build` en start de Node-server uit `dist/`

## API

| Endpoint | Beschrijving |
|----------|--------------|
| `GET /api/solves/count?puzzle=532&date=2026-06-16` | Aantal wins vandaag |
| `POST /api/solves/increment` | `{ puzzleNumber, dateKey }` — +1 na winst |

## Projectstructuur / Structure

Zie `CONTEXT.md` voor volledige documentatie.

## Configuratie / Configuration

In `src/lib/config.ts`:

- `USE_RANDOM_TARGET_FOR_TESTING` — `true` voor willekeurig doelwit (testen)
- `GAME_TIMEZONE` — `Europe/Amsterdam`
- `STORAGE_KEY` — localStorage-sleutel voor spelersstats

## Legacy

Het oorspronkelijke single-file prototype staat in `legacy-index.html`.

---

Your Digital Agency
