import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '../../js/lib/suggestions.js';

describe('generateSuggestions', () => {
  const palette = [
    { hex: '#ff0000' },
    { hex: '#00ff00' },
    { hex: '#0000ff' },
  ];

  it('returns 6 dark and 6 light suggestions', () => {
    const result = generateSuggestions(palette);
    expect(result.dark).toHaveLength(6);
    expect(result.light).toHaveLength(6);
  });

  it('includes both palette-derived and neutral types', () => {
    const result = generateSuggestions(palette);
    const darkTypes = result.dark.map((s) => s.type);
    expect(darkTypes.filter((t) => t === 'palette-derived')).toHaveLength(3);
    expect(darkTypes.filter((t) => t === 'neutral')).toHaveLength(3);
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

  it('works with a 2-color palette', () => {
    const small = [{ hex: '#000000' }, { hex: '#ffffff' }];
    const result = generateSuggestions(small);
    expect(result.dark).toHaveLength(6);
    expect(result.light).toHaveLength(6);
  });

  it('works with similar colors', () => {
    const similar = [{ hex: '#ff0000' }, { hex: '#ff0033' }];
    const result = generateSuggestions(similar);
    expect(result.dark.length + result.light.length).toBe(12);
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
