// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
import {
  hexPrefixSuggestions,
  initColorAutosuggest,
} from '../../js/ui/color-autosuggest.js';

describe('hexPrefixSuggestions', () => {
  it('offers the sixteen next nibbles for a hex prefix', () => {
    const values = hexPrefixSuggestions('f5').map((s) => s.value);
    expect(values).toHaveLength(16);
    expect(values[0]).toBe('#f50');
    expect(values[15]).toBe('#f5f');
  });

  it('accepts a leading # and is case-insensitive', () => {
    expect(hexPrefixSuggestions('#F').map((s) => s.value)).toEqual(
      hexPrefixSuggestions('f').map((s) => s.value)
    );
  });

  it('previews a renderable hex at valid lengths and null at invalid ones', () => {
    // 2-digit body -> 3-digit suggestions are valid colors (#ff0 -> #ffff00).
    expect(hexPrefixSuggestions('ff')[0].hex).toBe('#ffff00');
    // 1-digit body -> 2-digit suggestions are not a valid hex length.
    expect(hexPrefixSuggestions('f')[0].hex).toBeNull();
  });

  it('stops suggesting once a full 6-digit color is typed', () => {
    expect(hexPrefixSuggestions('ff0080')).toEqual([]);
  });

  it('ignores non-hex input (rgb, names)', () => {
    expect(hexPrefixSuggestions('coral')).toEqual([]);
    expect(hexPrefixSuggestions('rgb(1,2,3)')).toEqual([]);
  });
});

describe('color autosuggest widget', () => {
  let input;

  beforeEach(() => {
    loadAppDom();
    resetLocalStorage();
    input = document.getElementById('color-input');
  });

  function key(name) {
    const e = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    input.dispatchEvent(e);
    return e;
  }

  it('wires the input as an ARIA combobox', () => {
    initColorAutosuggest(input, { onSubmit: () => {} });
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    const listbox = document.getElementById(input.getAttribute('aria-controls'));
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.hidden).toBe(true);
  });

  it('opens a listbox of 16 options as a hex prefix is typed', () => {
    initColorAutosuggest(input, { onSubmit: () => {} });
    input.value = 'f5';
    input.dispatchEvent(new window.Event('input'));

    const listbox = document.getElementById('color-suggestions');
    expect(listbox.hidden).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(16);
  });

  it('navigates with arrow keys and tracks aria-activedescendant', () => {
    initColorAutosuggest(input, { onSubmit: () => {} });
    input.value = 'f5';
    input.dispatchEvent(new window.Event('input'));

    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    key('ArrowDown');
    const first = document.querySelectorAll('.autosuggest-option')[0];
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id);
    expect(first.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter on a highlighted option extends the value instead of submitting', () => {
    const onSubmit = vi.fn();
    initColorAutosuggest(input, { onSubmit });
    input.value = 'f5';
    input.dispatchEvent(new window.Event('input'));

    key('ArrowDown'); // highlight #f50
    const e = key('Enter');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.value).toBe('#f50');
    expect(e.defaultPrevented).toBe(true);
    // Re-opens with the next character's options.
    expect(document.getElementById('color-suggestions').hidden).toBe(false);
    expect(document.querySelectorAll('.autosuggest-option')[0].querySelector('.autosuggest-value').textContent).toBe('#f500');
  });

  it('Enter with no highlighted option submits', () => {
    const onSubmit = vi.fn();
    initColorAutosuggest(input, { onSubmit });
    input.value = 'ff0000';
    input.dispatchEvent(new window.Event('input')); // 6 digits -> no list
    key('Enter');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('clicking an option extends the value', () => {
    initColorAutosuggest(input, { onSubmit: () => {} });
    input.value = 'f5';
    input.dispatchEvent(new window.Event('input'));
    const options = document.querySelectorAll('.autosuggest-option');
    options[10].click(); // #f5a
    expect(input.value).toBe('#f5a');
  });

  it('Escape closes the list', () => {
    initColorAutosuggest(input, { onSubmit: () => {} });
    input.value = 'f5';
    input.dispatchEvent(new window.Event('input'));
    expect(document.getElementById('color-suggestions').hidden).toBe(false);
    key('Escape');
    expect(document.getElementById('color-suggestions').hidden).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
