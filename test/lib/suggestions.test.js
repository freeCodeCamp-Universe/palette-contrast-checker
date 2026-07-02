import { describe, it, expect } from 'vitest';
import {
  generateSuggestions,
  bestCheckLabel,
  smallestMissingThreshold,
} from '../../js/lib/suggestions.js';
import { hexToRgb } from '../../js/lib/color-convert.js';

function toRgbs(hexes) {
  return hexes.map((hex) => ({ hex, ...hexToRgb(hex) }));
}

describe('smallestMissingThreshold', () => {
  it('is 3 when no pair reaches any level', () => {
    expect(smallestMissingThreshold(toRgbs(['#ff0000', '#ff0033']))).toBe(3);
  });

  it('is 3 for a single-color palette (no pairs at all)', () => {
    expect(smallestMissingThreshold(toRgbs(['#ff0000']))).toBe(3);
  });

  it('is 4.5 when the palette only covers the 3:1 level', () => {
    // #5966f5 vs #380a0a is ~3.81:1 — large text AA but not normal text AA.
    expect(smallestMissingThreshold(toRgbs(['#5966f5', '#380a0a']))).toBe(4.5);
  });

  it('is Infinity when every level is covered', () => {
    expect(smallestMissingThreshold(toRgbs(['#000000', '#ffffff']))).toBe(Infinity);
  });
});

describe('coverage filter', () => {
  it('only suggests colors that add missing coverage', () => {
    // This palette already covers large-text/non-text AA (best pair ~3.81:1)
    // but lacks any normal-text AA pair, so every suggestion must bring a
    // pairing at 4.5:1 or better.
    const palette = [
      { hex: '#dd0203' },
      { hex: '#5966f5' },
      { hex: '#380a0a' },
      { hex: '#191970' },
    ];
    const result = generateSuggestions(palette);
    const all = [...result.dark, ...result.light];
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(Math.max(...s.pairs.map((p) => p.ratio)), s.hex).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('suggests nothing when the palette already covers every level', () => {
    const result = generateSuggestions([{ hex: '#000000' }, { hex: '#ffffff' }]);
    expect(result.dark).toHaveLength(0);
    expect(result.light).toHaveLength(0);
  });
});

describe('bestCheckLabel', () => {
  it('labels the strongest check the best pair satisfies', () => {
    expect(bestCheckLabel([{ ratio: 3.2 }, { ratio: 8.1 }])).toBe('Normal text: AAA');
    expect(bestCheckLabel([{ ratio: 4.6 }])).toBe('Normal text: AA');
    expect(bestCheckLabel([{ ratio: 3.2 }, { ratio: 4.1 }])).toBe('Large text: AA');
  });

  it('handles threshold boundaries exactly', () => {
    expect(bestCheckLabel([{ ratio: 7 }])).toBe('Normal text: AAA');
    expect(bestCheckLabel([{ ratio: 4.5 }])).toBe('Normal text: AA');
  });

  it('returns null when there are no qualifying pairs', () => {
    expect(bestCheckLabel([])).toBeNull();
  });
});

describe('generateSuggestions', () => {
  const palette = [
    { hex: '#ff0000' },
    { hex: '#00ff00' },
    { hex: '#0000ff' },
  ];

  it('returns up to 6 dark and 6 light suggestions', () => {
    const result = generateSuggestions(palette);
    expect(result.dark.length).toBeLessThanOrEqual(6);
    expect(result.light.length).toBeLessThanOrEqual(6);
  });

  it('includes at most 3 palette-derived and 3 neutral of each shade', () => {
    const result = generateSuggestions(palette);
    const darkTypes = result.dark.map((s) => s.type);
    const derived = darkTypes.filter((t) => t === 'palette-derived').length;
    const neutral = darkTypes.filter((t) => t === 'neutral').length;
    expect(derived).toBeGreaterThanOrEqual(0);
    expect(derived).toBeLessThanOrEqual(3);
    expect(neutral).toBeGreaterThanOrEqual(0);
    expect(neutral).toBeLessThanOrEqual(3);
  });

  it('does not include colors already in the palette', () => {
    const result = generateSuggestions(palette);
    const allHexes = [...result.dark, ...result.light].map((s) => s.hex.toLowerCase());
    for (const color of palette) {
      expect(allHexes).not.toContain(color.hex.toLowerCase());
    }
  });

  it('includes pairing information', () => {
    const result = generateSuggestions(palette);
    for (const s of [...result.dark, ...result.light]) {
      expect(s).toHaveProperty('pairs');
      expect(Array.isArray(s.pairs)).toBe(true);
    }
  });

  it('only returns suggestions that have at least one qualifying pair', () => {
    for (const p of [palette, [{ hex: '#000000' }, { hex: '#ffffff' }], [{ hex: '#ff0000' }, { hex: '#ff0033' }]]) {
      const result = generateSuggestions(p);
      for (const s of [...result.dark, ...result.light]) {
        expect(s.pairs.length).toBeGreaterThan(0);
      }
    }
  });

  it('works with a 2-color palette', () => {
    const small = [{ hex: '#000000' }, { hex: '#ffffff' }];
    const result = generateSuggestions(small);
    expect(result.dark.length).toBeLessThanOrEqual(6);
    expect(result.light.length).toBeLessThanOrEqual(6);
  });

  it('works with similar colors', () => {
    const similar = [{ hex: '#ff0000' }, { hex: '#ff0033' }];
    const result = generateSuggestions(similar);
    expect(result.dark.length + result.light.length).toBeLessThanOrEqual(12);
  });

  it('varies across repeated calls (Generate New Suggestions)', () => {
    // Collect all suggested hexes over many generations; a deterministic engine
    // would only ever surface one fixed set, so the union would equal a single
    // call's 12. Randomised selection should surface more than that.
    const all = new Set();
    for (let i = 0; i < 15; i++) {
      const result = generateSuggestions(palette);
      for (const s of [...result.dark, ...result.light]) all.add(s.hex.toLowerCase());
    }
    expect(all.size).toBeGreaterThan(12);
  });
});
