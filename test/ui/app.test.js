// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { initApp, getStore } from '../../js/ui/app.js';

describe('app bootstrap — URL <-> palette sync', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/'); // replaceState does not fire hashchange
  });

  it('loads a #p= palette on initial load and keeps it in the URL', () => {
    history.replaceState(null, '', '/#p=ff0000,00ff00');
    initApp();
    expect(getStore().getState().palette.map((c) => c.hex)).toEqual(['#ff0000', '#00ff00']);
    expect(window.location.hash).toBe('#p=ff0000,00ff00');
  });

  it('loads a #p= palette pasted into an already-open tab (hashchange)', () => {
    initApp();
    expect(getStore().getState().palette).toHaveLength(0);

    history.replaceState(null, '', '/#p=000000,aa11aa');
    window.dispatchEvent(new Event('hashchange'));

    expect(getStore().getState().palette.map((c) => c.hex)).toEqual(['#000000', '#aa11aa']);
    expect(window.location.hash).toBe('#p=000000,aa11aa');
  });

  it('updates the URL hash as the palette changes', () => {
    initApp();
    const store = getStore();
    store.dispatch({ type: 'ADD_COLOR', payload: { id: '1', hex: '#123456', displayLabel: '#123456' } });
    expect(window.location.hash).toBe('#p=123456');
    store.dispatch({ type: 'ADD_COLOR', payload: { id: '2', hex: '#abcdef', displayLabel: '#abcdef' } });
    expect(window.location.hash).toBe('#p=123456,abcdef');
  });

  it('clears the hash when the palette becomes empty', () => {
    history.replaceState(null, '', '/#p=123456');
    initApp();
    const store = getStore();
    store.dispatch({ type: 'REMOVE_COLOR', payload: { id: store.getState().palette[0].id } });
    expect(window.location.hash).toBe('');
  });
});

describe('app bootstrap — auto-analyze imported palettes', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/');
  });

  it('analyzes a #p= palette automatically on load', async () => {
    history.replaceState(null, '', '/#p=000000,ffffff');
    initApp();
    await vi.waitFor(() => expect(getStore().getState().results).not.toBeNull());
    expect(getStore().getState().results.length).toBeGreaterThan(0);
  });

  it('shows the >10-color confirmation instead of analyzing immediately', () => {
    const hexes = Array.from({ length: 11 }, (_, i) => (0x100000 + i).toString(16));
    history.replaceState(null, '', '/#p=' + hexes.join(','));
    initApp();
    expect(getStore().getState().palette).toHaveLength(11);
    expect(document.getElementById('analysis-warning').hidden).toBe(false);
    expect(getStore().getState().results).toBeNull();
  });
});
