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

describe('results view — coverage notes', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders a non-announcing callout for each coverage gap', () => {
    const store = makeStore();
    initResultsView(store);
    // All-fail => normal text, large text and non-text coverage all missing.
    store.dispatch({
      type: 'SET_RESULTS',
      payload: [{ ...baseResult, normalText: 'fail', largeText: 'fail', nonText: 'fail' }],
    });

    const notes = document.querySelectorAll('#coverage-notes .alert-info');
    expect(notes.length).toBe(3);
    expect(notes[0].textContent).toContain('normal text');
    // Not announced: no role="alert" and not inside any aria-live region.
    notes.forEach((note) => {
      expect(note.getAttribute('role')).toBeNull();
      expect(note.closest('[aria-live]')).toBeNull();
    });
  });

  it('renders no coverage notes when the palette has full coverage', () => {
    const store = makeStore();
    initResultsView(store);
    store.dispatch({ type: 'SET_RESULTS', payload: [baseResult] });
    expect(document.querySelectorAll('#coverage-notes .alert-info').length).toBe(0);
  });
});

describe('results view — announcement', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  // The announcement is written on the next animation frame; flush it.
  function flush() {
    return new Promise((resolve) =>
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(resolve)
        : setTimeout(resolve, 0)
    );
  }

  it('announces "available" first, "updated" on re-analysis, and stays quiet on filter changes', async () => {
    const store = makeStore();
    initResultsView(store);
    const status = document.getElementById('results-status');

    store.dispatch({ type: 'SET_RESULTS', payload: [baseResult] });
    await flush();
    expect(status.textContent).toBe('Results are available.');

    // Filter change re-renders but keeps the same results reference => no re-announce.
    status.textContent = 'sentinel';
    store.dispatch({ type: 'SET_FILTERS', payload: { level: 'AA' } });
    await flush();
    expect(status.textContent).toBe('sentinel');

    // A fresh analysis swaps the results reference => "Results updated."
    store.dispatch({ type: 'SET_RESULTS', payload: [baseResult] });
    await flush();
    expect(status.textContent).toBe('Results updated.');
  });

  it('clears the announcement and resets when results are cleared', async () => {
    const store = makeStore();
    initResultsView(store);
    const status = document.getElementById('results-status');

    store.dispatch({ type: 'SET_RESULTS', payload: [baseResult] });
    await flush();
    expect(status.textContent).toBe('Results are available.');

    store.dispatch({ type: 'CLEAR_RESULTS' });
    expect(status.textContent).toBe('');

    // After a clear, the next population announces "available" again, not "updated".
    store.dispatch({ type: 'SET_RESULTS', payload: [baseResult] });
    await flush();
    expect(status.textContent).toBe('Results are available.');
  });
});
