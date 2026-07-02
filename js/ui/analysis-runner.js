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

  function runAnalysis(shouldScroll = false) {
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

      // Coverage gaps are now surfaced as callouts in the Contrast Analysis panel
      // (results-view.js); here we only need the AAA-normal-text flag to decide
      // whether to auto-generate suggestions.
      const coverage = findMissingCoverage(results);

      // Auto-trigger suggestions when no AAA normal text pair
      if (coverage.aaaNormalTextMissing) {
        const suggestions = generateSuggestions(palette);
        store.dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
      }

      store.dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: false });

      if (shouldScroll) scrollToResults();
    }, 10);
  }

  // Bring the Contrast Analysis panel into view when an explicit Analyze
  // lands with it off-screen (on mobile it starts below the fold). Loading a
  // shared URL auto-clicks Analyze (app.js triggerAnalyze), so the button
  // paths gate on event.isTrusted — only a real user click scrolls.
  function scrollToResults() {
    const section = document.getElementById('results-section');
    if (section.hidden || typeof section.scrollIntoView !== 'function') return;
    const rect = section.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.5 || rect.bottom < 0) {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  analyzeBtn.addEventListener('click', (event) => {
    if (analyzeBtn.getAttribute('aria-disabled') === 'true') return;
    runAnalysis(event.isTrusted);
  });
  analyzeAnywayBtn.addEventListener('click', (event) => {
    pendingAnalysis = true;
    runAnalysis(event.isTrusted);
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
