/** Gemeentedle configuratie / Gemeentedle game config */

export const MAX_ATTEMPTS = 10;
export const MAX_DISTANCE_KM = 350;
export const EPOCH_DATE = new Date('2026-06-18');
export const STORAGE_KEY = 'gemeentedle_stats_v1';
export const GAME_TIMEZONE = 'Europe/Amsterdam';
export const GLOBAL_COUNT_REFRESH_MS = 60_000;
export const USE_RANDOM_TARGET_FOR_TESTING = false;
export const SOLVE_RATE_LIMIT_PER_HOUR = 60;

/** Hints ~⅓ en ~⅔ van 10 pogingen (was 2 en 4 bij 6 pogingen) */
export const HINT_FLAG_AFTER_ATTEMPT = 3;
export const HINT_PROVINCE_AFTER_ATTEMPT = 7;
