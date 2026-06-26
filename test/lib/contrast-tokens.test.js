import { describe, it, expect } from 'vitest';
import { hexToRgb } from '../../js/lib/color-convert.js';
import { contrastRatio } from '../../js/lib/contrast.js';

// Guards the AAA (>=7:1) contract for the chrome text colors chosen in the
// contrast audit. If a value here changes, update css/variables.css /
// components.css to match (and vice versa).
const ratio = (fg, bg) => contrastRatio(hexToRgb(fg), hexToRgb(bg));

const SURFACES = ['#0a0a23', '#1b1b32', '#2a2a40']; // page, panel, card

describe('chrome text colors meet WCAG AAA', () => {
  it('muted text #bdbdc7 is AAA on every surface', () => {
    for (const bg of SURFACES) {
      expect(ratio('#bdbdc7', bg), `on ${bg}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('info-alert text (gray-10 #dfdfe2) is AAA on blue-dark #002ead', () => {
    expect(ratio('#dfdfe2', '#002ead')).toBeGreaterThanOrEqual(7);
  });
});
