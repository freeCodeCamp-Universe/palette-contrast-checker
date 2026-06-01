const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([aria-disabled="true"]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container, onEscape) {
  const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));

  function handler(e) {
    if (e.key === 'Escape') {
      onEscape();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
