/**
 * Suggestions panel — display, select, and add suggested colors to palette.
 */

import { generateId } from '../state/actions.js';
import { generateSuggestions, bestCheckLabel } from '../lib/suggestions.js';

export function initSuggestionsPanel(store) {
  const section = document.getElementById('suggestions-section');
  const grid = document.getElementById('suggestions-grid');
  const addBtn = document.getElementById('add-suggestions-btn');
  const generateBtn = document.getElementById('generate-suggestions-btn');

  const selected = new Set();

  function render() {
    const { suggestions, palette } = store.getState();

    if (!suggestions) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    grid.innerHTML = '';
    selected.clear();
    addBtn.setAttribute('aria-disabled', 'true');

    // When nothing qualifies at all, show a single message instead of two
    // empty columns.
    if (suggestions.dark.length === 0 && suggestions.light.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = "No suggestions could improve this palette's coverage.";
      grid.appendChild(empty);
      return;
    }

    const darkCol = createColumn('Dark suggestions', suggestions.dark);
    const lightCol = createColumn('Light suggestions', suggestions.light);
    grid.appendChild(darkCol);
    grid.appendChild(lightCol);
  }

  function createColumn(title, items) {
    const col = document.createElement('div');
    col.className = 'suggestions-column';
    col.innerHTML = `<h3>${title}</h3>`;

    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted';
      empty.textContent = 'No suggestions available.';
      col.appendChild(empty);
      return col;
    }

    for (const item of items) {
      const el = document.createElement('label');
      el.className = 'suggestion-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.hex;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selected.add(item.hex);
          el.classList.add('selected');
        } else {
          selected.delete(item.hex);
          el.classList.remove('selected');
        }
        addBtn.setAttribute('aria-disabled', String(selected.size === 0));
      });

      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = item.hex;

      const info = document.createElement('div');
      info.className = 'suggestion-info';
      info.innerHTML = `
        <span class="suggestion-hex mono">${item.hex}</span>
        <span class="suggestion-type">${item.type}</span>
        <span class="suggestion-pairs">Pairs with: ${item.pairs.map((p) => p.hex).join(', ')}</span>
      `;

      el.appendChild(checkbox);
      el.appendChild(swatch);
      el.appendChild(info);

      const best = bestCheckLabel(item.pairs);
      if (best) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-pass suggestion-best';
        badge.textContent = best;
        el.appendChild(badge);
      }
      col.appendChild(el);
    }

    return col;
  }

  addBtn.addEventListener('click', () => {
    if (addBtn.getAttribute('aria-disabled') === 'true') return;

    const suggestions = [];
    for (const hex of selected) {
      suggestions.push({ id: generateId(), hex });
    }

    store.dispatch({ type: 'ADD_SUGGESTIONS_TO_PALETTE', payload: suggestions });
    selected.clear();
  });

  generateBtn.addEventListener('click', () => {
    const { palette } = store.getState();
    if (palette.length < 1) return;

    const suggestions = generateSuggestions(palette);
    store.dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
  });

  store.subscribe(render);
}
