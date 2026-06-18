import { STATION_NEIGHBORS } from '../../data/station-connections';

function sortedNeighbors(stationId: string): string[] {
  return [...(STATION_NEIGHBORS[stationId] ?? [])].sort();
}

/** BFS-afstanden in trein-overstappen / EN: Hop distances on train graph */
export function bfsDistances(startId: string): Map<string, number> {
  const dist = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const n of sortedNeighbors(cur)) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/**
 * NL: Eén kortste pad (min. tussenstops); bij gelijke lengte deterministisch via sorteerde buren.
 * EN: Single canonical shortest path with deterministic tie-break.
 */
export function findShortestPathIds(startId: string, endId: string): string[] | null {
  const parent = new Map<string, string | null>([[startId, null]]);
  const queue = [startId];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === endId) break;
    for (const n of sortedNeighbors(cur)) {
      if (parent.has(n)) continue;
      parent.set(n, cur);
      queue.push(n);
    }
  }

  if (!parent.has(endId)) return null;

  const path: string[] = [];
  let cur: string | null = endId;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(cur) ?? null;
  }
  return path;
}

export function pathToIntermediate(path: string[]): string[] {
  return path.length > 2 ? path.slice(1, -1) : [];
}

export function pathToDailyPuzzleFields(path: string[]) {
  return {
    path,
    intermediate: pathToIntermediate(path),
    hops: path.length - 1,
  };
}
