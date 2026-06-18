/** Overstaple configuratie / Overstaple game config */

export const STORAGE_KEY = 'overstaple_stats_v1';
export const GLOBAL_COUNT_REFRESH_MS = 60_000;
export const USE_RANDOM_TARGET_FOR_TESTING = false;

/** NL: Routes vooruit cachen (dagen incl. vandaag) / EN: Days of routes to prefetch ahead */
export const ROUTE_PREFETCH_DAYS = 3;

/** Pauze tussen NS API-calls bij prefetch / EN: Delay between prefetch API calls */
export const NS_ROUTE_PREFETCH_DELAY_MS = 2000;
