/**
 * Results filter and sort controls.
 */

import { savePreferences } from '../state/persistence.js';
import { contrastRatio } from '../lib/contrast.js';
import { hexToRgb } from '../lib/color-convert.js';

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

// Black or white, whichever reads better on the given swatch color — so the
// option label stays legible on its own background (this is a contrast tool!).
export function readableTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  return contrastRatio(rgb, BLACK) >= contrastRatio(rgb, WHITE) ? '#000000' : '#ffffff';
}

export function initResultsFilter(store) {
  const levelFilter = document.getElementById('filter-level');
  const categoryFilter = document.getElementById('filter-category');
  const fgFilter = document.getElementById('filter-foreground');
  const bgFilter = document.getElementById('filter-background');
  const sortSelect = document.getElementById('sort-select');

  // Restore from state
  const { preferences } = store.getState();
  levelFilter.value = preferences.activeFilters.level || 'all';
  categoryFilter.value = preferences.activeFilters.category || 'all';
  sortSelect.value = preferences.activeSort || 'contrast-desc';

  function dispatchFilters() {
    store.dispatch({
      type: 'SET_FILTERS',
      payload: {
        level: levelFilter.value,
        category: categoryFilter.value,
        foreground: fgFilter.value || null,
        background: bgFilter.value || null,
      },
    });
    savePreferences(store.getState().preferences);
  }

  levelFilter.addEventListener('change', dispatchFilters);
  categoryFilter.addEventListener('change', dispatchFilters);
  fgFilter.addEventListener('change', dispatchFilters);
  bgFilter.addEventListener('change', dispatchFilters);

  sortSelect.addEventListener('change', () => {
    store.dispatch({ type: 'SET_SORT', payload: sortSelect.value });
    savePreferences(store.getState().preferences);
  });

  // Update foreground/background filter options when palette changes
  store.subscribe((state) => {
    if (state.results) {
      updateColorFilterOptions(fgFilter, state.palette, state.preferences.activeFilters.foreground);
      updateColorFilterOptions(bgFilter, state.palette, state.preferences.activeFilters.background);
    }
  });
}

function updateColorFilterOptions(select, palette, currentValue) {
  const firstOption = select.options[0];
  select.innerHTML = '';
  select.appendChild(firstOption);

  for (const color of palette) {
    const opt = document.createElement('option');
    opt.value = color.hex;
    opt.textContent = `${color.displayLabel}`;
    opt.style.backgroundColor = color.hex;
    opt.style.color = readableTextColor(color.hex);
    select.appendChild(opt);
  }

  if (currentValue) {
    select.value = currentValue;
  }
}
