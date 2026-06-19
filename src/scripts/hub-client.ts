import { getDateKey } from '../lib/game-logic';
import { DAILY_GAMES } from '../data/games';

type GameStatus = 'not-played' | 'in-progress' | 'won' | 'lost';

interface StoredStats {
  currentStreak?: number;
  completedDates?: string[];
  history?: { date: string; won: boolean; attempts: number | null }[];
  todayGame?: { date: string; attempts?: number; gameOver?: boolean; won?: boolean };
}

const STATUS_COPY: Record<
  GameStatus,
  { badge: string; cta: string; ariaSuffix: string; badgeClass: string }
> = {
  'not-played': {
    badge: 'Vandaag',
    cta: 'Speel nu',
    ariaSuffix: 'nog niet gespeeld vandaag',
    badgeClass: '',
  },
  'in-progress': {
    badge: 'Bezig',
    cta: 'Verder spelen',
    ariaSuffix: 'spel bezig',
    badgeClass: 'bg-white/10 border-white/20 text-white/80',
  },
  won: {
    badge: 'Gewonnen',
    cta: 'Bekijk resultaat',
    ariaSuffix: 'vandaag gewonnen',
    badgeClass: 'bg-green-500/15 border-green-400/30 text-green-300',
  },
  lost: {
    badge: 'Gespeeld',
    cta: 'Bekijk resultaat',
    ariaSuffix: 'vandaag gespeeld',
    badgeClass: 'bg-white/10 border-white/20 text-white/70',
  },
};

function getCurrentStreak(storageKey: string): number {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;
    const stats = JSON.parse(raw) as StoredStats;
    return stats.currentStreak ?? 0;
  } catch {
    return 0;
  }
}

function getGameStatus(storageKey: string, dateKey: string): GameStatus {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 'not-played';

    const stats = JSON.parse(raw) as StoredStats;

    if (stats.completedDates?.includes(dateKey)) {
      const entry = stats.history?.find((h) => h.date === dateKey);
      return entry?.won ? 'won' : 'lost';
    }

    const tg = stats.todayGame;
    if (tg?.date === dateKey && (tg.attempts ?? 0) > 0 && !tg.gameOver) {
      return 'in-progress';
    }

    return 'not-played';
  } catch {
    return 'not-played';
  }
}

function updateGameCard(
  gameId: string,
  storageKey: string,
  status: GameStatus,
  accentClasses: string,
): void {
  const card = document.querySelector<HTMLElement>(`[data-game-id="${gameId}"]`);
  if (!card) return;

  const copy = STATUS_COPY[status];
  const badge = card.querySelector<HTMLElement>('[data-game-status]');
  const cta = card.querySelector<HTMLElement>('[data-game-cta]');
  const streakEl = card.querySelector<HTMLElement>('[data-game-streak]');
  const streakValue = card.querySelector<HTMLElement>('[data-streak-value]');
  const streak = getCurrentStreak(storageKey);

  if (badge) {
    badge.textContent = copy.badge;
    badge.className = [
      'text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 transition-all duration-300 ease-out group-hover:scale-105',
      copy.badgeClass || accentClasses,
    ]
      .filter(Boolean)
      .join(' ');
  }

  card.dataset.status = status;

  if (streakValue) streakValue.textContent = String(streak);
  if (streakEl) {
    streakEl.classList.toggle('hub-card__streak--active', streak > 0);
    streakEl.setAttribute(
      'aria-label',
      streak > 0 ? `Huidige reeks: ${streak} ${streak === 1 ? 'dag' : 'dagen'}` : 'Geen actieve reeks',
    );
  }

  if (cta) {
    const label = cta.querySelector<HTMLElement>('[data-cta-label]');
    if (label) label.textContent = copy.cta;
  }

  const game = DAILY_GAMES.find((g) => g.id === gameId);
  if (game) {
    const streakSuffix = streak > 0 ? `, reeks ${streak}` : '';
    card.setAttribute('aria-label', `${game.name}, ${copy.ariaSuffix}${streakSuffix}`);
  }
}

export function initHub(): void {
  const dateKey = getDateKey();

  for (const game of DAILY_GAMES) {
    if (!game.available || !game.storageKey) continue;
    const status = getGameStatus(game.storageKey, dateKey);
    const accentBadge = `${game.accentBg} ${game.accentBorder} ${game.accentText}`;
    updateGameCard(game.id, game.storageKey, status, accentBadge);
  }
}
