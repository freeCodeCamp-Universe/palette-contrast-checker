// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { trapFocus } from '../../js/lib/focus-trap.js';

function makeContainer() {
  const el = document.createElement('div');
  el.innerHTML = '<button>a</button><button>b</button>';
  document.body.appendChild(el);
  return el;
}

describe('trapFocus — background scroll lock', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('locks body scroll while trapped and releases on cleanup', () => {
    const release = trapFocus(makeContainer(), () => {});
    expect(document.body.classList.contains('modal-open')).toBe(true);
    release();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('keeps the lock until the last overlapping trap is released', () => {
    const r1 = trapFocus(makeContainer(), () => {});
    const r2 = trapFocus(makeContainer(), () => {});
    r1();
    expect(document.body.classList.contains('modal-open')).toBe(true);
    r2();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('is safe to release the same trap twice', () => {
    const r = trapFocus(makeContainer(), () => {});
    r();
    r(); // no-op, must not corrupt the count
    const r2 = trapFocus(makeContainer(), () => {});
    expect(document.body.classList.contains('modal-open')).toBe(true);
    r2();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });
});
