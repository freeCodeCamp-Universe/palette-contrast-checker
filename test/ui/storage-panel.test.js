// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initStoragePanel } from '../../js/ui/storage-panel.js';

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
