import { describe, it, expect } from 'vitest';
import { exportAsPdf } from '../../js/lib/export-pdf.js';
import { decodeLatin1, checkXref } from '../helpers/pdf.js';

const palette = [
  { hex: '#000000', displayLabel: 'black' },
  { hex: '#ffffff', displayLabel: 'white' },
];

const results = [
  {
    foregroundHex: '#000000',
    foregroundLabel: 'black',
    backgroundHex: '#ffffff',
    backgroundLabel: 'white',
    contrastRatio: 21,
    normalText: 'AAA',
    largeText: 'AAA',
    nonText: 'AA',
    stateChecks: { hover: {}, focus: {}, active: {}, disabled: {} },
  },
  {
    foregroundHex: '#ffffff',
    foregroundLabel: 'white',
    backgroundHex: '#000000',
    backgroundLabel: 'black',
    contrastRatio: 21,
    normalText: 'AAA',
    largeText: 'AAA',
    nonText: 'AA',
    stateChecks: { hover: {}, focus: {}, active: {}, disabled: {} },
  },
];

function makeResult(overrides = {}) {
  return { ...results[0], ...overrides };
}

describe('exportAsPdf', () => {
  it('produces a structurally valid PDF', () => {
    const bytes = exportAsPdf(palette, results);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const src = decodeLatin1(bytes);
    expect(src.startsWith('%PDF-1.4\n')).toBe(true);
    expect(src.endsWith('%%EOF')).toBe(true);
    checkXref(bytes);
  });

  it('includes the title, summary, palette, and result rows', () => {
    const src = decodeLatin1(exportAsPdf(palette, results));
    expect(src).toContain('(Palette Contrast Analysis) Tj');
    expect(src).toContain('2 colors');
    expect(src).toContain('2 combinations');
    expect(src).toContain('(black) Tj');
    expect(src).toContain('(white) Tj');
    expect(src).toContain('(#000000) Tj');
    expect(src).toContain('(21:1) Tj');
    expect(src).toContain('(AAA) Tj');
    expect(src).toContain('(AA) Tj');
  });

  it('fits the two-color fixture on a single page', () => {
    const src = decodeLatin1(exportAsPdf(palette, results));
    expect(src).toContain('/Count 1');
    expect(src).toContain('(Page 1 of 1) Tj');
  });

  it('escapes parens and backslashes in labels', () => {
    const src = decodeLatin1(
      exportAsPdf(
        [{ hex: '#123456', displayLabel: 'bad (label) \\ test' }],
        [makeResult({ foregroundLabel: 'bad (label) \\ test' })]
      )
    );
    expect(src).toContain('bad \\(label\\) \\\\ test');
    expect(src).not.toContain('(bad (label)');
  });

  it('sanitizes non-Latin-1 characters in labels', () => {
    const src = decodeLatin1(
      exportAsPdf(
        [{ hex: '#123456', displayLabel: 'fire \u{1f525} red' }],
        [makeResult({ foregroundLabel: 'fire \u{1f525} red' })]
      )
    );
    expect(src).toContain('(fire ? red) Tj');
    expect(src).not.toContain('\u{1f525}');
  });

  it('flags failing checks distinctly from passing ones', () => {
    const src = decodeLatin1(
      exportAsPdf(palette, [
        makeResult({ contrastRatio: 1.2, normalText: 'fail', largeText: 'fail', nonText: 'fail' }),
      ])
    );
    // fail is rendered in red, passes in green
    expect(src).toContain('0.75 0.1 0.1 rg BT /F2 9 Tf');
    expect(src).toContain('(fail) Tj');
  });

  it('paginates a 10-color analysis and repeats the table header', () => {
    const colors = Array.from({ length: 10 }, (_, i) => ({
      hex: `#1122${String(i).padStart(2, '0')}`,
      displayLabel: `color ${i}`,
    }));
    const many = [];
    for (const fg of colors) {
      for (const bg of colors) {
        if (fg === bg) continue;
        many.push(
          makeResult({
            foregroundHex: fg.hex,
            foregroundLabel: fg.displayLabel,
            backgroundHex: bg.hex,
            backgroundLabel: bg.displayLabel,
          })
        );
      }
    }
    expect(many).toHaveLength(90);

    const bytes = exportAsPdf(colors, many);
    checkXref(bytes);
    const src = decodeLatin1(bytes);
    const count = Number(src.match(/\/Count (\d+)/)[1]);
    expect(count).toBeGreaterThan(1);
    expect(src.match(/\/Type \/Page(?![s])/g)).toHaveLength(count);
    expect(src.match(/\(Foreground\) Tj/g)).toHaveLength(count);
    expect(src).toContain(`(Page 1 of ${count}) Tj`);
    expect(src).toContain(`(Page ${count} of ${count}) Tj`);
  });

  it('handles empty results with a valid single page', () => {
    const bytes = exportAsPdf(palette, []);
    checkXref(bytes);
    const src = decodeLatin1(bytes);
    expect(src).toContain('/Count 1');
    expect(src).toContain('0 combinations');
  });
});
