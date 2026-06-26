// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initAlerts } from '../../js/ui/alerts.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

describe('alerts — info styling', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders coverage messages with the info style, not warning gold', () => {
    const store = makeStore();
    initAlerts(store);
    store.dispatch({ type: 'SET_ALERTS', payload: ['No color pair passes for normal text.'] });

    const alert = document.querySelector('#alerts-container .alert');
    expect(alert).not.toBeNull();
    expect(alert.classList.contains('alert-info')).toBe(true);
    expect(alert.classList.contains('alert-warning')).toBe(false);
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(alert.textContent).toContain('No color pair passes for normal text.');
  });

  it('clears the container when there are no alerts', () => {
    const store = makeStore();
    initAlerts(store);
    store.dispatch({ type: 'SET_ALERTS', payload: ['x'] });
    store.dispatch({ type: 'SET_ALERTS', payload: [] });
    expect(document.getElementById('alerts-container').children.length).toBe(0);
  });
});
