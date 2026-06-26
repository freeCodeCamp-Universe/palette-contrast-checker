// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { initApp, getStore } from '../../js/ui/app.js';
import { saveWip } from '../../js/state/persistence.js';

describe('app bootstrap — loading a #p= palette', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/'); // replaceState does not fire hashchange
  });

  it('fills and analyzes a #p= palette on initial load, keeping the URL', () => {
    history.replaceState(null, '', '/#p=ff0000,00ff00');
    initApp();
    expect(getStore().getState().palette.map((c) => c.hex)).toEqual(['#ff0000', '#00ff00']);
    expect(window.location.hash).toBe('#p=ff0000,00ff00');
  });

  it('loads + analyzes a #p= link pasted into an already-open tab (hashchange)', () => {
    initApp();
    expect(getStore().getState().palette).toHaveLength(0);

    history.replaceState(null, '', '/#p=000000,aa11aa');
    window.dispatchEvent(new Event('hashchange'));

    expect(getStore().getState().palette.map((c) => c.hex)).toEqual(['#000000', '#aa11aa']);
    expect(window.location.hash).toBe('#p=000000,aa11aa');
  });

  it('runs the analysis automatically for an imported palette', async () => {
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

describe('app bootstrap — Load/Restore only fill colors', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    history.replaceState(null, '', '/');
  });

  it('restores the WIP palette without analyzing it or writing the URL', () => {
    saveWip([
      { id: '1', hex: '#000000', displayLabel: '#000000' },
      { id: '2', hex: '#ffffff', displayLabel: '#ffffff' },
    ]);
    initApp();
    expect(document.getElementById('recovery-banner').hidden).toBe(false);

    document.getElementById('recovery-restore-btn').click();
    expect(getStore().getState().palette).toHaveLength(2);
    expect(getStore().getState().results).toBeNull(); // not auto-analyzed
    expect(window.location.hash).toBe(''); // URL only written on Analyze
  });

  it('does not write the URL when colors are added/removed (only Analyze does)', () => {
    initApp();
    const store = getStore();
    store.dispatch({ type: 'ADD_COLOR', payload: { id: '1', hex: '#123456', displayLabel: '#123456' } });
    expect(window.location.hash).toBe('');
  });
});
