// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initResultsView } from '../../js/ui/results-view.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

const baseResult = {
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

function render(result) {
  const store = makeStore();
  initResultsView(store);
  store.dispatch({ type: 'SET_RESULTS', payload: [result] });
}

describe('results view — badges', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders badges as a list (ul/li) split into AA and AAA levels', () => {
    render(baseResult);
    const list = document.querySelector('.result-card-badges');
    expect(list.tagName).toBe('UL');
    const text = [...list.querySelectorAll('li.badge')].map((li) => li.textContent);
    expect(text.length).toBe(5);
    expect(text[0]).toContain('Normal text AA');
    expect(text[1]).toContain('Normal text AAA');
    expect(text[2]).toContain('Large text AA');
    expect(text[3]).toContain('Large text AAA');
    expect(text[4]).toContain('Non-text');
    expect(text.join(' ')).not.toMatch(/\bUI\b/);
  });

  it('marks AA pass / AAA fail separately and colors them green/red', () => {
    // normalText 'AA' => passes AA, fails AAA; nonText 'fail'
    render({ ...baseResult, normalText: 'AA', largeText: 'AAA', nonText: 'fail' });
    const items = document.querySelectorAll('.result-card-badges li.badge');
    expect(items[0].classList.contains('badge-pass')).toBe(true); // Normal AA
    expect(items[0].textContent).toContain('Pass');
    expect(items[1].classList.contains('badge-fail')).toBe(true); // Normal AAA
    expect(items[1].textContent).toContain('Fail');
    expect(items[1].textContent).toContain('✗');
    expect(items[4].classList.contains('badge-fail')).toBe(true); // Non-text fail
  });
});
