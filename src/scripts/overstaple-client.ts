import {
  GLOBAL_COUNT_REFRESH_MS,
  USE_RANDOM_TARGET_FOR_TESTING,
} from '../lib/overstaple/config';
import {
  loadOverstapleStats,
  saveOverstapleStats,
  serializeOverstapleGuess,
  deserializeOverstapleGuess,
  recordOverstapleResult,
  getOverstapleWinRate,
} from '../lib/overstaple/stats';
import { qualityToEmoji } from '../lib/overstaple/logic';
import { renderOverstapleMap } from '../lib/overstaple/map';
import { formatGlobalSolveText } from '../lib/global-counter';
import type { OverstapleMapData } from '../lib/overstaple/types';
import { openModal, closeModal as closeA11yModal } from '../lib/modal-a11y';
import type {
  OverstapleDailyMeta,
  OverstapleGameState,
  OverstapleGuess,
  OverstapleGuessApiResponse,
  OverstaplePlayerStats,
} from '../lib/overstaple/types';
import type { StationPublic } from '../data/stations';

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

const state: OverstapleGameState = {
  guesses: [],
  guessCount: 0,
  gameOver: false,
  won: false,
  puzzleNumber: 1,
  dateKey: null,
  stats: null,
  resultRecorded: false,
  globalSolveCount: null,
  stations: [],
  route: null,
  correctIds: [],
  map: null,
  yesterday: null,
};

let globalCountInterval: ReturnType<typeof setInterval> | null = null;
let highlightedIndex = -1;

async function fetchDailyMeta(
  correctIds: string[] = [],
  gameOver = false,
  guesses: { id: string; quality: string }[] = [],
): Promise<OverstapleDailyMeta | null> {
  try {
    const params = new URLSearchParams();
    if (correctIds.length) params.set('correctIds', correctIds.join(','));
    if (gameOver) params.set('gameOver', 'true');
    if (guesses.length) {
      params.set('guesses', guesses.map((g) => `${g.id}:${g.quality}`).join(','));
    }
    const qs = params.toString();
    const res = await fetch(`/api/overstaple/daily${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as OverstapleDailyMeta;
  } catch (e) {
    console.warn('[Overstaple] Daily meta ophalen mislukt:', e);
    return null;
  }
}

function renderStatsUI(stats: OverstaplePlayerStats) {
  const winRate = getOverstapleWinRate(stats);

  $('#header-streak')!.textContent = String(stats.currentStreak);
  $('#header-wins')!.textContent = String(stats.gamesWon);
  $('#header-winrate')!.textContent = `${winRate}%`;

  $('#stat-current-streak')!.textContent = String(stats.currentStreak);
  $('#stat-max-streak')!.textContent = String(stats.maxStreak);
  $('#stat-wins')!.textContent = String(stats.gamesWon);
  $('#stat-played')!.textContent = String(stats.gamesPlayed);
  $('#stat-winrate')!.textContent = `${winRate}%`;

  const distEl = $('#guess-distribution')!;
  const dist = stats.guessDistribution;
  const maxDist = Math.max(...dist, 1);
  if (!dist.length) {
    distEl.innerHTML = '<p class="text-gray-400 text-sm text-center py-2">Nog geen gewonnen spellen.</p>';
  } else {
    distEl.innerHTML = dist
      .map((count, i) => {
        const pct = Math.round((count / maxDist) * 100);
        const isMax = count === maxDist && count > 0;
        return `
          <div class="flex items-center gap-2 text-sm">
            <span class="w-6 text-gray-500 font-mono text-right">${i + 1}</span>
            <div class="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden">
              <div class="h-full ${isMax ? 'bg-transfer-accent' : 'bg-royal-800/70'} rounded-md flex items-center justify-end pr-2"
                   style="width: ${count > 0 ? Math.max(pct, 12) : 0}%">
                ${count > 0 ? `<span class="text-xs font-bold ${isMax ? 'text-royal-950' : 'text-white'}">${count}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const historyEl = $('#stats-history')!;
  if (!stats.history.length) {
    historyEl.innerHTML =
      '<p class="text-gray-400 text-sm text-center py-4">Nog geen afgeronde spellen.</p>';
    return;
  }

  historyEl.innerHTML = stats.history
    .map((entry) => {
      const dateLabel = new Date(`${entry.date}T12:00:00`).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short',
      });
      const scoreLabel = entry.won
        ? `${entry.guesses} pogingen`
        : '…';
      return `
        <div class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 text-sm">
          <div class="min-w-0">
            <span class="font-semibold text-royal-800">#${entry.puzzleNumber}</span>
            <span class="text-gray-400 ml-2">${dateLabel}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-mono text-xs text-gray-500">${scoreLabel}</span>
            <span>${entry.won ? '✅' : '❌'}</span>
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
    if (statEl) statEl.textContent = '…';
    return;
  }
  if (status === 'error' || count === null) {
    bannerText.textContent = 'Community-teller tijdelijk niet beschikbaar';
    if (statEl) statEl.textContent = '…';
    return;
  }

  bannerText.innerHTML = formatGlobalSolveText(count);
  if (statEl) statEl.textContent = count.toLocaleString('nl-NL');
}

function renderRoute() {
  if (!state.route) return;
  $('#route-start')!.textContent = state.route.start.name;
  $('#route-end')!.textContent = state.route.end.name;
  $('#route-intermediate-count')!.textContent = String(state.route.intermediateCount);
}

function renderMap(map: OverstapleMapData | null) {
  const container = $('#route-map');
  if (!container || !map) return;
  state.map = map;
  renderOverstapleMap(container, map);
}

function renderProgress() {
  if (!state.route) return;
  const remaining = state.route.intermediateCount - state.correctIds.length;
  $('#remaining-count')!.textContent = String(Math.max(0, remaining));
  $('#guess-current')!.textContent = String(
    state.gameOver ? state.guessCount : state.guessCount + 1,
  );
}

function qualityLabel(quality: OverstapleGuess['quality']): string {
  switch (quality) {
    case 'connected':
      return 'Op het pad en verbonden met start';
    case 'green':
      return 'Op het kortste pad';
    case 'orange':
      return 'Bijna op het kortste pad';
    case 'red':
      return 'Niet op route';
    default:
      return '';
  }
}

function addGuessRow(guess: OverstapleGuess, skipAnimation = false) {
  const row = document.createElement('div');
  row.className =
    'guess-row bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3';

  const emoji = qualityToEmoji(guess.quality);
  row.innerHTML = `
    <div class="text-2xl flex-shrink-0" title="${qualityLabel(guess.quality)}">${emoji}</div>
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-sm truncate">${guess.station.name}
        <span class="text-white/40 font-normal">(${guess.station.province})</span>
      </p>
      <p class="text-white/50 text-xs mt-0.5">${qualityLabel(guess.quality)}</p>
    </div>
  `;

  $('#guess-history')!.appendChild(row);
  if (!skipAnimation) requestAnimationFrame(() => row.classList.add('visible'));
  else row.classList.add('visible');
}

function buildShareText(): string {
  const tiles = state.guesses.map((g) => qualityToEmoji(g.quality)).join('');
  const route =
    state.route ? `${state.route.start.name} → ${state.route.end.name}` : '';
  return `Overstaple #${state.puzzleNumber} ${state.guessCount} 🔄\n${route}\n${tiles}`;
}

function saveTodayGame() {
  if (USE_RANDOM_TARGET_FOR_TESTING || !state.stats || !state.dateKey) return;
  state.stats.todayGame = {
    date: state.dateKey,
    puzzleNumber: state.puzzleNumber,
    guesses: state.guesses.map(serializeOverstapleGuess),
    guessCount: state.guessCount,
    gameOver: state.gameOver,
    won: state.won,
    correctIds: state.correctIds,
    startName: state.route?.start.name,
    endName: state.route?.end.name,
  };
  saveOverstapleStats(state.stats);
}

function filterStations(query: string): StationPublic[] {
  const q = query.trim().toLowerCase();
  const guessed = new Set(state.guesses.map((g) => g.station.id));
  const blocked = new Set([
    state.route?.start.id,
    state.route?.end.id,
    ...guessed,
  ].filter(Boolean) as string[]);

  return state.stations.filter((s) => {
    if (blocked.has(s.id)) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q);
  });
}

function hideAutocomplete() {
  $('#autocomplete-list')!.classList.add('hidden');
  $('#autocomplete-list')!.innerHTML = '';
  ($('#guess-input') as HTMLInputElement).setAttribute('aria-expanded', 'false');
  highlightedIndex = -1;
}

function showAutocomplete(items: StationPublic[]) {
  const list = $('#autocomplete-list')!;
  const input = $('#guess-input') as HTMLInputElement;
  if (!input.value.trim()) {
    hideAutocomplete();
    return;
  }
  list.innerHTML = '';
  if (!items.length) {
    hideAutocomplete();
    return;
  }
  items.forEach((s, i) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.dataset.id = s.id;
    li.className = `px-4 py-2.5 cursor-pointer text-royal-950 text-sm ${
      i === highlightedIndex ? 'bg-transfer-accent/20' : 'hover:bg-royal-800/10'
    }`;
    li.innerHTML = `<span class="font-medium">${s.name}</span> <span class="text-gray-400 text-xs">(${s.province})</span>`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectStation(s);
    });
    list.appendChild(li);
  });
  list.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
}

function selectStation(s: StationPublic) {
  const input = $('#guess-input') as HTMLInputElement;
  input.value = s.name;
  input.dataset.selectedId = s.id;
  hideAutocomplete();
}

function getSelectedStation(): StationPublic | undefined {
  const input = $('#guess-input') as HTMLInputElement;
  const id = input.dataset.selectedId;
  if (id) {
    const byId = state.stations.find((s) => s.id === id);
    if (byId && byId.name === input.value.trim()) return byId;
  }
  return state.stations.find((s) => s.name.toLowerCase() === input.value.trim().toLowerCase());
}

function showError(msg: string) {
  const el = $('#input-error')!;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  $('#input-error')!.classList.add('hidden');
}

async function submitGuess() {
  if (state.gameOver) return;
  hideError();

  const station = getSelectedStation();
  if (!station) {
    showError('Kies een geldig station uit de lijst.');
    return;
  }

  if (station.id === state.route?.start.id || station.id === state.route?.end.id) {
    showError('Start- en eindstation kun je niet raden.');
    return;
  }

  const btn = $('#btn-guess') as HTMLButtonElement;
  btn.disabled = true;

  try {
    const res = await fetch('/api/overstaple/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId: station.id,
        puzzleNumber: state.puzzleNumber,
        dateKey: state.dateKey,
        guessCount: state.guessCount + 1,
        correctIds: state.correctIds,
        guessedIds: state.guesses.map((g) => g.station.id),
        guesses: state.guesses.map((g) => ({ id: g.station.id, quality: g.quality })),
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      showError(err.error ?? 'Kon gok niet verwerken.');
      return;
    }

    const data = (await res.json()) as OverstapleGuessApiResponse;
    const guess: OverstapleGuess = {
      station: data.station,
      quality: data.quality,
      isDuplicate: data.isDuplicate,
    };

    if (!data.isDuplicate) {
      state.guesses.push(guess);
      state.guessCount++;
    } else {
      showError('Dit station heb je al geraden.');
      return;
    }

    state.correctIds = data.correctIds;
    state.globalSolveCount = data.globalSolveCount;
    renderMap(data.map);

    $('#empty-state')?.remove();
    addGuessRow(guess);

    const input = $('#guess-input') as HTMLInputElement;
    input.value = '';
    delete input.dataset.selectedId;

    renderProgress();
    renderGlobalSolveCount(state.globalSolveCount);
    saveTodayGame();

    if (data.gameOver) {
      state.gameOver = true;
      state.won = data.won;
      await endGame(data);
    }
  } catch (e) {
    console.warn('[Overstaple] Gok mislukt:', e);
    showError('Netwerkfout. Probeer opnieuw.');
  } finally {
    btn.disabled = state.gameOver;
  }
}

async function endGame(_lastResponse?: OverstapleGuessApiResponse) {
  const input = $('#guess-input') as HTMLInputElement;
  const btn = $('#btn-guess') as HTMLButtonElement;
  input.disabled = true;
  btn.disabled = true;

  const shareText = buildShareText();
  const grid = state.guesses.map((g) => qualityToEmoji(g.quality)).join('');

  if (!state.resultRecorded && state.stats && state.dateKey && state.won) {
    const prevStreak = state.stats.currentStreak;
    recordOverstapleResult(state.stats, {
      won: true,
      guesses: state.guessCount,
      puzzleNumber: state.puzzleNumber,
      dateKey: state.dateKey,
      grid,
    });
    state.resultRecorded = true;
    renderStatsUI(state.stats);

    const streakEl = $('#result-streak')!;
    streakEl.classList.remove('hidden');
    const ns = state.stats.currentStreak;
    streakEl.textContent =
      ns === 1 && prevStreak === 0
        ? '🔥 Reeks gestart! 1 dag op rij.'
        : `🔥 Reeks: ${ns} ${ns === 1 ? 'dag' : 'dagen'} op rij!`;
  }

  $('#share-preview')!.textContent = shareText;

  $('#result-emoji')!.textContent = '🏆';
  $('#result-title')!.textContent = 'Goede reis!';
  $('#result-message')!.textContent = `Je hebt alle ${state.route?.intermediateCount} tussenstations gevonden in ${state.guessCount} pogingen!`;
  $('#result-route')!.classList.add('hidden');

  openModal('result');
}

function setupModals() {
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = (el as HTMLElement).dataset.close;
      if (target) closeA11yModal(target);
    });
  });

  $('#btn-stats')?.addEventListener('click', () => openModal('stats'));
  $('#btn-info')?.addEventListener('click', () => openModal('info'));
  $('#stats-bar')?.addEventListener('click', () => openModal('stats'));
  $('#btn-close-result')?.addEventListener('click', () => closeA11yModal('result'));

  $('#btn-share')?.addEventListener('click', async () => {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      $('#share-toast')!.classList.remove('hidden');
      setTimeout(() => $('#share-toast')!.classList.add('hidden'), 2500);
    } catch {
      $('#share-preview')!.textContent = text;
    }
  });
}

function setupInput() {
  const input = $('#guess-input') as HTMLInputElement;
  const btn = $('#btn-guess') as HTMLButtonElement;

  input.addEventListener('input', () => {
    delete input.dataset.selectedId;
    hideError();
    showAutocomplete(filterStations(input.value).slice(0, 8));
  });

  input.addEventListener('keydown', (e) => {
    const items = filterStations(input.value).slice(0, 8);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
      showAutocomplete(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      showAutocomplete(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && items[highlightedIndex]) {
        selectStation(items[highlightedIndex]);
      }
      submitGuess();
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  input.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));
  btn.addEventListener('click', () => submitGuess());
}

export async function initOverstaple() {
  renderGlobalSolveCount(null, 'loading');

  const meta = await fetchDailyMeta();
  if (!meta) {
    renderGlobalSolveCount(null, 'error');
    $('#game-date-label')!.textContent = 'Kon puzzel niet laden';
    return;
  }

  state.dateKey = meta.dateKey;
  state.puzzleNumber = meta.puzzleNumber;
  state.stations = meta.stations;
  state.route = meta.route;
  state.map = meta.map;
  state.yesterday = meta.yesterday;
  state.globalSolveCount = meta.globalSolveCount;
  state.stats = loadOverstapleStats();
  state.resultRecorded = state.stats.completedDates.includes(state.dateKey);

  const saved = !USE_RANDOM_TARGET_FOR_TESTING && state.stats.todayGame;
  const canRestore =
    !!saved &&
    state.stats.todayGame!.date === state.dateKey &&
    state.stats.todayGame!.puzzleNumber === state.puzzleNumber;

  if (canRestore && state.stats.todayGame) {
    const tg = state.stats.todayGame;
    state.guesses = tg.guesses.map(deserializeOverstapleGuess).filter((g): g is OverstapleGuess => g !== null);
    state.guessCount = tg.guessCount;
    state.gameOver = tg.gameOver;
    state.won = tg.won;
    state.correctIds = tg.correctIds ?? [];
  } else {
    state.guesses = [];
    state.guessCount = 0;
    state.gameOver = state.resultRecorded;
    state.won = state.resultRecorded
      ? (state.stats.history.find((h) => h.date === state.dateKey)?.won ?? false)
      : false;
    state.correctIds = [];
  }

  let mapData = meta.map;
  if (state.correctIds.length > 0 || state.gameOver || state.guesses.length > 0) {
    const restoredMeta = await fetchDailyMeta(
      state.correctIds,
      state.gameOver,
      state.guesses.map((g) => ({ id: g.station.id, quality: g.quality })),
    );
    if (restoredMeta) mapData = restoredMeta.map;
  }

  const dateLabel = new Date(`${state.dateKey}T12:00:00`).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  $('#game-date-label')!.textContent = `Puzzel #${state.puzzleNumber} · ${dateLabel}`;

  if (meta.yesterday) {
    $('#yesterday-puzzle-number')!.textContent = String(meta.yesterday.puzzleNumber);
    $('#yesterday-route')!.textContent = `${meta.yesterday.start.name} → ${meta.yesterday.end.name}`;
  }

  renderRoute();
  renderMap(mapData);
  renderProgress();
  renderStatsUI(state.stats);
  renderGlobalSolveCount(meta.globalSolveCount);

  if (state.guesses.length) {
    $('#empty-state')?.remove();
    state.guesses.forEach((g) => addGuessRow(g, true));
  }

  if (state.gameOver) {
    ($('#guess-input') as HTMLInputElement).disabled = true;
    ($('#btn-guess') as HTMLButtonElement).disabled = true;
  }

  setupInput();
  setupModals();

  if (!USE_RANDOM_TARGET_FOR_TESTING) {
    globalCountInterval = setInterval(async () => {
      const m = await fetchDailyMeta();
      if (m) {
        state.globalSolveCount = m.globalSolveCount;
        renderGlobalSolveCount(m.globalSolveCount);
      }
    }, GLOBAL_COUNT_REFRESH_MS);
  }
}
