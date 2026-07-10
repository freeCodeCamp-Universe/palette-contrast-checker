import { describe, it, expect } from 'vitest';
import { parseColor, identifyFormat, canonicalize } from '../../js/lib/color-parse.js';

describe('parseColor', () => {
  describe('hex', () => {
    it('parses 6-digit hex with #', () => {
      expect(parseColor('#ff0080')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('parses 3-digit hex', () => {
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses hex without #', () => {
      expect(parseColor('ff0080')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('is case insensitive', () => {
      expect(parseColor('#FF0080')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('parses 8-digit hex (ignores alpha)', () => {
      expect(parseColor('#ff008080')).toEqual({ r: 255, g: 0, b: 128 });
    });
  });

  describe('rgb', () => {
    it('parses rgb()', () => {
      expect(parseColor('rgb(255, 0, 128)')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('parses with extra spaces', () => {
      expect(parseColor('rgb( 255 , 0 , 128 )')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('parses rgba() (ignores alpha)', () => {
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses space-separated rgb()', () => {
      expect(parseColor('rgb(255 0 128)')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('parses slash-alpha rgb() (ignores alpha)', () => {
      expect(parseColor('rgb(255 0 128 / 0.5)')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('rejects out-of-range values', () => {
      expect(parseColor('rgb(256, 0, 0)')).toBeNull();
    });
  });

  describe('hsl', () => {
    it('parses hsl()', () => {
      const result = parseColor('hsl(0, 100%, 50%)');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses hsla() (ignores alpha)', () => {
      const result = parseColor('hsla(0, 100%, 50%, 0.5)');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses space-separated hsl() with slash alpha', () => {
      expect(parseColor('hsl(0 100% 50% / .5)')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('rejects hue > 360', () => {
      expect(parseColor('hsl(400, 50%, 50%)')).toBeNull();
    });

    it('rejects saturation > 100', () => {
      expect(parseColor('hsl(0, 150%, 50%)')).toBeNull();
    });
  });

  describe('named colors', () => {
    it('parses coral', () => {
      expect(parseColor('coral')).toEqual({ r: 255, g: 127, b: 80 });
    });

    it('is case insensitive', () => {
      expect(parseColor('Coral')).toEqual({ r: 255, g: 127, b: 80 });
      expect(parseColor('CORAL')).toEqual({ r: 255, g: 127, b: 80 });
    });

    it('parses black', () => {
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('parses white', () => {
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseColor('')).toBeNull();
    });

    it('returns null for nonsense', () => {
      expect(parseColor('not-a-color')).toBeNull();
    });

    it('returns null for invalid hex chars', () => {
      expect(parseColor('#gggggg')).toBeNull();
    });

    it('returns null for non-string', () => {
      expect(parseColor(null)).toBeNull();
      expect(parseColor(undefined)).toBeNull();
      expect(parseColor(123)).toBeNull();
    });
  });
});

describe('identifyFormat', () => {
  it('identifies hex', () => {
    expect(identifyFormat('#ff0080').format).toBe('hex');
  });

  it('identifies rgb', () => {
    expect(identifyFormat('rgb(255, 0, 0)').format).toBe('rgb');
  });

  it('identifies hsl', () => {
    expect(identifyFormat('hsl(0, 100%, 50%)').format).toBe('hsl');
  });

  it('identifies named', () => {
    expect(identifyFormat('coral').format).toBe('named');
  });

  it('returns null format for invalid', () => {
    expect(identifyFormat('not-a-color').format).toBeNull();
  });
});

describe('canonicalize', () => {
  it('returns hex from rgb input', () => {
    expect(canonicalize('rgb(255, 0, 128)')).toBe('#ff0080');
  });

  it('returns hex from named color', () => {
    expect(canonicalize('coral')).toBe('#ff7f50');
  });

  it('returns hex from hsl', () => {
    expect(canonicalize('hsl(0, 100%, 50%)')).toBe('#ff0000');
  });

  it('normalizes hex to lowercase 6-digit', () => {
    expect(canonicalize('#F00')).toBe('#ff0000');
  });

  it('returns null for invalid input', () => {
    expect(canonicalize('nope')).toBeNull();
  });
});
