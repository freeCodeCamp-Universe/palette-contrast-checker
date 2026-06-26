import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  formatRatio,
  classifyContrast,
  analyzeAllPairs,
  findMissingCoverage,
} from '../../js/lib/contrast.js';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBe(1);
  });

  it('returns expected value for mid-gray', () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.3);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBe(21);
  });

  it('returns 1 for same color', () => {
    const ratio = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 });
    expect(ratio).toBe(1);
  });

  it('is symmetric', () => {
    const a = { r: 255, g: 0, b: 0 };
    const b = { r: 0, g: 0, b: 255 };
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });

  it('computes a known ratio', () => {
    // Pure blue on white — known to be around 8.59:1
    const ratio = contrastRatio({ r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeGreaterThan(8);
    expect(ratio).toBeLessThan(9);
  });

  it('returns the full-precision value (not rounded to 2 decimals)', () => {
    // #959595 on white is ~2.9957 — must stay below 3, not round up to 3.00.
    const ratio = contrastRatio({ r: 0x95, g: 0x95, b: 0x95 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeLessThan(3);
    expect(ratio).toBeGreaterThan(2.99);
  });
});

describe('formatRatio', () => {
  it('truncates to 2 decimals without rounding up', () => {
    expect(formatRatio(2.9957)).toBe(2.99);
    expect(formatRatio(21)).toBe(21);
    expect(formatRatio(4.5)).toBe(4.5);
  });
});

describe('classifyContrast', () => {
  it('classifies 21:1 as AAA everywhere', () => {
    expect(classifyContrast(21)).toEqual({
      normalText: 'AAA',
      largeText: 'AAA',
      nonText: 'AA',
    });
  });

  it('classifies 7:1 as AAA normal, AAA large, AA non-text', () => {
    expect(classifyContrast(7)).toEqual({
      normalText: 'AAA',
      largeText: 'AAA',
      nonText: 'AA',
    });
  });

  it('classifies 5:1 as AA normal, AAA large, AA non-text', () => {
    expect(classifyContrast(5)).toEqual({
      normalText: 'AA',
      largeText: 'AAA',
      nonText: 'AA',
    });
  });

  it('classifies 4.5:1 as AA normal, AAA large, AA non-text', () => {
    expect(classifyContrast(4.5)).toEqual({
      normalText: 'AA',
      largeText: 'AAA',
      nonText: 'AA',
    });
  });

  it('classifies 3.5:1 as fail normal, AA large, AA non-text', () => {
    expect(classifyContrast(3.5)).toEqual({
      normalText: 'fail',
      largeText: 'AA',
      nonText: 'AA',
    });
  });

  it('classifies 3:1 as fail normal, AA large, AA non-text', () => {
    expect(classifyContrast(3)).toEqual({
      normalText: 'fail',
      largeText: 'AA',
      nonText: 'AA',
    });
  });

  it('classifies 2.5:1 as fail everything', () => {
    expect(classifyContrast(2.5)).toEqual({
      normalText: 'fail',
      largeText: 'fail',
      nonText: 'fail',
    });
  });

  it('classifies 1:1 as fail everything', () => {
    expect(classifyContrast(1)).toEqual({
      normalText: 'fail',
      largeText: 'fail',
      nonText: 'fail',
    });
  });
});

describe('analyzeAllPairs', () => {
  it('produces N*(N-1) pairs', () => {
    const colors = [
      { id: '1', hex: '#000000', displayLabel: 'black' },
      { id: '2', hex: '#ffffff', displayLabel: 'white' },
      { id: '3', hex: '#ff0000', displayLabel: 'red' },
    ];
    const results = analyzeAllPairs(colors);
    expect(results).toHaveLength(6);
  });

  it('produces 2 pairs for 2 colors', () => {
    const colors = [
      { id: '1', hex: '#000000', displayLabel: 'black' },
      { id: '2', hex: '#ffffff', displayLabel: 'white' },
    ];
    const results = analyzeAllPairs(colors);
    expect(results).toHaveLength(2);
    expect(results[0].contrastRatio).toBe(21);
    expect(results[1].contrastRatio).toBe(21);
  });

  it('does not let a 2.99:1 pair pass the 3:1 thresholds (WCAG SC 1.4.3)', () => {
    const [r] = analyzeAllPairs([
      { id: '1', hex: '#959595', displayLabel: 'gray' },
      { id: '2', hex: '#ffffff', displayLabel: 'white' },
    ]);
    expect(r.contrastRatio).toBeLessThan(3); // displayed value floored to 2.99
    expect(r.normalText).toBe('fail');
    expect(r.largeText).toBe('fail');
    expect(r.nonText).toBe('fail');
  });

  it('includes directional info', () => {
    const colors = [
      { id: '1', hex: '#000000', displayLabel: 'black' },
      { id: '2', hex: '#ffffff', displayLabel: 'white' },
    ];
    const results = analyzeAllPairs(colors);
    const fgIds = results.map((r) => r.foregroundId);
    const bgIds = results.map((r) => r.backgroundId);
    expect(fgIds).toContain('1');
    expect(fgIds).toContain('2');
    expect(bgIds).toContain('1');
    expect(bgIds).toContain('2');
  });
});

describe('findMissingCoverage', () => {
  it('detects all missing when all fail', () => {
    const results = [
      { normalText: 'fail', largeText: 'fail', nonText: 'fail' },
    ];
    expect(findMissingCoverage(results)).toEqual({
      normalTextMissing: true,
      largeTextMissing: true,
      nonTextMissing: true,
      aaaNormalTextMissing: true,
    });
  });

  it('detects none missing when all pass', () => {
    const results = [
      { normalText: 'AAA', largeText: 'AAA', nonText: 'AA' },
    ];
    expect(findMissingCoverage(results)).toEqual({
      normalTextMissing: false,
      largeTextMissing: false,
      nonTextMissing: false,
      aaaNormalTextMissing: false,
    });
  });

  it('detects AAA normal text missing when only AA exists', () => {
    const results = [
      { normalText: 'AA', largeText: 'AAA', nonText: 'AA' },
    ];
    expect(findMissingCoverage(results)).toEqual({
      normalTextMissing: false,
      largeTextMissing: false,
      nonTextMissing: false,
      aaaNormalTextMissing: true,
    });
  });
});
