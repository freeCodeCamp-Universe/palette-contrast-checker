import { describe, it, expect } from 'vitest';
import { readableTextColor } from '../../js/ui/results-filter.js';

describe('readableTextColor', () => {
  it('uses black text on light swatches', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#f1be32')).toBe('#000000'); // fCC gold
    expect(readableTextColor('#acd157')).toBe('#000000'); // lime
  });

  it('uses white text on dark swatches', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#0a0a23')).toBe('#ffffff'); // fCC navy
    expect(readableTextColor('#5a01a7')).toBe('#ffffff'); // purple-dark
  });
});
