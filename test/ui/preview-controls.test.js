// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { reducer, getInitialState } from '../../js/state/actions.js';
import { initPreviewControls } from '../../js/ui/preview-controls.js';

function makeStore() {
  return createStore(reducer, getInitialState());
}

describe('preview controls — preview text', () => {
  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
  });

  it('renders the preview text field as a textarea', () => {
    const el = document.getElementById('preview-text-input');
    expect(el.tagName).toBe('TEXTAREA');
  });

  it('updates the preview text in state on input', () => {
    const store = makeStore();
    initPreviewControls(store);
    const el = document.getElementById('preview-text-input');

    el.value = 'Multi-line\npreview';
    el.dispatchEvent(new Event('input'));

    expect(store.getState().preferences.previewText).toBe('Multi-line\npreview');
  });
});
