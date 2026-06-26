// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initStoragePanel } from '../../js/ui/storage-panel.js';
import { saveNamedPalette } from '../../js/state/persistence.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

const ADD_RED = {
  type: 'ADD_COLOR',
  payload: { id: '1', hex: '#ff0000', displayLabel: 'red', sourceType: 'manual' },
};

// Buttons that act on the current palette; Load/Import bring colors in and stay enabled.
const PALETTE_CONSUMERS = ['save-palette-btn', 'share-url-btn', 'export-csv-btn'];
const ALWAYS_ENABLED = ['load-palette-btn', 'import-csv-btn'];

describe('storage panel — palette-consuming controls', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('disables Save/Share/Export CSV when the palette is empty', () => {
    initStoragePanel(makeStore());
    for (const id of PALETTE_CONSUMERS) {
      expect(document.getElementById(id).disabled, id).toBe(true);
    }
  });

  it('keeps Load/Import enabled when the palette is empty', () => {
    initStoragePanel(makeStore());
    for (const id of ALWAYS_ENABLED) {
      expect(document.getElementById(id).disabled, id).toBe(false);
    }
  });

  it('enables the consumers once a color is added', () => {
    const store = makeStore();
    initStoragePanel(store);
    store.dispatch(ADD_RED);
    for (const id of PALETTE_CONSUMERS) {
      expect(document.getElementById(id).disabled, id).toBe(false);
    }
  });

  it('re-disables the consumers when the last color is removed', () => {
    const store = makeStore();
    initStoragePanel(store);
    store.dispatch(ADD_RED);
    store.dispatch({ type: 'REMOVE_COLOR', payload: { id: '1' } });
    for (const id of PALETTE_CONSUMERS) {
      expect(document.getElementById(id).disabled, id).toBe(true);
    }
  });
});

describe('storage panel — palette name length', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('caps the palette name input at 50 characters', () => {
    expect(document.getElementById('save-name-input').maxLength).toBe(50);
  });
});

describe('storage panel — My Palettes list detail', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders a swatch per color and a colors/date meta line', () => {
    saveNamedPalette('Ocean', [
      { id: '1', hex: '#0a0a23', displayLabel: '#0a0a23' },
      { id: '2', hex: '#99c9ff', displayLabel: '#99c9ff' },
      { id: '3', hex: '#ffffff', displayLabel: '#ffffff' },
    ]);
    initStoragePanel(makeStore());
    document.getElementById('load-palette-btn').click();

    const item = document.querySelector('#saved-palettes-list .saved-palette-item');
    expect(item.querySelectorAll('.saved-swatch').length).toBe(3);
    expect(item.querySelector('.saved-palette-meta').textContent).toContain('3 colors');
  });

  it('labels the open-list button "My Palettes"', () => {
    expect(document.getElementById('load-palette-btn').textContent.trim()).toBe('My Palettes');
  });
});

describe('storage panel — save/load/delete feedback', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('announces a save in the status live region', () => {
    const store = makeStore();
    initStoragePanel(store);
    store.dispatch(ADD_RED);

    document.getElementById('save-palette-btn').click(); // open dialog
    document.getElementById('save-name-input').value = 'Sunset';
    document.getElementById('save-confirm-btn').click();

    const status = document.getElementById('storage-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('Sunset');
    expect(status.textContent.toLowerCase()).toContain('saved');
  });

  it('announces a load in the status live region', () => {
    saveNamedPalette('Ocean', [{ id: '1', hex: '#000000', displayLabel: '#000000' }]);
    const store = makeStore();
    initStoragePanel(store);

    document.getElementById('load-palette-btn').click(); // render list
    document.querySelector('#saved-palettes-list .load-btn').click();

    expect(document.getElementById('storage-status').textContent.toLowerCase()).toContain('loaded');
  });

  it('announces a delete in the status live region', () => {
    saveNamedPalette('Ocean', [{ id: '1', hex: '#000000', displayLabel: '#000000' }]);
    const store = makeStore();
    initStoragePanel(store);

    document.getElementById('load-palette-btn').click();
    document.querySelector('#saved-palettes-list .delete-btn').click();

    expect(document.getElementById('storage-status').textContent.toLowerCase()).toContain('deleted');
  });
});
