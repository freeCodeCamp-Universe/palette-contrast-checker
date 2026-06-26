/**
 * Color suggestion engine.
 * Generates 12 suggestions: 6 dark + 6 light, half palette-derived, half neutral.
 */

import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './color-convert.js';
import { contrastRatio, classifyContrast } from './contrast.js';

const DARK_NEUTRALS = [
  '#1a1a2e', '#16213e', '#0f3460', '#2c2c54',
  '#1e272e', '#2d3436', '#1b1b32', '#0a0a23',
  '#191970', '#1c1c3c',
];

const LIGHT_NEUTRALS = [
  '#f8f9fa', '#e9ecef', '#f0e6ff', '#fff3cd',
  '#d4edda', '#ffeaa7', '#f5f5f5', '#ffffff',
  '#f0f0f5', '#e8e8f0',
];

export function generateSuggestions(palette) {
  const paletteHexes = new Set(palette.map((c) => c.hex.toLowerCase()));
  const paletteRgbs = palette.map((c) => ({ hex: c.hex, ...hexToRgb(c.hex) }));

  const darkDerived = generatePaletteDerived(paletteRgbs, paletteHexes, 'dark');
  const darkNeutral = generateNeutrals(DARK_NEUTRALS, paletteRgbs, paletteHexes);
  const lightDerived = generatePaletteDerived(paletteRgbs, paletteHexes, 'light');
  const lightNeutral = generateNeutrals(LIGHT_NEUTRALS, paletteRgbs, paletteHexes);

  // Pick 3 of each kind at random from the top-scoring candidates so that
  // "Generate New Suggestions" produces fresh (but still good) options on each
  // click instead of the same deterministic set every time.
  return {
    dark: [...pickRandom(darkDerived, 3), ...pickRandom(darkNeutral, 3)],
    light: [...pickRandom(lightDerived, 3), ...pickRandom(lightNeutral, 3)],
  };
}

// Return up to `count` items chosen at random from `items` (no repeats).
function pickRandom(items, count) {
  if (items.length <= count) return items.slice();
  const pool = items.slice();
  const out = [];
  while (out.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function generatePaletteDerived(paletteRgbs, paletteHexes, mode) {
  const candidates = [];
  const isDark = mode === 'dark';
  const targetLRange = isDark ? [8, 18] : [85, 95];
  const satMultiplier = isDark ? 0.7 : 0.6;

  for (const color of paletteRgbs) {
    const hsl = rgbToHsl(color.r, color.g, color.b);

    // Generate candidates at different lightness levels
    for (let lOffset = 0; lOffset <= 2; lOffset++) {
      const l = targetLRange[0] + (lOffset * (targetLRange[1] - targetLRange[0])) / 2;
      const s = Math.round(hsl.s * satMultiplier);
      const rgb = hslToRgb(hsl.h, s, Math.round(l));
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      if (paletteHexes.has(hex.toLowerCase())) continue;
      if (candidates.some((c) => c.hex === hex)) continue;

      const score = scoreSuggestion(rgb, paletteRgbs);
      candidates.push({
        hex,
        type: 'palette-derived',
        ...score,
      });
    }
  }

  // Also try hue-shifted variants
  for (const color of paletteRgbs) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    for (const hueShift of [30, -30]) {
      const l = isDark ? 13 : 90;
      const s = Math.round(hsl.s * satMultiplier);
      const rgb = hslToRgb((hsl.h + hueShift + 360) % 360, s, l);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      if (paletteHexes.has(hex.toLowerCase())) continue;
      if (candidates.some((c) => c.hex === hex)) continue;

      const score = scoreSuggestion(rgb, paletteRgbs);
      candidates.push({
        hex,
        type: 'palette-derived',
        ...score,
      });
    }
  }

  candidates.sort((a, b) => b.aaaCount - a.aaaCount || b.avgRatio - a.avgRatio);
  return candidates.slice(0, 8);
}

function generateNeutrals(neutralPool, paletteRgbs, paletteHexes) {
  const candidates = [];

  for (const hex of neutralPool) {
    if (paletteHexes.has(hex.toLowerCase())) continue;

    const rgb = hexToRgb(hex);
    const score = scoreSuggestion(rgb, paletteRgbs);
    candidates.push({
      hex,
      type: 'neutral',
      ...score,
    });
  }

  candidates.sort((a, b) => b.aaaCount - a.aaaCount || b.avgRatio - a.avgRatio);
  return candidates.slice(0, 8);
}

function scoreSuggestion(suggestionRgb, paletteRgbs) {
  let aaaCount = 0;
  let aaCount = 0;
  let totalRatio = 0;
  const pairs = [];

  for (const color of paletteRgbs) {
    const ratio = contrastRatio(suggestionRgb, color);
    const classification = classifyContrast(ratio);
    totalRatio += ratio;

    if (classification.normalText === 'AAA') aaaCount++;
    if (classification.normalText !== 'fail') aaCount++;

    if (classification.normalText !== 'fail' || classification.largeText !== 'fail' || classification.nonText !== 'fail') {
      pairs.push({
        hex: color.hex,
        ratio,
        normalText: classification.normalText,
        largeText: classification.largeText,
        nonText: classification.nonText,
      });
    }
  }

  return {
    aaaCount,
    aaCount,
    avgRatio: totalRatio / paletteRgbs.length,
    pairs,
  };
}
