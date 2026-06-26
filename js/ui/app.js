/**
 * Application bootstrap.
 * Initializes the store, checks for recovery/URL state, and wires up all UI modules.
 */

import { createStore } from '../state/store.js';
import { reducer, getInitialState, generateId, resetIdCounter } from '../state/actions.js';
import { loadWip, loadPreferences } from '../state/persistence.js';
import { decodePaletteFromHash, encodePaletteToHash } from '../lib/palette-url.js';
import { initPaletteEditor } from './palette-editor.js';
import { initAnalysisRunner } from './analysis-runner.js';
import { initResultsView } from './results-view.js';
import { initResultsFilter } from './results-filter.js';
import { initPreviewControls } from './preview-controls.js';
import { initSuggestionsPanel } from './suggestions-panel.js';
import { initStoragePanel } from './storage-panel.js';
import { initAlerts } from './alerts.js';
import { initDragReorder } from './drag-reorder.js';

export let store;

export function getStore() {
  return store;
}

// Run analysis as if the user clicked Analyze. The handler enforces the
// minimum-color and >10-color (confirmation) rules, so we just delegate.
function triggerAnalyze() {
  const btn = document.getElementById('analyze-btn');
  if (btn && btn.getAttribute('aria-disabled') !== 'true') btn.click();
}

export function initApp() {
  const initialState = getInitialState();

  // Restore preferences
  const savedPrefs = loadPreferences();
  if (savedPrefs) {
    initialState.preferences = { ...initialState.preferences, ...savedPrefs };
  }

  store = createStore(reducer, initialState);

  // Keep the URL hash in sync with the palette: any palette state is shareable
  // and survives a reload. replaceState does not fire hashchange, so this does
  // not loop with the hashchange listener below.
  let lastPalette = store.getState().palette;
  store.subscribe((state) => {
    if (state.palette === lastPalette) return;
    lastPalette = state.palette;
    history.replaceState(null, '', encodePaletteToHash(state.palette) || window.location.pathname);
  });

  // Load a #p=... palette from the URL hash (returns true if one was loaded).
  function loadPaletteFromHash(hash) {
    const decoded = decodePaletteFromHash(hash);
    if (!decoded || decoded.length === 0) return false;
    const colors = decoded.map((c) => ({
      id: generateId(),
      hex: c.hex,
      displayLabel: c.displayLabel,
      originalInputs: [c.displayLabel],
      sourceType: 'url-import',
    }));
    store.dispatch({ type: 'LOAD_PALETTE', payload: colors });
    return true;
  }

  // React to #p=... links pasted into an already-open tab (a hash-only change
  // does not reload the page, so the initial load below would never see it).
  // The UI is already wired up at this point, so analyze immediately.
  window.addEventListener('hashchange', () => {
    if (loadPaletteFromHash(window.location.hash)) triggerAnalyze();
  });

  // Check URL hash for a shared palette on initial load.
  const loadedFromHash = loadPaletteFromHash(window.location.hash);
  if (!loadedFromHash) {
    // Check for WIP recovery
    const wip = loadWip();
    if (wip && wip.length > 0) {
      // Find the max ID in saved palette to avoid collisions
      let maxId = 0;
      for (const c of wip) {
        const n = parseInt(c.id, 10);
        if (!isNaN(n) && n > maxId) maxId = n;
      }
      resetIdCounter(maxId + 1);

      store.dispatch({
        type: 'SET_RECOVERY_AVAILABLE',
        payload: true,
      });
      initRecoveryBanner(wip);
    }
  }

  // Initialize all UI modules
  initPaletteEditor(store);
  initAnalysisRunner(store);
  initResultsView(store);
  initResultsFilter(store);
  initPreviewControls(store);
  initSuggestionsPanel(store);
  initStoragePanel(store);
  initAlerts(store);
  initDragReorder(store);

  // A palette imported from the URL is analyzed automatically — done after the
  // UI is wired up so the Analyze handler and button state exist.
  if (loadedFromHash) triggerAnalyze();
}

function initRecoveryBanner(wipPalette) {
  const banner = document.getElementById('recovery-banner');
  const restoreBtn = document.getElementById('recovery-restore-btn');
  const dismissBtn = document.getElementById('recovery-dismiss-btn');

  banner.hidden = false;

  restoreBtn.addEventListener('click', () => {
    store.dispatch({ type: 'LOAD_PALETTE', payload: wipPalette });
    store.dispatch({ type: 'SET_RECOVERY_AVAILABLE', payload: false });
    banner.hidden = true;
    // Restoring loads a palette (and updates the URL), so analyze it too — the
    // same behaviour as importing a palette from a #p= URL.
    triggerAnalyze();
  });

  dismissBtn.addEventListener('click', () => {
    store.dispatch({ type: 'SET_RECOVERY_AVAILABLE', payload: false });
    banner.hidden = true;
  });
}
