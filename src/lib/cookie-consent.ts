/** NL: Cookie-/analytics-toestemming (GDPR) / EN: Cookie & analytics consent (GDPR) */

import { UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from './analytics-config';

export const COOKIE_CONSENT_KEY = 'rijkdle-cookie-consent';
export type CookieConsent = 'accepted' | 'rejected';

export function getCookieConsent(): CookieConsent | null {
  if (typeof localStorage === 'undefined') return null;
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === 'accepted' || value === 'rejected' ? value : null;
}

export function setCookieConsent(consent: CookieConsent): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, consent);
  window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: consent }));
}

export function loadUmamiAnalytics(): void {
  if (getCookieConsent() !== 'accepted') return;
  if (document.querySelector(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = UMAMI_SCRIPT_URL;
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  document.head.appendChild(script);
}

export function removeUmamiAnalytics(): void {
  document
    .querySelectorAll<HTMLScriptElement>(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`)
    .forEach((el) => el.remove());
}
