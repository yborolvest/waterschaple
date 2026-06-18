import {
  MAX_ATTEMPTS,
  GLOBAL_COUNT_REFRESH_MS,
  USE_RANDOM_TARGET_FOR_TESTING,
} from '../lib/config';
import { WATERSCHAPPEN } from '../data/waterschappen';
import {
  haversineDistance,
  calculateBearing,
  bearingToArrow,
  distanceToProximity,
  getPuzzleNumber,
  getPuzzleNumberFromKey,
  getDateKey,
  getYesterdayDateKey,
  proximityToShareEmoji,
} from '../lib/game-logic';
import {
  getWaterschapDailyTarget,
  getYesterdayWaterschapTarget,
} from '../lib/waterschaple/logic';
import {
  loadWaterschapleStats,
  saveWaterschapleStats,
  serializeWaterschapGuess,
  deserializeWaterschapGuess,
  recordWaterschapleResult,
  getWaterschapleWinRate,
} from '../lib/waterschaple/stats';
import { formatGlobalSolveText } from '../lib/global-counter';
import { openModal, closeModal as closeA11yModal } from '../lib/modal-a11y';
import type { Waterschap } from '../data/waterschappen';
import type { WaterschapGameState, WaterschapGuess, WaterschapPlayerStats } from '../lib/waterschaple/types';

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

const state: WaterschapGameState = {
  target: null,
  guesses: [],
  attempts: 0,
  gameOver: false,
  won: false,
  puzzleNumber: 1,
  highlightedIndex: -1,
  dateKey: null,
  stats: null,
  resultRecorded: false,
  globalSolveCount: null,
};

let globalCountInterval: ReturnType<typeof setInterval> | null = null;

async function fetchGlobalSolveCount(): Promise<number | null> {
  if (!state.dateKey) return null;
  try {
    const res = await fetch(
      `/api/solves/count?puzzle=${state.puzzleNumber}&date=${encodeURIComponent(state.dateKey)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    return data.count ?? 0;
  } catch {
    return null;
  }
}

async function reportGlobalWin(): Promise<number | null> {
  if (!state.dateKey || !state.won) return null;
  const reported = state.stats?.globalWinReportedDates ?? [];
  if (reported.includes(state.dateKey)) return state.globalSolveCount;

  try {
    const res = await fetch('/api/solves/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleNumber: state.puzzleNumber, dateKey: state.dateKey }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    if (state.stats) {
      state.stats.globalWinReportedDates = [...reported, state.dateKey];
      saveWaterschapleStats(state.stats);
    }
    return data.count ?? null;
  } catch {
    return null;
  }
}

function renderStatsUI(stats: WaterschapPlayerStats) {
  const winRate = getWaterschapleWinRate(stats);

  $('#header-streak')!.textContent = String(stats.currentStreak);
  $('#header-wins')!.textContent = String(stats.gamesWon);
  $('#header-winrate')!.textContent = `${winRate}%`;

  $('#stat-current-streak')!.textContent = String(stats.currentStreak);
  $('#stat-max-streak')!.textContent = String(stats.maxStreak);
  $('#stat-wins')!.textContent = String(stats.gamesWon);
  $('#stat-played')!.textContent = String(stats.gamesPlayed);
  $('#stat-winrate')!.textContent = `${winRate}%`;

  const distEl = $('#guess-distribution')!;
  const maxDist = Math.max(...stats.guessDistribution, 1);
  distEl.innerHTML = stats.guessDistribution
    .map((count, i) => {
      const pct = Math.round((count / maxDist) * 100);
      const isMax = count === maxDist && count > 0;
      return `
        <div class="flex items-center gap-2 text-sm">
          <span class="w-4 text-gray-500 font-mono text-right">${i + 1}</span>
          <div class="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden">
            <div class="h-full ${isMax ? 'bg-teal-accent' : 'bg-royal-800/70'} rounded-md flex items-center justify-end pr-2 transition-all duration-500"
                 style="width: ${count > 0 ? Math.max(pct, 12) : 0}%">
              ${count > 0 ? `<span class="text-xs font-bold ${isMax ? 'text-royal-950' : 'text-white'}">${count}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const historyEl = $('#stats-history')!;
  if (!stats.history.length) {
    historyEl.innerHTML =
      '<p id="stats-history-empty" class="text-gray-400 text-sm text-center py-4">Nog geen afgeronde spellen.</p>';
    return;
  }

  historyEl.innerHTML = stats.history
    .map((entry) => {
      const dateLabel = new Date(`${entry.date}T12:00:00`).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short',
      });
      const scoreLabel = entry.won ? `${entry.attempts}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
      const icon = entry.won ? '✅' : '❌';
      return `
        <div class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 text-sm">
          <div class="min-w-0">
            <span class="font-semibold text-royal-800">#${entry.puzzleNumber}</span>
            <span class="text-gray-400 ml-2">${dateLabel}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-mono text-xs text-gray-500">${scoreLabel}</span>
            <span>${icon}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderGlobalSolveCount(count: number | null, status: 'ok' | 'loading' | 'test' | 'error' = 'ok') {
  const bannerText = $('#global-solve-text')!;
  const statEl = $('#stat-global-solves');

  if (status === 'loading') {
    bannerText.textContent = 'Community-teller laden…';
    if (statEl) statEl.textContent = '…';
    return;
  }
  if (status === 'test') {
    bannerText.textContent = 'Community-teller uitgeschakeld (testmodus)';
    if (statEl) statEl.textContent = '—';
    return;
  }
  if (status === 'error' || count === null) {
    bannerText.textContent = 'Community-teller tijdelijk niet beschikbaar';
    if (statEl) statEl.textContent = '—';
    return;
  }

  bannerText.innerHTML = formatGlobalSolveText(count);
  if (statEl) {
    statEl.textContent = count.toLocaleString('nl-NL');
    statEl.classList.add('animate-pulse');
    setTimeout(() => statEl.classList.remove('animate-pulse'), 600);
  }
}

async function refreshGlobalSolveCount() {
  if (!state.dateKey) return;
  if (USE_RANDOM_TARGET_FOR_TESTING) {
    renderGlobalSolveCount(null, 'test');
    return;
  }
  renderGlobalSolveCount(null, 'loading');
  const count = await fetchGlobalSolveCount();
  if (count === null) {
    renderGlobalSolveCount(null, 'error');
    return;
  }
  state.globalSolveCount = count;
  renderGlobalSolveCount(count);
}

function startGlobalCountPolling() {
  if (globalCountInterval) clearInterval(globalCountInterval);
  if (USE_RANDOM_TARGET_FOR_TESTING) return;
  globalCountInterval = setInterval(refreshGlobalSolveCount, GLOBAL_COUNT_REFRESH_MS);
}

async function syncGlobalWinIfNeeded() {
  if (!state.won || !state.resultRecorded) return;
  const count = await reportGlobalWin();
  if (count !== null) {
    state.globalSolveCount = count;
    renderGlobalSolveCount(count);
  }
}

function saveTodayGame() {
  if (USE_RANDOM_TARGET_FOR_TESTING || !state.stats || !state.dateKey || !state.target) return;
  state.stats.todayGame = {
    date: state.dateKey,
    puzzleNumber: state.puzzleNumber,
    targetId: state.target.id,
    guesses: state.guesses.map(serializeWaterschapGuess),
    attempts: state.attempts,
    gameOver: state.gameOver,
    won: state.won,
  };
  saveWaterschapleStats(state.stats);
}

function renderAttemptDots() {
  const attemptDots = $('#attempt-dots')!;
  attemptDots.innerHTML = '';
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const dot = document.createElement('div');
    const used = i < state.attempts;
    const current = i === state.attempts && !state.gameOver;
    dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
      used ? 'bg-teal-accent' : current ? 'bg-white/40 ring-2 ring-teal-accent' : 'bg-white/15'
    }`;
    attemptDots.appendChild(dot);
  }
}

function updateAttemptLabel() {
  $('#attempt-current')!.textContent = String(
    state.gameOver ? state.attempts : Math.min(state.attempts + 1, MAX_ATTEMPTS),
  );
}

function filterWaterschappen(query: string): Waterschap[] {
  const q = query.trim().toLowerCase();
  if (!q) return WATERSCHAPPEN;
  return WATERSCHAPPEN.filter((w) => w.name.toLowerCase().includes(q));
}

function showAutocomplete(items: Waterschap[]) {
  const autocompleteList = $('#autocomplete-list')!;
  const guessInput = $('#guess-input') as HTMLInputElement;
  if (!guessInput.value.trim()) {
    hideAutocomplete();
    return;
  }
  autocompleteList.innerHTML = '';
  if (items.length === 0) {
    hideAutocomplete();
    return;
  }
  items.forEach((w, i) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.dataset.id = w.id;
    li.className = `px-4 py-2.5 cursor-pointer text-royal-950 text-sm transition-colors ${
      i === state.highlightedIndex ? 'bg-teal-accent/20' : 'hover:bg-royal-800/10'
    }`;
    li.textContent = w.name;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectWaterschap(w);
    });
    autocompleteList.appendChild(li);
  });
  autocompleteList.classList.remove('hidden');
  guessInput.setAttribute('aria-expanded', 'true');
}

function hideAutocomplete() {
  const autocompleteList = $('#autocomplete-list')!;
  const guessInput = $('#guess-input') as HTMLInputElement;
  autocompleteList.classList.add('hidden');
  autocompleteList.innerHTML = '';
  guessInput.setAttribute('aria-expanded', 'false');
  state.highlightedIndex = -1;
}

function selectWaterschap(w: Waterschap) {
  const guessInput = $('#guess-input') as HTMLInputElement;
  guessInput.value = w.name;
  guessInput.dataset.selectedId = w.id;
  hideAutocomplete();
}

function getSelectedWaterschap(): Waterschap | undefined {
  const guessInput = $('#guess-input') as HTMLInputElement;
  const id = guessInput.dataset.selectedId;
  if (id) {
    const byId = WATERSCHAPPEN.find((w) => w.id === id);
    if (byId && byId.name === guessInput.value.trim()) return byId;
  }
  return WATERSCHAPPEN.find((w) => w.name.toLowerCase() === guessInput.value.trim().toLowerCase());
}

function showError(msg: string) {
  const inputError = $('#input-error')!;
  inputError.textContent = msg;
  inputError.classList.remove('hidden');
}

function hideError() {
  $('#input-error')!.classList.add('hidden');
}

function addGuessRow(guess: WaterschapGuess, skipAnimation = false) {
  const { waterschap, distance, arrow, proximity, isCorrect } = guess;
  const row = document.createElement('div');
  row.className =
    'guess-row bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4 flex items-center gap-3';

  const proximityColor = isCorrect
    ? 'text-green-400'
    : proximity >= 80
      ? 'text-yellow-400'
      : proximity >= 50
        ? 'text-orange-400'
        : 'text-red-400';

  row.innerHTML = `
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-sm sm:text-base truncate">${waterschap.name}</p>
      <p class="text-white/50 text-xs mt-0.5">${Math.round(distance)} km</p>
    </div>
    <div class="text-2xl sm:text-3xl flex-shrink-0" title="Richting doel" aria-label="Richting: ${arrow}">${arrow}</div>
    <div class="flex-shrink-0 text-right w-16 sm:w-20">
      <p class="${proximityColor} font-bold text-lg sm:text-xl">${proximity}%</p>
      <div class="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div class="h-full rounded-full proximity-bar transition-all duration-700" style="width: ${proximity}%"></div>
      </div>
    </div>
  `;

  $('#guess-history')!.appendChild(row);
  if (!skipAnimation) requestAnimationFrame(() => row.classList.add('visible'));
  else row.classList.add('visible');
}

function buildShareText(): string {
  const tiles = state.guesses.map((g) => proximityToShareEmoji(g.proximity, g.isCorrect)).join('');
  const padding = '⬜'.repeat(MAX_ATTEMPTS - state.guesses.length);
  return `Waterschaple #${state.puzzleNumber} ${state.won ? state.attempts : 'X'}/${MAX_ATTEMPTS} 🌊${tiles}${padding}`;
}

async function endGame() {
  const guessInput = $('#guess-input') as HTMLInputElement;
  const btnGuess = $('#btn-guess') as HTMLButtonElement;
  guessInput.disabled = true;
  btnGuess.disabled = true;

  const shareText = buildShareText();
  const grid = state.guesses.map((g) => proximityToShareEmoji(g.proximity, g.isCorrect)).join('');

  if (!state.resultRecorded && state.stats && state.dateKey) {
    const prevStreak = state.stats.currentStreak;
    recordWaterschapleResult(state.stats, {
      won: state.won,
      attempts: state.attempts,
      puzzleNumber: state.puzzleNumber,
      dateKey: state.dateKey,
      grid,
    });
    state.resultRecorded = true;
    renderStatsUI(state.stats);

    const streakEl = $('#result-streak')!;
    if (state.won) {
      streakEl.classList.remove('hidden');
      const newStreak = state.stats.currentStreak;
      if (newStreak === 1 && prevStreak === 0) {
        streakEl.textContent = '🔥 Reeks gestart! 1 dag op rij.';
      } else if (newStreak > prevStreak) {
        streakEl.textContent = `🔥 Reeks: ${newStreak} ${newStreak === 1 ? 'dag' : 'dagen'} op rij!`;
      } else {
        streakEl.textContent = `🔥 Huidige reeks: ${newStreak} ${newStreak === 1 ? 'dag' : 'dagen'}`;
      }
    } else {
      streakEl.classList.remove('hidden');
      streakEl.textContent =
        prevStreak > 0
          ? `💔 Reeks verbroken (was ${prevStreak} ${prevStreak === 1 ? 'dag' : 'dagen'})`
          : 'Morgen een nieuwe kans op een reeks!';
    }

    if (state.won) {
      const count = await reportGlobalWin();
      if (count !== null) {
        state.globalSolveCount = count;
        renderGlobalSolveCount(count);
      }
    }
  } else {
    $('#result-streak')!.classList.add('hidden');
  }

  $('#share-preview')!.textContent = shareText;

  if (state.won) {
    $('#result-emoji')!.textContent = '🏆';
    $('#result-title')!.textContent = 'Gefeliciteerd!';
    const communityNote =
      state.globalSolveCount != null
        ? ` Jij bent een van de ${state.globalSolveCount.toLocaleString('nl-NL')} spelers die het vandaag raadden!`
        : '';
    $('#result-message')!.textContent =
      `Je hebt het juiste waterschap gevonden in ${state.attempts} ${state.attempts === 1 ? 'poging' : 'pogingen'}!${communityNote}`;
    $('#result-answer')!.classList.add('hidden');
  } else {
    $('#result-emoji')!.textContent = '🌊';
    $('#result-title')!.textContent = 'Volgende keer beter!';
    $('#result-message')!.textContent = 'Je pogingen zijn op. Het juiste waterschap was:';
    $('#result-answer')!.classList.remove('hidden');
    $('#result-answer-name')!.textContent = state.target?.name ?? '—';
  }

  openModal('result');
}

function submitGuess() {
  if (state.gameOver || !state.target) return;

  const selected = getSelectedWaterschap();
  if (!selected) {
    showError('Kies een geldig waterschap uit de lijst.');
    return;
  }
  hideError();

  if (state.guesses.some((g) => g.waterschap.id === selected.id)) {
    showError('Je hebt dit waterschap al geraden.');
    return;
  }

  const distance = haversineDistance(selected.lat, selected.lng, state.target.lat, state.target.lng);
  const bearing = calculateBearing(selected.lat, selected.lng, state.target.lat, state.target.lng);
  const arrow = bearingToArrow(bearing);
  const proximity = distanceToProximity(distance);
  const isCorrect = selected.id === state.target.id;

  const guess: WaterschapGuess = { waterschap: selected, distance, bearing, arrow, proximity, isCorrect };
  state.guesses.push(guess);
  state.attempts++;

  $('#empty-state')?.remove();
  addGuessRow(guess);

  const guessInput = $('#guess-input') as HTMLInputElement;
  guessInput.value = '';
  delete guessInput.dataset.selectedId;

  renderAttemptDots();
  updateAttemptLabel();
  hideAutocomplete();
  guessInput.blur();

  if (isCorrect) {
    state.gameOver = true;
    state.won = true;
    saveTodayGame();
    void endGame();
  } else if (state.attempts >= MAX_ATTEMPTS) {
    state.gameOver = true;
    state.won = false;
    saveTodayGame();
    void endGame();
  } else {
    saveTodayGame();
  }
}

function showCompletedBanner() {
  const entry = state.stats?.history.find((h) => h.date === state.dateKey);
  const banner = document.createElement('div');
  banner.id = 'completed-banner';
  banner.className =
    'mb-4 py-3 px-4 rounded-xl bg-teal-accent/15 border border-teal-accent/30 text-center text-sm';
  if (entry?.won) {
    banner.innerHTML = `✅ Vandaag al gewonnen in <strong>${entry.attempts}</strong> ${entry.attempts === 1 ? 'poging' : 'pogingen'}! Bekijk je <button type="button" id="banner-stats-link" class="underline text-teal-light font-semibold">statistieken</button>.`;
  } else {
    banner.innerHTML = `❌ Vandaag al gespeeld. Het antwoord was <strong>${state.target?.name ?? 'onbekend'}</strong>. Morgen een nieuwe puzzel!`;
  }
  const wrapper = document.querySelector('main .max-w-lg')!;
  $('#completed-banner')?.remove();
  wrapper.insertBefore(banner, wrapper.firstElementChild);
  $('#banner-stats-link')?.addEventListener('click', openStatsModal);
}

function openStatsModal() {
  if (state.stats) renderStatsUI(state.stats);
  if (state.globalSolveCount !== null) {
    const statEl = $('#stat-global-solves');
    if (statEl) statEl.textContent = state.globalSolveCount.toLocaleString('nl-NL');
  }
  openModal('stats');
}

function closeModal(name: string) {
  closeA11yModal(name);
}

async function shareScore() {
  const text = buildShareText();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  $('#share-toast')!.classList.remove('hidden');
  setTimeout(() => $('#share-toast')!.classList.add('hidden'), 2500);
}

function bindEvents() {
  const guessInput = $('#guess-input') as HTMLInputElement;

  guessInput.addEventListener('input', () => {
    delete guessInput.dataset.selectedId;
    hideError();
    const items = filterWaterschappen(guessInput.value);
    state.highlightedIndex = 0;
    showAutocomplete(items);
  });

  guessInput.addEventListener('focus', () => {
    if (guessInput.value.trim()) {
      showAutocomplete(filterWaterschappen(guessInput.value));
    }
  });

  guessInput.addEventListener('blur', () => {
    setTimeout(hideAutocomplete, 150);
  });

  guessInput.addEventListener('keydown', (e) => {
    const items = filterWaterschappen(guessInput.value);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.highlightedIndex = Math.min(state.highlightedIndex + 1, items.length - 1);
      showAutocomplete(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.highlightedIndex = Math.max(state.highlightedIndex - 1, 0);
      showAutocomplete(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.highlightedIndex >= 0 && items[state.highlightedIndex]) {
        selectWaterschap(items[state.highlightedIndex]);
      }
      submitGuess();
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  $('#btn-guess')!.addEventListener('click', submitGuess);
  $('#btn-stats')!.addEventListener('click', openStatsModal);
  $('#stats-bar')!.addEventListener('click', openStatsModal);
  $('#btn-info')!.addEventListener('click', () => openModal('info'));
  $('#btn-share')!.addEventListener('click', () => void shareScore());
  $('#btn-close-result')!.addEventListener('click', () => closeModal('result'));

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = (el as HTMLElement).dataset.close;
      if (target) closeModal(target);
    });
  });
}

export function initWaterschaple() {
  const today = new Date();
  state.dateKey = getDateKey(today);
  state.puzzleNumber = getPuzzleNumber(today);
  state.stats = loadWaterschapleStats();
  state.resultRecorded = state.stats.completedDates.includes(state.dateKey);

  const expectedTarget = USE_RANDOM_TARGET_FOR_TESTING ? null : getWaterschapDailyTarget(today);
  const saved = !USE_RANDOM_TARGET_FOR_TESTING && state.stats.todayGame;
  const canRestore =
    !!saved &&
    state.stats.todayGame!.date === state.dateKey &&
    state.stats.todayGame!.puzzleNumber === state.puzzleNumber &&
    state.stats.todayGame!.targetId === expectedTarget?.id;

  if (canRestore && state.stats.todayGame) {
    const tg = state.stats.todayGame;
    state.target = WATERSCHAPPEN.find((w) => w.id === tg.targetId) ?? null;
    state.guesses = tg.guesses.map(deserializeWaterschapGuess).filter((g): g is WaterschapGuess => g !== null);
    state.attempts = tg.attempts;
    state.gameOver = tg.gameOver;
    state.won = tg.won;
  } else {
    state.target = USE_RANDOM_TARGET_FOR_TESTING
      ? WATERSCHAPPEN[Math.floor(Math.random() * WATERSCHAPPEN.length)]
      : expectedTarget;
    state.guesses = [];
    state.attempts = 0;
    state.gameOver = state.resultRecorded;
    state.won = state.resultRecorded
      ? (state.stats.history.find((h) => h.date === state.dateKey)?.won ?? false)
      : false;
  }

  if (import.meta.env.DEV && state.target) {
    console.log('[Waterschaple debug] Doel:', state.target.name);
  }

  const dateStr = today.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  $('#game-date-label')!.textContent = `Puzzel #${state.puzzleNumber} · ${dateStr}`;

  const yesterday = getYesterdayWaterschapTarget(today);
  const yesterdayPuzzle = getPuzzleNumberFromKey(getYesterdayDateKey(today));
  $('#yesterday-puzzle-number')!.textContent = String(yesterdayPuzzle);
  $('#yesterday-waterschap-name')!.textContent = yesterday.name;

  renderAttemptDots();
  updateAttemptLabel();
  renderStatsUI(state.stats);

  const guessInput = $('#guess-input') as HTMLInputElement;
  const btnGuess = $('#btn-guess') as HTMLButtonElement;
  guessInput.value = '';
  guessInput.disabled = state.gameOver;
  btnGuess.disabled = state.gameOver;
  hideAutocomplete();

  const guessHistory = $('#guess-history')!;
  guessHistory.innerHTML = '';
  if (state.guesses.length === 0 && !state.gameOver) {
    const empty = document.createElement('p');
    empty.id = 'empty-state';
    empty.className = 'text-white/30 text-sm text-center py-6';
    empty.textContent = 'Nog geen pogingen. Kies een waterschap en druk op Raad.';
    guessHistory.appendChild(empty);
  } else {
    state.guesses.forEach((g) => addGuessRow(g, true));
  }

  if (state.gameOver && state.resultRecorded) showCompletedBanner();

  bindEvents();
  void refreshGlobalSolveCount().then(() => syncGlobalWinIfNeeded());
  startGlobalCountPolling();
}
