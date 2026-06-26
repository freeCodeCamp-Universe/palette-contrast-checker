// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initAnalysisRunner } from '../../js/ui/analysis-runner.js';
import { decodePaletteFromHash } from '../../js/lib/palette-url.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

function addColor(store, id, hex) {
  store.dispatch({
    type: 'ADD_COLOR',
    payload: { id, hex, displayLabel: hex, sourceType: 'manual' },
  });
}

describe('analysis runner — URL reflects analyzed palette', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/');
  });

  it('writes the palette to the URL hash on Analyze', () => {
    const store = makeStore();
    initAnalysisRunner(store);
    addColor(store, '1', '#000000');
    addColor(store, '2', '#aa11aa');

    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.setAttribute('aria-disabled', 'false'); // normally set by palette-editor
    analyzeBtn.click();

    expect(window.location.hash).toMatch(/^#p=/);
    const decoded = decodePaletteFromHash(window.location.hash);
    expect(decoded.map((c) => c.hex)).toEqual(['#000000', '#aa11aa']);
  });

  it('does not change the URL while the >10 warning is pending', () => {
    const store = makeStore();
    initAnalysisRunner(store);
    for (let i = 0; i < 11; i++) addColor(store, String(i), `#0000${(10 + i).toString(16)}`);

    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.setAttribute('aria-disabled', 'false');
    analyzeBtn.click(); // shows warning, returns early

    expect(window.location.hash).toBe('');
  });
});

describe('analysis runner — >10-color warning lifecycle', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/');
  });

  it('hides the warning once colors drop back to 10 or fewer', () => {
    const store = makeStore();
    initAnalysisRunner(store);
    for (let i = 0; i < 11; i++) addColor(store, String(i), `#0000${(10 + i).toString(16)}`);

    const analyzeBtn = document.getElementById('analyze-btn');
    const warning = document.getElementById('analysis-warning');
    analyzeBtn.setAttribute('aria-disabled', 'false');
    analyzeBtn.click();
    expect(warning.hidden).toBe(false); // warning shown for 11 colors

    store.dispatch({ type: 'REMOVE_COLOR', payload: { id: '0' } }); // back to 10
    expect(warning.hidden).toBe(true);
  });
});
