import {
  getCookieConsent,
  loadUmamiAnalytics,
  removeUmamiAnalytics,
  setCookieConsent,
  type CookieConsent,
} from '../lib/cookie-consent';

export const COOKIE_UI_HIDDEN_CLASS = 'cookie-consent-hidden';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function syncCookieConsentUI(): void {
  const banner = $('cookie-banner');
  const settings = $('cookie-settings');
  if (!banner || !settings) return;

  const consent = getCookieConsent();
  if (consent === 'accepted' || consent === 'rejected') {
    banner.classList.add(COOKIE_UI_HIDDEN_CLASS);
    settings.classList.remove(COOKIE_UI_HIDDEN_CLASS);
    return;
  }

  banner.classList.remove(COOKIE_UI_HIDDEN_CLASS);
  settings.classList.add(COOKIE_UI_HIDDEN_CLASS);
}

function showBanner(): void {
  $('cookie-banner')?.classList.remove(COOKIE_UI_HIDDEN_CLASS);
  $('cookie-settings')?.classList.add(COOKIE_UI_HIDDEN_CLASS);
}

function hideBanner(): void {
  $('cookie-banner')?.classList.add(COOKIE_UI_HIDDEN_CLASS);
  $('cookie-settings')?.classList.remove(COOKIE_UI_HIDDEN_CLASS);
}

function applyConsent(consent: CookieConsent): void {
  setCookieConsent(consent);
  if (consent === 'accepted') {
    loadUmamiAnalytics();
  } else {
    removeUmamiAnalytics();
  }
  hideBanner();
}

export function initCookieConsent(): void {
  syncCookieConsentUI();

  const consent = getCookieConsent();
  if (consent === 'accepted') {
    loadUmamiAnalytics();
    return;
  }
}

export function openCookieSettings(): void {
  showBanner();
}

export function initCookieConsentUI(): void {
  initCookieConsent();

  $('cookie-accept')?.addEventListener('click', () => applyConsent('accepted'));
  $('cookie-reject')?.addEventListener('click', () => applyConsent('rejected'));
  $('cookie-settings')?.addEventListener('click', openCookieSettings);

  window.addEventListener('cookieconsentchange', () => {
    syncCookieConsentUI();
    const consent = getCookieConsent();
    if (consent === 'accepted') loadUmamiAnalytics();
    if (consent === 'rejected') removeUmamiAnalytics();
  });
}
