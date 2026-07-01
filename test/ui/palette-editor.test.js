// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initPaletteEditor } from '../../js/ui/palette-editor.js';
import { saveWip, loadWip } from '../../js/state/persistence.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

function addColor(store, id, hex, label) {
  store.dispatch({
    type: 'ADD_COLOR',
    payload: { id, hex, displayLabel: label, sourceType: 'manual' },
  });
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

describe('palette editor — Clear all', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    window.history.replaceState(null, '', '/');
  });

  it('hides the Clear all button on an empty palette and shows it once colors exist', () => {
    const store = makeStore();
    initPaletteEditor(store);
    const clearBtn = document.getElementById('clear-palette-btn');

    expect(clearBtn.hidden).toBe(true);

    addColor(store, '1', '#ff0000', 'red');
    expect(clearBtn.hidden).toBe(false);
  });

  it('opens a confirmation modal naming the color count instead of clearing immediately', () => {
    const store = makeStore();
    initPaletteEditor(store);
    addColor(store, '1', '#ff0000', 'red');
    addColor(store, '2', '#0000ff', 'blue');

    document.getElementById('clear-palette-btn').click();

    const modal = document.getElementById('reset-modal');
    expect(modal.hidden).toBe(false);
    expect(document.getElementById('reset-modal-desc').textContent).toContain('2 colors');
    // Palette is untouched until the user confirms.
    expect(store.getState().palette).toHaveLength(2);
  });

  it('leaves the palette intact when the modal is cancelled', () => {
    const store = makeStore();
    initPaletteEditor(store);
    addColor(store, '1', '#ff0000', 'red');

    document.getElementById('clear-palette-btn').click();
    document.getElementById('reset-cancel-btn').click();

    expect(document.getElementById('reset-modal').hidden).toBe(true);
    expect(store.getState().palette).toHaveLength(1);
  });

  it('empties the palette, drops the WIP snapshot, and clears the URL hash on confirm', () => {
    const store = makeStore();
    initPaletteEditor(store);
    addColor(store, '1', '#ff0000', 'red');
    addColor(store, '2', '#0000ff', 'blue');

    // Simulate a previously analyzed palette: WIP saved + shared URL.
    saveWip(store.getState().palette);
    window.history.replaceState(null, '', '/#p=abc123');

    document.getElementById('clear-palette-btn').click();
    document.getElementById('reset-confirm-btn').click();

    expect(store.getState().palette).toHaveLength(0);
    expect(document.getElementById('reset-modal').hidden).toBe(true);
    expect(document.getElementById('clear-palette-btn').hidden).toBe(true);
    expect(loadWip()).toBeNull();
    expect(window.location.hash).toBe('');
  });
});
