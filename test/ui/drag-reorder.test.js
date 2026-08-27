// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAppDom } from '../helpers/dom.js';
import { createStore } from '../../js/state/store.js';
import { getInitialState, reducer } from '../../js/state/actions.js';
import { initDragReorder } from '../../js/ui/drag-reorder.js';

function dragEvent(type, target, clientY = 0) {
  const event = new MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, 'dataTransfer', {
    value: { effectAllowed: '', dropEffect: '' },
  });
  target.dispatchEvent(event);
}

describe('drag reorder indicator', () => {
  let items;

  beforeEach(() => {
    loadAppDom();
    const list = document.getElementById('palette-list');
    list.innerHTML = '<li class="palette-item">First</li><li class="palette-item">Second</li>';
    items = list.querySelectorAll('.palette-item');
    vi.spyOn(items[1], 'getBoundingClientRect').mockReturnValue({
      top: 100,
      height: 40,
      bottom: 140,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 100,
      toJSON() {},
    });
    initDragReorder(createStore(reducer, getInitialState()));
  });

  it('uses the theme-aware selection token above a drop target', () => {
    dragEvent('dragstart', items[0]);
    dragEvent('dragover', items[1], 105);
    expect(items[1].style.borderTop).toBe('2px solid var(--selection-border)');
  });

  it('uses the theme-aware selection token below a drop target', () => {
    dragEvent('dragstart', items[0]);
    dragEvent('dragover', items[1], 135);
    expect(items[1].style.borderBottom).toBe('2px solid var(--selection-border)');
  });
});
