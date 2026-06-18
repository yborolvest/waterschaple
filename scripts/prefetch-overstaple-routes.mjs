/**
 * Prefetch optimale NS-routes voor vandaag + komende dagen.
 * NL: npm run prefetch:overstaple
 * EN: Cache Overstaple routes for today and the next days ahead.
 */
import { readFile } from 'node:fs/promises';

async function loadEnv() {
  try {
    const raw = await readFile(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

await loadEnv();

const { prefetchOverstapleRoutes } = await import('../src/lib/overstaple/resolve-daily.ts');
const { getOverstaplePuzzlePair } = await import('../src/lib/overstaple/logic.ts');
const { ROUTE_PREFETCH_DAYS } = await import('../src/lib/overstaple/config.ts');

const from = new Date();
const results = await prefetchOverstapleRoutes(from, ROUTE_PREFETCH_DAYS);

for (const row of results) {
  const pair = getOverstaplePuzzlePair(new Date(`${row.dateKey}T12:00:00`));
  const label = pair ? `${pair.start.name} → ${pair.end.name}` : row.dateKey;
  console.log(`${row.dateKey}: ${label} (${row.hops} hops, bron: ${row.source})`);
}

console.log(`\nKlaar — ${results.length} route(s) gecached (vandaag + ${ROUTE_PREFETCH_DAYS - 1} dag(en) vooruit).`);
