const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lastFocused: HTMLElement | null = null;
let trapHandler: ((e: KeyboardEvent) => void) | null = null;
let openModalId: string | null = null;

function getPageRegions(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>('header, main, footer'),
    ...document.querySelectorAll<HTMLElement>('[data-theme-toggle]'),
  ];
}

function getFocusable(modal: HTMLElement): HTMLElement[] {
  return [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)];
}

/** NL: Open dialoog met focus-trap en inert achtergrond / EN: Accessible modal open */
export function openModal(name: string): void {
  const modal = document.getElementById(`modal-${name}`);
  if (!modal) return;

  if (openModalId && openModalId !== name) {
    closeModal(openModalId);
  }

  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  openModalId = name;

  getPageRegions().forEach((el) => el.setAttribute('inert', ''));
  modal.classList.remove('hidden');
  modal.removeAttribute('aria-hidden');

  const focusable = getFocusable(modal);
  (focusable[0] ?? modal).focus();

  trapHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(name);
      return;
    }
    if (e.key !== 'Tab' || !openModalId) return;

    const current = document.getElementById(`modal-${openModalId}`);
    if (!current) return;

    const nodes = getFocusable(current);
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', trapHandler);
}

/** NL: Sluit dialoog en herstel focus / EN: Close modal and restore focus */
export function closeModal(name: string): void {
  const modal = document.getElementById(`modal-${name}`);
  if (!modal) return;

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  getPageRegions().forEach((el) => el.removeAttribute('inert'));

  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  }

  if (openModalId === name) openModalId = null;
  lastFocused?.focus();
  lastFocused = null;
}
