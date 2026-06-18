/** Game configuration / Spelconfiguratie — Gemeentedle */

export const MAX_ATTEMPTS = 6;
export const MAX_DISTANCE_KM = 350;
export const EPOCH_DATE = new Date('2024-01-01');
export const STORAGE_KEY = 'gemeentedle_stats_v1';

/** Iedereen dezelfde kalenderdag — Nederlandse tijdzone */
export const GAME_TIMEZONE = 'Europe/Amsterdam';

export const GLOBAL_COUNT_REFRESH_MS = 60_000;

/** Set true for random daily target (testing). / true = willekeurig doelwit */
export const USE_RANDOM_TARGET_FOR_TESTING = false;

/** Max guess/increment requests per IP per hour */
export const SOLVE_RATE_LIMIT_PER_HOUR = 60;

/** Hints vrijspelen na X afgeronde pogingen (nog niet gewonnen) */
export const HINT_FLAG_AFTER_ATTEMPT = 2;
export const HINT_PROVINCE_AFTER_ATTEMPT = 4;
