import { describe, it, expect } from 'vitest';
import {
  PAGE,
  escapePdfText,
  textWidth,
  truncateToWidth,
  opText,
  opRect,
  buildPdf,
} from '../../js/lib/pdf.js';
import { decodeLatin1, checkXref } from '../helpers/pdf.js';

describe('escapePdfText', () => {
  it('escapes backslashes and parens', () => {
    expect(escapePdfText('a(b)\\c')).toBe('a\\(b\\)\\\\c');
  });

  it('passes Latin-1 through and replaces everything else with ?', () => {
    expect(escapePdfText('café')).toBe('café');
    expect(escapePdfText('a\u{1f600}b')).toBe('a?b');
    expect(escapePdfText('日本')).toBe('??');
    expect(escapePdfText('a\tb\nc')).toBe('a?b?c');
  });
});

describe('textWidth / truncateToWidth', () => {
  it('reflects relative character widths', () => {
    expect(textWidth('iii', 10)).toBeLessThan(textWidth('WWW', 10));
  });

  it('scales with font size', () => {
    expect(textWidth('abc', 20)).toBeCloseTo(textWidth('abc', 10) * 2);
  });

  it('leaves short strings untouched and truncated ones within bounds', () => {
    expect(truncateToWidth('short', 10, 200)).toBe('short');
    const long = 'a very long label that cannot possibly fit in the column';
    const cut = truncateToWidth(long, 10, 80);
    expect(cut.endsWith('...')).toBe(true);
    expect(textWidth(cut, 10)).toBeLessThanOrEqual(80);
  });
});

describe('op helpers', () => {
  it('opText emits a positioned, escaped Tj', () => {
    const op = opText(54, 700, 'hi (there)', { font: 'F2', size: 12, color: [1, 0, 0] });
    expect(op).toBe('1 0 0 rg BT /F2 12 Tf 54 700 Td (hi \\(there\\)) Tj ET\n');
  });

  it('opRect emits fill-only and fill+stroke variants', () => {
    expect(opRect(10, 20, 30, 40, [0, 0.5, 1])).toBe('0 0.5 1 rg 10 20 30 40 re f\n');
    expect(opRect(10, 20, 30, 40, [1, 1, 1], [0.75, 0.75, 0.75])).toBe(
      '1 1 1 rg 0.75 0.75 0.75 RG 0.5 w 10 20 30 40 re B\n'
    );
  });
});

describe('buildPdf', () => {
  const oneStream = 'BT /F1 10 Tf 50 700 Td (hi) Tj ET\n';

  it('produces a structurally valid single-page file', () => {
    const bytes = buildPdf([oneStream]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const src = decodeLatin1(bytes);
    expect(src.startsWith('%PDF-1.4\n')).toBe(true);
    expect(src.endsWith('%%EOF')).toBe(true);
    expect(src).toContain('/Count 1');
    expect(src).toContain(`/MediaBox [0 0 ${PAGE.width} ${PAGE.height}]`);
    checkXref(bytes);
  });

  it('numbers pages and streams correctly across multiple pages', () => {
    const bytes = buildPdf([oneStream, oneStream, oneStream]);
    const src = decodeLatin1(bytes);
    expect(src).toContain('/Kids [6 0 R 8 0 R 10 0 R]');
    expect(src).toContain('/Count 3');
    expect(src.match(/\/Type \/Page(?![s])/g)).toHaveLength(3);
    checkXref(bytes);
  });

  it('keeps every byte single-width (codes <= 0xFF survive a round trip)', () => {
    const bytes = buildPdf([opText(54, 700, 'café — naïve', { size: 10 })]);
    checkXref(bytes);
  });
});
