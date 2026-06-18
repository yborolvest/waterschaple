import { applyTheme, getStoredTheme, getSystemTheme, setTheme, type Theme } from '../lib/theme';

function getToggleEls(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-theme-toggle]')];
}

function updateToggleUI(theme: Theme): void {
  const isDark = theme === 'dark';
  for (const el of getToggleEls()) {
    el.setAttribute('aria-pressed', String(isDark));
    el.setAttribute('aria-label', isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema');
    const icon = el.querySelector<HTMLElement>('[data-theme-icon]');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  }
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  updateToggleUI(next);
}

export function initThemeToggle(): void {
  const theme = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme);
  updateToggleUI(theme);

  for (const el of getToggleEls()) {
    el.addEventListener('click', toggleTheme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getStoredTheme()) return;
    const next: Theme = e.matches ? 'dark' : 'light';
    applyTheme(next);
    updateToggleUI(next);
  });

  window.addEventListener('themechange', (e) => {
    updateToggleUI((e as CustomEvent<Theme>).detail);
  });
}
