const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([aria-disabled="true"]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Reference count so the background scroll lock survives overlapping modals and
// is only released once the last one closes.
let openTraps = 0;

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

  // Lock background scrolling while a modal is open.
  openTraps += 1;
  document.body.classList.add('modal-open');

  let released = false;
  return () => {
    if (released) return;
    released = true;
    document.removeEventListener('keydown', handler);
    openTraps = Math.max(0, openTraps - 1);
    if (openTraps === 0) document.body.classList.remove('modal-open');
  };
}
