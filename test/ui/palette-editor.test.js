// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initPaletteEditor } from '../../js/ui/palette-editor.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

describe('palette editor — eyedropper availability', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  afterEach(() => {
    delete window.EyeDropper;
  });

  it('disables the eyedropper when the EyeDropper API is unavailable', () => {
    expect('EyeDropper' in window).toBe(false);
    initPaletteEditor(makeStore());
    const btn = document.getElementById('eyedropper-btn');
    expect(btn.disabled).toBe(true);
  });

  it('leaves the eyedropper enabled when the EyeDropper API exists', () => {
    window.EyeDropper = class {};
    initPaletteEditor(makeStore());
    const btn = document.getElementById('eyedropper-btn');
    expect(btn.disabled).toBe(false);
  });
});
