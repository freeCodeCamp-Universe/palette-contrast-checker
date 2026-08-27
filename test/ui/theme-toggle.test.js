// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { getInitialState, reducer } from '../../js/state/actions.js';
import { initThemeToggle } from '../../js/ui/theme-toggle.js';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const prePaintScript = indexHtml.match(/<script>\s*([\s\S]*?)<\/script>/i)?.[1];

function mediaPreference(initialLight = false) {
  const listeners = new Set();
  const query = {
    matches: initialLight,
    addEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.add(listener);
    }),
    setLight(value) {
      query.matches = value;
      for (const listener of listeners) listener({ matches: value });
    },
  };
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return query;
}

function makeStore(theme = null) {
  const state = getInitialState();
  state.preferences.theme = theme;
  return createStore(reducer, state);
}

function runPrePaintScript() {
  expect(prePaintScript).toBeTruthy();
  window.eval(prePaintScript);
}

describe('theme script before first paint', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#0a0a23">';
    resetLocalStorage();
  });

  it('runs before the stylesheets', () => {
    expect(indexHtml.indexOf('<script>')).toBeLessThan(
      indexHtml.indexOf('<link rel="stylesheet"')
    );
  });

  it('uses the operating-system preference when no choice is saved', () => {
    mediaPreference(true);
    runPrePaintScript();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#f5f6f7');
  });

  it('uses a saved explicit preference before first paint', () => {
    mediaPreference(true);
    localStorage.setItem('palette-contrast-checker', JSON.stringify({
      version: 1,
      preferences: { theme: 'dark' },
    }));
    runPrePaintScript();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it.each([
    ['corrupt storage', 'not-json'],
    ['an old schema', JSON.stringify({ version: 0, preferences: { theme: 'dark' } })],
  ])('falls back to the operating system for %s', (_label, value) => {
    mediaPreference(true);
    localStorage.setItem('palette-contrast-checker', value);
    runPrePaintScript();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('theme switch', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    document.head.innerHTML = '<meta name="theme-color" content="#0a0a23">';
  });

  it('follows operating-system changes until the user makes a choice', () => {
    const preference = mediaPreference(false);
    initThemeToggle(makeStore());

    expect(document.documentElement.dataset.theme).toBe('dark');
    preference.setLight(true);
    expect(document.documentElement.dataset.theme).toBe('light');
    preference.setLight(false);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('saves an explicit choice and ignores later operating-system changes', () => {
    const preference = mediaPreference(false);
    const store = makeStore();
    initThemeToggle(store);

    document.getElementById('theme-toggle-btn').click();
    expect(store.getState().preferences.theme).toBe('light');
    expect(JSON.parse(localStorage.getItem('palette-contrast-checker'))).toMatchObject({
      version: 1,
      preferences: { theme: 'light' },
    });

    preference.setLight(false);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it.each([
    ['dark', 'false', 'Switch to light mode'],
    ['light', 'true', 'Switch to dark mode'],
  ])('exposes the active %s theme through a native switch', (theme, checked, title) => {
    mediaPreference(false);
    initThemeToggle(makeStore(theme));
    const button = document.getElementById('theme-toggle-btn');

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-label')).toBe('Light mode');
    expect(button.getAttribute('aria-checked')).toBe(checked);
    expect(button.title).toBe(title);
  });
});
