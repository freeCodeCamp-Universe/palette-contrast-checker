// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initResultsView } from '../../js/ui/results-view.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

const RESULT = {
  foregroundId: '1',
  foregroundHex: '#000000',
  foregroundLabel: '#000000',
  backgroundId: '2',
  backgroundHex: '#ffffff',
  backgroundLabel: '#ffffff',
  contrastRatio: 21,
  normalText: 'AAA',
  largeText: 'AAA',
  nonText: 'AA',
  stateChecks: {},
};

describe('results view — non-text badge label', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('labels the non-text contrast badge "Non-text" (not "UI")', () => {
    const store = makeStore();
    initResultsView(store);
    store.dispatch({ type: 'SET_RESULTS', payload: [RESULT] });

    const badgeText = [...document.querySelectorAll('.result-card-badges .badge')].map(
      (b) => b.textContent
    );
    expect(badgeText.some((t) => t.includes('Non-text'))).toBe(true);
    expect(badgeText.some((t) => /\bUI\b/.test(t))).toBe(false);
  });
});
