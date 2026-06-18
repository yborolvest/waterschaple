# Waterschaple — Project Context

> **NL:** Contextbestand voor ontwikkelaars en AI-assistenten.  
> **EN:** Context file for developers and AI assistants working on this codebase.

---

## Overview / Overzicht

| | |
|---|---|
| **Name** | Waterschaple 🌊 |
| **Type** | Daily geo-guessing web game (Wordle-style) |
| **Goal** | Guess the correct Dutch *waterschap* (water board) in max 6 attempts |
| **Audience** | Dutch-speaking players |
| **Agency** | Your Digital Agency (Netherlands) |
| **Repo** | https://github.com/yborolvest/waterschaple |
| **Live stack** | Astro 5 (hybrid) + Node adapter + Tailwind + TypeScript |

**NL:** Spelers raden dagelijks welk van de 20 Nederlandse waterschappen het doel is. Na elke gok zien ze afstand (km), richtingspijl en nabijheidsscore.  
**EN:** Players guess which of 20 Dutch water boards is today's target. Each guess shows distance (km), direction arrow, and proximity score.

---

## Core product rules / Spelregels

1. **One global target per calendar day** — same waterschap for all players worldwide (`getDailyTarget()`).
2. **Yesterday's answer is always visible** in the header (`getYesterdayTarget()`).
3. **6 attempts** per day; autocomplete from valid waterschappen only.
4. **Win** = exact waterschap match (100% proximity).
5. **Loss** = 6 wrong guesses.
6. **Streak** = consecutive *winning* days (Wordle-style); stored in `localStorage`.
7. **Community counter** = global daily win count via **eigen Astro API** + Redis/file storage.
8. **Share** = emoji grid copied to clipboard after game ends.

---

## Tech architecture

```
src/
├── data/waterschappen.ts    # 20 waterschappen + lat/lng
├── lib/
│   ├── config.ts            # Constants, feature flags
│   ├── game-logic.ts        # Haversine, bearing, daily puzzle picker
│   ├── stats.ts             # localStorage player stats
│   ├── global-counter.ts    # Client → API calls
│   └── server/
│       ├── solve-store.ts   # Redis (prod) or .data/solves.json (dev)
│       └── rate-limit.ts    # IP rate limiting
├── pages/api/solves/        # GET count, POST increment
├── scripts/game-client.ts   # DOM, events, game loop
├── pages/index.astro
├── layouts/BaseLayout.astro
└── styles/global.css        # Tailwind + custom animations
```

- **Hybrid Astro** — static UI + server API routes (`output: 'hybrid'`, `@astrojs/node`).
- **Community counter** — server-side store; Upstash Redis in production, `.data/solves.json` locally.
- **Client state** — `localStorage` key: `waterschaple_stats_v1`.
- **Legacy** — `legacy-index.html` is the original single-file prototype (reference only).

---

## Community solve API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/solves/count?puzzle=&date=` | GET | Huidige win-count ophalen |
| `/api/solves/increment` | POST | +1 na gewonnen spel (gevalideerd) |

**POST body:** `{ puzzleNumber, dateKey }`  
**Server checks:** puzzel + datum moeten overeenkomen met vandaag (`Europe/Amsterdam`).  
**Rate limit:** max 10 increment-requests per IP per uur.  
**Client dedup:** `globalWinReportedDates` in localStorage (1× per apparaat per dag).

**Storage:**
- **Dev:** `.data/solves.json` (auto-created, gitignored)
- **Prod:** [Upstash Redis](https://upstash.com) via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

---

## Daily puzzle algorithm

- **Epoch:** `2024-01-01` (`EPOCH_DATE` in `config.ts`)
- **Timezone:** `Europe/Amsterdam` (`GAME_TIMEZONE`) — global same puzzle for all players
- **Puzzle number:** days since epoch + 1
- **Target index:** `dayIndex % 20` into `WATERSCHAPPEN` array
- **Date key:** `YYYY-MM-DD` in Amsterdam timezone

```ts
getDailyTarget(date)      // today's target
getYesterdayTarget(date)  // yesterday's revealed answer
getPuzzleNumber(date)     // share text / UI label
```

---

## Key configuration (`src/lib/config.ts`)

| Constant | Purpose |
|----------|---------|
| `USE_RANDOM_TARGET_FOR_TESTING` | `true` = random target, no persistence/counter; `false` = production |
| `MAX_ATTEMPTS` | 6 |
| `MAX_DISTANCE_KM` | 350 (proximity scale) |
| `STORAGE_KEY` | `waterschaple_stats_v1` |
| `GAME_TIMEZONE` | `Europe/Amsterdam` |
| `SOLVE_RATE_LIMIT_PER_HOUR` | 10 (API increment per IP) |

---

## Data: waterschappen

20 regional water boards in `src/data/waterschappen.ts`. Each entry:

```ts
{ id: string, name: string, lat: number, lng: number }
```

Coordinates are approximate geographic centres for Haversine distance and bearing calculations.

---

## Player stats schema (`localStorage`)

```ts
{
  currentStreak, maxStreak,
  gamesPlayed, gamesWon,
  guessDistribution: number[6],  // wins per attempt count
  lastWinDate, lastPlayedDate,
  completedDates: string[],
  globalWinReportedDates: string[],
  history: { puzzleNumber, date, won, attempts, grid }[],
  todayGame: { date, puzzleNumber, targetId, guesses, attempts, gameOver, won } | null
}
```

- `todayGame` persists in-progress play across page refresh.
- `completedDates` prevents double-recording results per day.
- `globalWinReportedDates` prevents double-hitting the community counter.

---

## UI structure

| Area | IDs / notes |
|------|-------------|
| Header | `#game-date-label`, `#yesterday-reveal`, `#stats-bar`, `#global-solve-banner` |
| Game | `#guess-input`, `#autocomplete-list`, `#guess-history`, `#attempt-dots` |
| Modals | `#modal-info`, `#modal-stats`, `#modal-result` |
| Language | All user-facing text is **Dutch (nl)** |

**Theme:** Deep ocean blues (`#0A2540`, `#1E3A8A`), teal accent (`#14B8A6`), white cards.

---

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview
```

- Debug log (dev only): `[Waterschaple debug] Doel: …` in browser console.
- For local testing without daily puzzle: set `USE_RANDOM_TARGET_FOR_TESTING = true` in `config.ts`.

---

## Conventions for contributors

1. **Minimize scope** — focused diffs; match existing patterns.
2. **Comments** — brief; NL or bilingual where business logic is non-obvious.
3. **Documentation** — update this file and `README.md` for structural or rule changes.
4. **No secrets** in repo — CountAPI uses public keys only.
5. **Client logic** stays in `src/lib/` + `src/scripts/`; markup in `.astro` files.
6. **Do not commit** unless explicitly requested.

---

## Future extension ideas

- Deploy to Railway/Render/Fly with Node adapter + Upstash
- GitHub Actions CI
- i18n (English UI toggle)
- Map visualization of guesses
- Official 21st waterschap if dataset is updated

---

## Quick reference

| Task | Where to look |
|------|----------------|
| Change daily puzzle logic | `src/lib/game-logic.ts` |
| Add/edit waterschap | `src/data/waterschappen.ts` |
| UI copy / layout | `src/pages/index.astro` |
| Game behaviour / events | `src/scripts/game-client.ts` |
| Streak & scores | `src/lib/stats.ts` |
| Global solve count | `src/lib/server/solve-store.ts`, `src/pages/api/solves/` |
| Feature flags | `src/lib/config.ts` |

---

*Last updated: June 2026 — Astro migration, global daily puzzle, yesterday reveal, streak & community counter.*
