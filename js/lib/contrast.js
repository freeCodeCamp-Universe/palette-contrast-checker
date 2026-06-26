/**
 * WCAG 2.2 contrast ratio calculation and classification.
 * All functions are pure — no DOM access.
 */

import { hexToRgb } from './color-convert.js';

function linearize(channel) {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// Returns the full-precision contrast ratio. Per WCAG SC 1.4.3 the computed
// value must NOT be rounded before being compared to a threshold (e.g. 2.999
// does not meet 3:1), so callers classify with this precise value and only
// round for display via formatRatio().
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Round a ratio down to 2 decimals for display (truncate, never overstate).
export function formatRatio(ratio) {
  return Math.floor(ratio * 100) / 100;
}

export function classifyContrast(ratio) {
  return {
    normalText: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail',
    largeText: ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'fail',
    nonText: ratio >= 3 ? 'AA' : 'fail',
  };
}

export function stateChecks(ratio) {
  // MVP: hover/focus/active use the same colors as base, so same result.
  // Disabled uses non-text threshold (3:1).
  const base = classifyContrast(ratio);
  return {
    hover: base,
    focus: base,
    active: base,
    disabled: {
      normalText: ratio >= 3 ? (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'minimum') : 'fail',
      largeText: ratio >= 3 ? (ratio >= 4.5 ? 'AAA' : 'AA') : 'fail',
      nonText: ratio >= 3 ? 'AA' : 'fail',
    },
  };
}

export function analyzeAllPairs(colors) {
  const results = [];

  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < colors.length; j++) {
      if (i === j) continue;

      const fg = colors[i];
      const bg = colors[j];
      const fgRgb = hexToRgb(fg.hex);
      const bgRgb = hexToRgb(bg.hex);
      const ratio = contrastRatio(fgRgb, bgRgb);
      const classification = classifyContrast(ratio); // precise value for thresholds
      const states = stateChecks(ratio);

      results.push({
        foregroundId: fg.id,
        foregroundHex: fg.hex,
        foregroundLabel: fg.displayLabel,
        backgroundId: bg.id,
        backgroundHex: bg.hex,
        backgroundLabel: bg.displayLabel,
        contrastRatio: formatRatio(ratio), // rounded only for display
        normalText: classification.normalText,
        largeText: classification.largeText,
        nonText: classification.nonText,
        stateChecks: states,
      });
    }
  }

  return results;
}

export function findMissingCoverage(results) {
  const hasNormalText = results.some(
    (r) => r.normalText === 'AA' || r.normalText === 'AAA'
  );
  const hasLargeText = results.some(
    (r) => r.largeText === 'AA' || r.largeText === 'AAA'
  );
  const hasNonText = results.some((r) => r.nonText === 'AA');
  const hasAAANormalText = results.some((r) => r.normalText === 'AAA');

  return {
    normalTextMissing: !hasNormalText,
    largeTextMissing: !hasLargeText,
    nonTextMissing: !hasNonText,
    aaaNormalTextMissing: !hasAAANormalText,
  };
}
