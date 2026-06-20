import { MAX_ATTEMPTS, GLOBAL_COUNT_REFRESH_MS, USE_RANDOM_TARGET_FOR_TESTING, HINT_FLAG_AFTER_ATTEMPT, HINT_PROVINCE_AFTER_ATTEMPT } from '../lib/gemeentedle/config';
import { proximityToShareEmoji } from '../lib/game-logic';
import {
  loadStats,
  saveStats,
  serializeGuess,
  deserializeGuess,
  recordGameResult,
  getWinRate,
} from '../lib/stats';
import { formatGlobalSolveText } from '../lib/global-counter';
import { openModal, closeModal as closeA11yModal } from '../lib/modal-a11y';
import type {
  DailyMeta,
  GameState,
  GemeentePublic,
  Guess,
  GuessApiResponse,
  PlayerStats,
  UnlockedHints,
} from '../lib/types';

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

const state: GameState = {
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
  gemeenten: [],
  targetName: null,
  targetProvince: null,
  yesterday: null,
  unlockedHints: { flagUrl: null, province: null },
};

let globalCountInterval: ReturnType<typeof setInterval> | null = null;
let lastHistoricalWins: number | null = null;

async function fetchDailyMeta(): Promise<DailyMeta | null> {
  try {
    const res = await fetch('/api/daily');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DailyMeta;
  } catch (e) {
    console.warn('[Gemeentedle] Daily meta ophalen mislukt:', e);
    return null;
  }
}

function renderStatsUI(stats: PlayerStats) {
  const winRate = getWinRate(stats);

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
            <div class="h-full ${isMax ? 'bg-orange-accent' : 'bg-royal-800/70'} rounded-md flex items-center justify-end pr-2 transition-all duration-500"
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
    if (statEl) statEl.textContent = '…';
    return;
  }
  if (status === 'error' || count === null) {
    bannerText.textContent = 'Community-teller tijdelijk niet beschikbaar';
    if (statEl) statEl.textContent = '…';
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
  const meta = await fetchDailyMeta();
  if (!meta) {
    renderGlobalSolveCount(null, 'error');
    return;
  }
  state.globalSolveCount = meta.globalSolveCount;
  renderGlobalSolveCount(meta.globalSolveCount);
}

function startGlobalCountPolling() {
  if (globalCountInterval) clearInterval(globalCountInterval);
  if (USE_RANDOM_TARGET_FOR_TESTING) return;
  globalCountInterval = setInterval(refreshGlobalSolveCount, GLOBAL_COUNT_REFRESH_MS);
}

function saveTodayGame() {
  if (USE_RANDOM_TARGET_FOR_TESTING || !state.stats || !state.dateKey) return;
  state.stats.todayGame = {
    date: state.dateKey,
    puzzleNumber: state.puzzleNumber,
    guesses: state.guesses.map(serializeGuess),
    attempts: state.attempts,
    gameOver: state.gameOver,
    won: state.won,
    targetName: state.targetName ?? undefined,
    targetProvince: state.targetProvince ?? undefined,
    unlockedHints: state.unlockedHints,
  };
  saveStats(state.stats);
}

function renderAttemptDots() {
  const attemptDots = $('#attempt-dots')!;
  attemptDots.innerHTML = '';
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const dot = document.createElement('div');
    const used = i < state.attempts;
    const current = i === state.attempts && !state.gameOver;
    dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
      used ? 'bg-orange-accent' : current ? 'bg-white/40 ring-2 ring-orange-accent' : 'bg-white/15'
    }`;
    attemptDots.appendChild(dot);
  }
}

function updateAttemptLabel() {
  $('#attempt-current')!.textContent = String(
    state.gameOver ? state.attempts : Math.min(state.attempts + 1, MAX_ATTEMPTS),
  );
}

function filterGemeenten(query: string): GemeentePublic[] {
  const q = query.trim().toLowerCase();
  if (!q) return state.gemeenten;
  return state.gemeenten.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.province.toLowerCase().includes(q),
  );
}

function showAutocomplete(items: GemeentePublic[]) {
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
  items.forEach((g, i) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.dataset.id = g.id;
    li.className = `px-4 py-2.5 cursor-pointer text-royal-950 text-sm transition-colors ${
      i === state.highlightedIndex ? 'bg-orange-accent/20' : 'hover:bg-royal-800/10'
    }`;
    li.innerHTML = `<span class="font-medium">${g.name}</span> <span class="text-gray-400 text-xs">(${g.province})</span>`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectGemeente(g);
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

function selectGemeente(g: GemeentePublic) {
  const guessInput = $('#guess-input') as HTMLInputElement;
  guessInput.value = g.name;
  guessInput.dataset.selectedId = g.id;
  hideAutocomplete();
}

function getSelectedGemeente(): GemeentePublic | undefined {
  const guessInput = $('#guess-input') as HTMLInputElement;
  const id = guessInput.dataset.selectedId;
  if (id) {
    const byId = state.gemeenten.find((g) => g.id === id);
    if (byId && byId.name === guessInput.value.trim()) return byId;
  }
  return state.gemeenten.find((g) => g.name.toLowerCase() === guessInput.value.trim().toLowerCase());
}

function showError(msg: string) {
  const inputError = $('#input-error')!;
  inputError.textContent = msg;
  inputError.classList.remove('hidden');
}

function hideError() {
  $('#input-error')!.classList.add('hidden');
}

function mergeHints(current: UnlockedHints, next: UnlockedHints): UnlockedHints {
  return {
    flagUrl: next.flagUrl ?? current.flagUrl,
    province: next.province ?? current.province,
  };
}

function renderHints() {
  const section = $('#hints-section')!;
  const flagUnlocked = state.attempts >= HINT_FLAG_AFTER_ATTEMPT;
  const provinceUnlocked = state.attempts >= HINT_PROVINCE_AFTER_ATTEMPT;

  section.classList.remove('hidden');

  const flagCard = $('#hint-flag-card')!;
  const flagLocked = $('#hint-flag-locked')!;
  const flagImg = $('#hint-flag-img') as HTMLImageElement;
  const flagMissing = $('#hint-flag-missing')!;

  flagCard.classList.toggle('opacity-40', !flagUnlocked);
  flagCard.classList.toggle('border-orange-accent/30', flagUnlocked);
  flagLocked.classList.toggle('hidden', flagUnlocked);
  flagImg.classList.add('hidden');
  flagMissing.classList.add('hidden');

  if (flagUnlocked) {
    if (state.unlockedHints.flagUrl) {
      flagImg.src = state.unlockedHints.flagUrl;
      flagImg.alt = 'Gemeentevlag (hint)';
      flagImg.classList.remove('hidden');
    } else {
      flagMissing.classList.remove('hidden');
    }
  }

  const provinceCard = $('#hint-province-card')!;
  const provinceLocked = $('#hint-province-locked')!;
  const provinceText = $('#hint-province-text')!;

  provinceCard.classList.toggle('opacity-40', !provinceUnlocked);
  provinceCard.classList.toggle('border-orange-accent/30', provinceUnlocked);
  provinceLocked.classList.toggle('hidden', provinceUnlocked);
  provinceText.classList.toggle('hidden', !provinceUnlocked);

  if (provinceUnlocked && state.unlockedHints.province) {
    provinceText.textContent = state.unlockedHints.province;
  }
}

async function fetchUnlockedHints(attempts: number): Promise<UnlockedHints | null> {
  if (!state.dateKey || attempts < 1) return null;
  try {
    const params = new URLSearchParams({
      puzzle: String(state.puzzleNumber),
      date: state.dateKey,
      attempts: String(attempts),
    });
    const res = await fetch(`/api/daily/hints?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { hints: UnlockedHints };
    return data.hints;
  } catch {
    return null;
  }
}

function addGuessRow(guess: Guess, skipAnimation = false) {
  const { gemeente, distance, arrow, proximity, isCorrect } = guess;
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
      <p class="font-semibold text-sm sm:text-base truncate">${gemeente.name} <span class="text-white/40 font-normal">(${gemeente.province})</span></p>
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
  return `Gemeentedle #${state.puzzleNumber} ${state.won ? state.attempts : 'X'}/${MAX_ATTEMPTS} 🏛️${tiles}${padding}`;
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
    recordGameResult(state.stats, {
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
  } else {
    $('#result-streak')!.classList.add('hidden');
  }

  $('#share-preview')!.textContent = shareText;

  const historicalEl = $('#result-historical')!;
  if (state.won && lastHistoricalWins !== null) {
    historicalEl.classList.remove('hidden');
    historicalEl.textContent =
      lastHistoricalWins === 1
        ? 'Deze gemeente is wereldwijd 1× als dagpuzzel correct geraden.'
        : `Deze gemeente is wereldwijd ${lastHistoricalWins.toLocaleString('nl-NL')}× als dagpuzzel correct geraden.`;
  } else {
    historicalEl.classList.add('hidden');
  }

  if (state.won) {
    $('#result-emoji')!.textContent = '🏆';
    $('#result-title')!.textContent = 'Gefeliciteerd!';
    const communityNote =
      state.globalSolveCount != null
        ? ` Jij bent een van de ${state.globalSolveCount.toLocaleString('nl-NL')} spelers die het vandaag raadden!`
        : '';
    $('#result-message')!.textContent =
      `Je hebt de juiste gemeente gevonden in ${state.attempts} ${state.attempts === 1 ? 'poging' : 'pogingen'}!${communityNote}`;
    $('#result-answer')!.classList.add('hidden');
  } else {
    $('#result-emoji')!.textContent = '🏛️';
    $('#result-title')!.textContent = 'Volgende keer beter!';
    $('#result-message')!.textContent = 'Je pogingen zijn op. De juiste gemeente was:';
    $('#result-answer')!.classList.remove('hidden');
    $('#result-answer-name')!.textContent = state.targetName ?? '…';
    $('#result-answer-province')!.textContent = state.targetProvince ?? '';
  }

  openModal('result');
}

async function submitGuess() {
  if (state.gameOver || !state.dateKey) return;

  const selected = getSelectedGemeente();
  if (!selected) {
    showError('Kies een geldige gemeente uit de lijst.');
    return;
  }
  hideError();

  if (state.guesses.some((g) => g.gemeente.id === selected.id)) {
    showError('Je hebt deze gemeente al geraden.');
    return;
  }

  const nextAttempt = state.attempts + 1;

  let data: GuessApiResponse;
  try {
    const res = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gemeenteId: selected.id,
        puzzleNumber: state.puzzleNumber,
        dateKey: state.dateKey,
        attemptNumber: nextAttempt,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showError((err as { error?: string }).error ?? 'Serverfout. Probeer opnieuw.');
      return;
    }
    data = (await res.json()) as GuessApiResponse;
  } catch {
    showError('Verbinding mislukt. Controleer je internet en probeer opnieuw.');
    return;
  }

  const guess: Guess = {
    gemeente: data.gemeente,
    distance: data.distance,
    bearing: 0,
    arrow: data.arrow,
    proximity: data.proximity,
    isCorrect: data.isCorrect,
  };

  state.guesses.push(guess);
  state.attempts = nextAttempt;
  state.globalSolveCount = data.globalSolveCount;
  renderGlobalSolveCount(data.globalSolveCount);

  if (data.isCorrect) {
    lastHistoricalWins = data.gemeenteHistoricalWins;
  }

  if (data.target) {
    state.targetName = data.target.name;
    state.targetProvince = data.target.province;
  }

  if (data.hints) {
    state.unlockedHints = mergeHints(state.unlockedHints, data.hints);
    renderHints();
  }

  $('#empty-state')?.remove();
  addGuessRow(guess);

  const guessInput = $('#guess-input') as HTMLInputElement;
  guessInput.value = '';
  delete guessInput.dataset.selectedId;

  renderAttemptDots();
  updateAttemptLabel();
  renderHints();
  hideAutocomplete();
  guessInput.blur();

  if (data.isCorrect) {
    state.gameOver = true;
    state.won = true;
    saveTodayGame();
    await endGame();
  } else if (state.attempts >= MAX_ATTEMPTS) {
    state.gameOver = true;
    state.won = false;
    saveTodayGame();
    await endGame();
  } else {
    saveTodayGame();
  }
}

function showCompletedBanner() {
  const entry = state.stats?.history.find((h) => h.date === state.dateKey);
  const banner = document.createElement('div');
  banner.id = 'completed-banner';
  banner.className =
    'mb-4 py-3 px-4 rounded-xl bg-orange-accent/15 border border-orange-accent/30 text-center text-sm';
  if (entry?.won) {
    banner.innerHTML = `✅ Vandaag al gewonnen in <strong>${entry.attempts}</strong> ${entry.attempts === 1 ? 'poging' : 'pogingen'}! Bekijk je <button type="button" id="banner-stats-link" class="underline text-orange-light font-semibold">statistieken</button>.`;
  } else {
    const name = state.targetName ?? 'onbekend';
    banner.innerHTML = `❌ Vandaag al gespeeld. Het antwoord was <strong>${name}</strong>. Morgen een nieuwe puzzel!`;
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
    const items = filterGemeenten(guessInput.value);
    state.highlightedIndex = 0;
    showAutocomplete(items);
  });

  guessInput.addEventListener('focus', () => {
    if (guessInput.value.trim()) {
      showAutocomplete(filterGemeenten(guessInput.value));
    }
  });

  guessInput.addEventListener('blur', () => {
    setTimeout(hideAutocomplete, 150);
  });

  guessInput.addEventListener('keydown', (e) => {
    const items = filterGemeenten(guessInput.value);
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
        selectGemeente(items[state.highlightedIndex]);
      }
      void submitGuess();
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  $('#btn-guess')!.addEventListener('click', () => void submitGuess());
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

export async function initGemeentedle() {
  renderGlobalSolveCount(null, 'loading');

  const meta = await fetchDailyMeta();
  if (!meta) {
    renderGlobalSolveCount(null, 'error');
    $('#game-date-label')!.textContent = 'Kon puzzel niet laden';
    return;
  }

  state.dateKey = meta.dateKey;
  state.puzzleNumber = meta.puzzleNumber;
  state.gemeenten = meta.gemeenten;
  state.yesterday = meta.yesterday;
  state.globalSolveCount = meta.globalSolveCount;
  state.stats = loadStats();
  state.resultRecorded = state.stats.completedDates.includes(state.dateKey);

  const saved = !USE_RANDOM_TARGET_FOR_TESTING && state.stats.todayGame;
  const canRestore =
    !!saved &&
    state.stats.todayGame!.date === state.dateKey &&
    state.stats.todayGame!.puzzleNumber === state.puzzleNumber;

  if (canRestore && state.stats.todayGame) {
    const tg = state.stats.todayGame;
    state.guesses = tg.guesses.map(deserializeGuess).filter((g): g is Guess => g !== null);
    state.attempts = tg.attempts;
    state.gameOver = tg.gameOver;
    state.won = tg.won;
    state.targetName = tg.targetName ?? null;
    state.targetProvince = tg.targetProvince ?? null;
    state.unlockedHints = tg.unlockedHints ?? { flagUrl: null, province: null };
  } else {
    state.guesses = [];
    state.attempts = 0;
    state.gameOver = state.resultRecorded;
    state.won = state.resultRecorded
      ? (state.stats.history.find((h) => h.date === state.dateKey)?.won ?? false)
      : false;
    state.targetName = null;
    state.targetProvince = null;
    state.unlockedHints = { flagUrl: null, province: null };
    if (state.resultRecorded) {
      const entry = state.stats.history.find((h) => h.date === state.dateKey);
      if (entry) {
        state.attempts = entry.won ? (entry.attempts ?? 0) : MAX_ATTEMPTS;
      }
    }
  }

  if (
    state.attempts >= HINT_FLAG_AFTER_ATTEMPT &&
    (!state.unlockedHints.flagUrl ||
      (state.attempts >= HINT_PROVINCE_AFTER_ATTEMPT && !state.unlockedHints.province))
  ) {
    const hints = await fetchUnlockedHints(state.attempts);
    if (hints) state.unlockedHints = mergeHints(state.unlockedHints, hints);
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  $('#game-date-label')!.textContent = `Puzzel #${state.puzzleNumber} · ${dateStr}`;

  if (meta.yesterday) {
    $('#yesterday-puzzle-number')!.textContent = String(meta.yesterday.puzzleNumber);
    $('#yesterday-gemeente-name')!.textContent = meta.yesterday.name;
    $('#yesterday-gemeente-province')!.textContent = ` (${meta.yesterday.province})`;
  }

  renderGlobalSolveCount(meta.globalSolveCount);
  renderAttemptDots();
  updateAttemptLabel();
  renderHints();
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
    empty.textContent = 'Nog geen pogingen. Kies een gemeente en druk op Raad.';
    guessHistory.appendChild(empty);
  } else {
    state.guesses.forEach((g) => addGuessRow(g, true));
  }

  if (state.gameOver && state.resultRecorded) showCompletedBanner();

  bindEvents();
  startGlobalCountPolling();
}
