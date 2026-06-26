// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initPaletteEditor } from '../../js/ui/palette-editor.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

describe('palette editor — eyedropper availability', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  afterEach(() => {
    delete window.EyeDropper;
  });

  it('disables the eyedropper when the EyeDropper API is unavailable', () => {
    expect('EyeDropper' in window).toBe(false);
    initPaletteEditor(makeStore());
    const btn = document.getElementById('eyedropper-btn');
    expect(btn.disabled).toBe(true);
  });

  it('leaves the eyedropper enabled when the EyeDropper API exists', () => {
    window.EyeDropper = class {};
    initPaletteEditor(makeStore());
    const btn = document.getElementById('eyedropper-btn');
    expect(btn.disabled).toBe(false);
  });
});

describe('palette editor — SVG icons (no emoji)', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders the eyedropper as an inline SVG', () => {
    const btn = document.getElementById('eyedropper-btn');
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(btn.textContent).not.toContain('\u{1F441}');
  });

  it('renders move/delete controls as inline SVGs', () => {
    const store = makeStore();
    initPaletteEditor(store);
    store.dispatch({
      type: 'ADD_COLOR',
      payload: { id: '1', hex: '#ff0000', displayLabel: 'red', sourceType: 'manual' },
    });

    const item = document.querySelector('.palette-item');
    for (const cls of ['.move-up-btn', '.move-down-btn', '.delete-btn']) {
      const btn = item.querySelector(cls);
      expect(btn.querySelector('svg'), `${cls} should contain an svg`).not.toBeNull();
    }
    // no leftover emoji glyphs
    expect(item.textContent).not.toMatch(/[▲▼✕]/);
  });
});
