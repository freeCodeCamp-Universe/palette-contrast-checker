// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from './dom.js';

describe('jsdom test harness', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('injects the index.html body markup', () => {
    expect(document.getElementById('color-input')).not.toBeNull();
    expect(document.getElementById('analyze-btn')).not.toBeNull();
    expect(document.getElementById('saved-palettes-list')).not.toBeNull();
  });

  it('strips the bootstrap module script so nothing auto-runs', () => {
    expect(document.querySelector('script')).toBeNull();
  });

  it('provides a working, isolated localStorage', () => {
    localStorage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    resetLocalStorage();
    expect(localStorage.getItem('k')).toBeNull();
  });
});
