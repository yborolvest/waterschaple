import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Redis } from '@upstash/redis';

const DATA_DIR = join(process.cwd(), '.data');
const FILE_PATH = join(DATA_DIR, 'solves.json');

type SolveStore = Record<string, number>;

function useUpstash(): boolean {
  return Boolean(
    import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  return new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL!,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function readFileStore(): Promise<SolveStore> {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    return JSON.parse(raw) as SolveStore;
  } catch {
    return {};
  }
}

async function writeFileStore(data: SolveStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** EN: Get global solve count for a puzzle day */
export async function getSolveCount(key: string): Promise<number> {
  if (useUpstash()) {
    const value = await getRedis().get<number>(key);
    return value ?? 0;
  }

  const store = await readFileStore();
  return store[key] ?? 0;
}

/** EN: Increment solve count atomically */
export async function incrementSolveCount(key: string): Promise<number> {
  if (useUpstash()) {
    return getRedis().incr(key);
  }

  const store = await readFileStore();
  const next = (store[key] ?? 0) + 1;
  store[key] = next;
  await writeFileStore(store);
  return next;
}

export function getStorageBackend(): 'upstash' | 'file' {
  return useUpstash() ? 'upstash' : 'file';
}

/** EN: Historical win count per gemeente (all-time as daily answer) */
export async function getGemeenteWinCount(gemeenteId: string): Promise<number> {
  const key = `gemeente-wins:${gemeenteId}`;
  if (useUpstash()) {
    const value = await getRedis().get<number>(key);
    return value ?? 0;
  }
  const store = await readFileStore();
  return store[key] ?? 0;
}

export async function incrementGemeenteWinCount(gemeenteId: string): Promise<number> {
  const key = `gemeente-wins:${gemeenteId}`;
  if (useUpstash()) {
    return getRedis().incr(key);
  }
  const store = await readFileStore();
  const next = (store[key] ?? 0) + 1;
  store[key] = next;
  await writeFileStore(store);
  return next;
}

/** EN: Historical win count per station (all-time as daily answer) */
export async function getStationWinCount(stationId: string): Promise<number> {
  const key = `station-wins:${stationId}`;
  if (useUpstash()) {
    const value = await getRedis().get<number>(key);
    return value ?? 0;
  }
  const store = await readFileStore();
  return store[key] ?? 0;
}

export async function incrementStationWinCount(stationId: string): Promise<number> {
  const key = `station-wins:${stationId}`;
  if (useUpstash()) {
    return getRedis().incr(key);
  }
  const store = await readFileStore();
  const next = (store[key] ?? 0) + 1;
  store[key] = next;
  await writeFileStore(store);
  return next;
}
