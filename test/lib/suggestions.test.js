import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '../../js/lib/suggestions.js';

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
