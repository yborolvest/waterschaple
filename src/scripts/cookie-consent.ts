import {
  getCookieConsent,
  loadUmamiAnalytics,
  removeUmamiAnalytics,
  setCookieConsent,
  type CookieConsent,
} from '../lib/cookie-consent';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function syncCookieConsentUI(): void {
  const banner = $('cookie-banner');
  const settings = $('cookie-settings');
  if (!banner || !settings) return;

  const consent = getCookieConsent();
  if (consent === 'accepted' || consent === 'rejected') {
    banner.hidden = true;
    banner.setAttribute('aria-hidden', 'true');
    settings.hidden = false;
    settings.setAttribute('aria-hidden', 'false');
    return;
  }

  banner.hidden = false;
  banner.setAttribute('aria-hidden', 'false');
  settings.hidden = true;
  settings.setAttribute('aria-hidden', 'true');
}

function showBanner(): void {
  const banner = $('cookie-banner');
  const settings = $('cookie-settings');
  if (!banner || !settings) return;
  banner.hidden = false;
  banner.setAttribute('aria-hidden', 'false');
  settings.hidden = true;
  settings.setAttribute('aria-hidden', 'true');
}

function hideBanner(): void {
  const banner = $('cookie-banner');
  const settings = $('cookie-settings');
  if (!banner || !settings) return;
  banner.hidden = true;
  banner.setAttribute('aria-hidden', 'true');
  settings.hidden = false;
  settings.setAttribute('aria-hidden', 'false');
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
