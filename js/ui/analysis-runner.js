/**
 * Analysis runner — handles the Analyze button, WIP save, and computation.
 */

import { analyzeAllPairs, findMissingCoverage } from '../lib/contrast.js';
import { findDuplicateGroups } from '../lib/duplicates.js';
import { saveWip } from '../state/persistence.js';
import { generateSuggestions } from '../lib/suggestions.js';

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
    store.dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: true });

    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const results = analyzeAllPairs(palette);
      store.dispatch({ type: 'SET_RESULTS', payload: results });

      const coverage = findMissingCoverage(results);
      const alerts = [];
      if (coverage.normalTextMissing) {
        alerts.push('No color pair in your palette passes for normal text (needs 4.5:1 minimum).');
      }
      if (coverage.largeTextMissing) {
        alerts.push('No color pair in your palette passes for large text (needs 3:1 minimum).');
      }
      if (coverage.nonTextMissing) {
        alerts.push('No color pair in your palette passes for non-text UI elements (needs 3:1 minimum).');
      }
      store.dispatch({ type: 'SET_ALERTS', payload: alerts });

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
