/**
 * Analysis runner — handles the Analyze button, WIP save, and computation.
 */

import { analyzeAllPairs, findMissingCoverage } from '../lib/contrast.js';
import { findDuplicateGroups } from '../lib/duplicates.js';
import { saveWip } from '../state/persistence.js';
import { generateSuggestions } from '../lib/suggestions.js';
import { encodePaletteToHash } from '../lib/palette-url.js';

export function initAnalysisRunner(store) {
  const analyzeBtn = document.getElementById('analyze-btn');
  const analyzeAnywayBtn = document.getElementById('analyze-anyway-btn');
  const warning = document.getElementById('analysis-warning');

  let pendingAnalysis = false;

  function runAnalysis() {
    const { palette } = store.getState();

    if (palette.length < 2) return;

    // Check for duplicates before analysis
    const dupGroups = findDuplicateGroups(palette);
    if (dupGroups.length > 0) {
      const alerts = ['Duplicate colors detected. Please resolve duplicates before analyzing.'];
      store.dispatch({ type: 'SET_ALERTS', payload: alerts });
      return;
    }

    // Save WIP
    saveWip(palette);

    // Check palette size warning
    if (palette.length > 10 && !pendingAnalysis) {
      warning.hidden = false;
      pendingAnalysis = true;
      return;
    }

    warning.hidden = true;
    pendingAnalysis = false;

    // The URL hash is written only here, on Analyze, so it always reflects an
    // analyzed palette (Load/Restore/edits leave it untouched).
    history.replaceState(null, '', encodePaletteToHash(palette) || window.location.pathname);

    store.dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: true });

    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const results = analyzeAllPairs(palette);
      store.dispatch({ type: 'SET_RESULTS', payload: results });

      // We only reach here when there are no duplicates, so clear any lingering
      // duplicate-blocking alert from a previous attempt.
      store.dispatch({ type: 'SET_ALERTS', payload: [] });

      // Coverage gaps are now surfaced as callouts in the Results panel
      // (results-view.js); here we only need the AAA-normal-text flag to decide
      // whether to auto-generate suggestions.
      const coverage = findMissingCoverage(results);

      // Auto-trigger suggestions when no AAA normal text pair
      if (coverage.aaaNormalTextMissing) {
        const suggestions = generateSuggestions(palette);
        store.dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
      }

      store.dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: false });
    }, 10);
  }

  analyzeBtn.addEventListener('click', () => {
    if (analyzeBtn.getAttribute('aria-disabled') === 'true') return;
    runAnalysis();
  });
  analyzeAnywayBtn.addEventListener('click', () => {
    pendingAnalysis = true;
    runAnalysis();
  });

  // The >10-color warning is shown on Analyze; clear it once the palette is
  // back within range so it doesn't linger after colors are removed.
  store.subscribe((state) => {
    if (state.palette.length <= 10) {
      warning.hidden = true;
      pendingAnalysis = false;
    }
  });
}
