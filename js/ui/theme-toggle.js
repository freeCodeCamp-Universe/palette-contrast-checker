/**
 * Theme toggle — light/dark switching for the Command-line Chic palette.
 *
 * The active theme lives in `data-theme` on <html>. An inline script in the
 * <head> sets it before first paint (no flash); this module re-applies from
 * store state (same result) and wires the header toggle button.
 */

import { savePreferences } from '../state/persistence.js';

const META_BG = { dark: '#0a0a23', light: '#f5f6f7' };

export function initThemeToggle(store) {
  const btn = document.getElementById('theme-toggle-btn');
  const meta = document.querySelector('meta[name="theme-color"]');
  // matchMedia is absent in some non-browser environments (e.g. jsdom in tests);
  // fall back to a stub that reports "not light" and ignores listeners.
  const sysLight = typeof matchMedia === 'function'
    ? matchMedia('(prefers-color-scheme: light)')
    : { matches: false, addEventListener() {} };

  // The effective theme: an explicit user choice wins, otherwise follow the OS.
  const resolve = () => {
    const t = store.getState().preferences.theme;
    return t === 'light' || t === 'dark' ? t : (sysLight.matches ? 'light' : 'dark');
  };

  const apply = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (meta) meta.setAttribute('content', META_BG[theme]);
    if (btn) {
      const next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-checked', String(theme === 'light'));
      btn.title = `Switch to ${next} mode`;
      btn.setAttribute('aria-label', 'Light mode');
      // Which sun/moon icon shows is handled by CSS via data-theme.
    }
  };

  apply(resolve());

  if (btn) {
    btn.addEventListener('click', () => {
      const next = resolve() === 'dark' ? 'light' : 'dark';
      store.dispatch({ type: 'SET_THEME', payload: next });
      savePreferences(store.getState().preferences);
      apply(next);
    });
  }

  // While still on "auto" (no saved choice), live-follow OS changes.
  sysLight.addEventListener('change', () => {
    if (store.getState().preferences.theme == null) apply(resolve());
  });
}
