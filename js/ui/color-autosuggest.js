/**
 * Next-character hex autosuggest for the "Write a color" field.
 *
 * As the user types a hex prefix, the widget offers the sixteen possible next
 * nibbles (0-f) as an ARIA combobox/listbox: type "f5" and it suggests
 * #f50…#f5f, pick one and it re-suggests the next character, and so on until a
 * full color is built. Selecting an option only extends the field — the color
 * is committed with Enter/Add, same as a typed value.
 *
 * The pattern follows the WAI-ARIA combobox spec: the input carries
 * role="combobox" + aria-expanded/aria-activedescendant, the popup is a
 * listbox of role="option" items, and a polite status announces the count.
 */

import { canonicalize } from '../lib/color-parse.js';

const HEX_DIGITS = '0123456789abcdef';
// A bare hex body of 1–5 digits (optionally #-prefixed). Six digits is already
// a complete color, so it gets no next-character suggestions.
const HEX_PREFIX_RE = /^#?([0-9a-f]{1,5})$/i;

/**
 * The sixteen next-character completions for a hex prefix, each paired with a
 * renderable hex when the extended value is itself a valid color (null at the
 * 2- and 5-digit steps, which aren't valid hex lengths).
 */
export function hexPrefixSuggestions(raw) {
  const match = String(raw).trim().match(HEX_PREFIX_RE);
  if (!match) return [];
  const body = match[1].toLowerCase();
  return HEX_DIGITS.split('').map((digit) => {
    const value = `#${body}${digit}`;
    return { value, hex: canonicalize(value) };
  });
}

export function initColorAutosuggest(input, { onSubmit }) {
  const listbox = document.createElement('ul');
  listbox.id = 'color-suggestions';
  listbox.className = 'autosuggest-list';
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', 'Color suggestions');
  listbox.hidden = true;

  const status = document.createElement('div');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listbox.id);

  input.insertAdjacentElement('afterend', listbox);
  listbox.insertAdjacentElement('afterend', status);

  let suggestions = [];
  let activeIndex = -1;
  let open = false;
  let lastAnnounced = null;

  const optionId = (i) => `color-suggestion-${i}`;

  function render() {
    listbox.innerHTML = '';
    suggestions.forEach((suggestion, i) => {
      const li = document.createElement('li');
      li.className = 'autosuggest-option';
      li.id = optionId(i);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(i);

      const swatch = document.createElement('span');
      swatch.className = 'autosuggest-swatch';
      if (suggestion.hex) {
        swatch.style.backgroundColor = suggestion.hex;
      } else {
        swatch.classList.add('autosuggest-swatch-empty');
      }

      const value = document.createElement('span');
      value.className = 'autosuggest-value';
      value.textContent = suggestion.value;

      li.append(swatch, value);
      listbox.appendChild(li);
    });
  }

  function updateActive() {
    const options = listbox.querySelectorAll('.autosuggest-option');
    options.forEach((li, i) => {
      const selected = i === activeIndex;
      li.setAttribute('aria-selected', String(selected));
      li.classList.toggle('is-active', selected);
      if (selected) li.scrollIntoView?.({ block: 'nearest' });
    });
    if (activeIndex >= 0) {
      input.setAttribute('aria-activedescendant', optionId(activeIndex));
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function announce() {
    const count = open ? suggestions.length : 0;
    if (count === lastAnnounced) return;
    lastAnnounced = count;
    status.textContent = count
      ? `${count} color suggestions available. Use up and down arrow keys to review, Enter to insert.`
      : '';
  }

  function openList() {
    listbox.hidden = false;
    open = true;
    input.setAttribute('aria-expanded', 'true');
  }

  function closeList() {
    if (!open && listbox.hidden) return;
    listbox.hidden = true;
    open = false;
    activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    announce();
  }

  function refresh() {
    suggestions = hexPrefixSuggestions(input.value);
    activeIndex = -1;
    if (suggestions.length) {
      render();
      openList();
      updateActive();
    } else {
      suggestions = [];
      closeList();
    }
    announce();
  }

  function move(delta) {
    if (!open) {
      refresh();
      if (!open) return;
    }
    const n = suggestions.length;
    if (!n) return;
    if (activeIndex === -1) {
      activeIndex = delta > 0 ? 0 : n - 1;
    } else {
      activeIndex += delta;
      // Stepping past either end returns focus to the typed value.
      if (activeIndex < 0 || activeIndex >= n) activeIndex = -1;
    }
    updateActive();
  }

  function select(i) {
    const suggestion = suggestions[i];
    if (!suggestion) return;
    input.value = suggestion.value;
    input.focus();
    // Fire input so both this widget (next-character options) and the live
    // preview swatch stay in sync with the extended value.
    input.dispatchEvent(new Event('input'));
  }

  input.addEventListener('input', refresh);

  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          e.preventDefault();
          select(activeIndex);
        } else {
          closeList();
          onSubmit();
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closeList();
        }
        break;
      case 'Tab':
        closeList();
        break;
      default:
        break;
    }
  });

  // preventDefault on mousedown keeps focus in the input, so the blur handler
  // doesn't close the list before the click selects an option.
  listbox.addEventListener('mousedown', (e) => e.preventDefault());
  listbox.addEventListener('click', (e) => {
    const li = e.target.closest('.autosuggest-option');
    if (li) select(Number(li.dataset.index));
  });

  input.addEventListener('blur', closeList);
  document.addEventListener('click', (e) => {
    if (e.target !== input && !listbox.contains(e.target)) closeList();
  });
}
