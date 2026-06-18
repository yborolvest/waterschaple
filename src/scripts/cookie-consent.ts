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

function showBanner(): void {
  $('cookie-banner')?.classList.remove('hidden');
  $('cookie-settings')?.classList.add('hidden');
}

function hideBanner(): void {
  $('cookie-banner')?.classList.add('hidden');
  $('cookie-settings')?.classList.remove('hidden');
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
  const consent = getCookieConsent();
  if (consent === 'accepted') {
    loadUmamiAnalytics();
    hideBanner();
    return;
  }
  if (consent === 'rejected') {
    hideBanner();
    return;
  }
  showBanner();
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
    const consent = getCookieConsent();
    if (consent === 'accepted') loadUmamiAnalytics();
    if (consent === 'rejected') removeUmamiAnalytics();
  });
}
