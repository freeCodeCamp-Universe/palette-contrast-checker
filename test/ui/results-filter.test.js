// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { getInitialState, reducer } from '../../js/state/actions.js';
import { initResultsFilter } from '../../js/ui/results-filter.js';

describe('result color filters', () => {
  let store;

  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    store = createStore(reducer, getInitialState());
    initResultsFilter(store);
  });

  it('keeps option text on the semantic control surface for mid-luminance colors', () => {
    store.dispatch({
      type: 'LOAD_PALETTE',
      payload: [
        { id: '1', hex: '#777777', displayLabel: 'Mid gray' },
        { id: '2', hex: '#888888', displayLabel: 'Lighter gray' },
      ],
    });
    store.dispatch({ type: 'SET_RESULTS', payload: [{}] });

    for (const id of ['filter-foreground', 'filter-background']) {
      const options = [...document.getElementById(id).options].slice(1);
      expect(options.map((option) => option.textContent)).toEqual(['Mid gray', 'Lighter gray']);
      for (const option of options) {
        expect(option.style.backgroundColor).toBe('');
        expect(option.style.color).toBe('');
      }
    }
  });
});
