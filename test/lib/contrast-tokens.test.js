import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hexToRgb } from '../../js/lib/color-convert.js';
import { contrastRatio } from '../../js/lib/contrast.js';

const variablesCss = readFileSync(resolve(process.cwd(), 'css/variables.css'), 'utf8');
const interfaceCss = [
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/palette-editor.css',
  'css/results.css',
  'css/suggestions.css',
  'css/storage-panel.css',
  'css/utilities.css',
].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n');

function declarations(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.replace(/\/\*[\s\S]*?\*\//g, '').trim(),
    ])
  );
}

const rootBlock = variablesCss.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
const lightBlock = variablesCss.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1];
const rootTokens = declarations(rootBlock);
const themes = {
  dark: rootTokens,
  light: { ...rootTokens, ...declarations(lightBlock) },
};

function token(theme, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular token reference: ${name}`);
  seen.add(name);
  const value = themes[theme][name];
  if (!value) throw new Error(`Unknown ${theme} token: ${name}`);
  const reference = value.match(/^var\(--([\w-]+)\)$/);
  return reference ? token(theme, reference[1], seen) : value;
}

function ratio(foreground, background) {
  return contrastRatio(hexToRgb(foreground), hexToRgb(background));
}

const surfaces = ['primary-bg', 'secondary-bg', 'surface-bg'];
const readableText = [
  'text-primary',
  'text-secondary',
  'text-tertiary',
  'text-muted',
  'color-link',
  'color-success',
  'color-error',
  'color-warning',
];

describe.each(Object.keys(themes))('%s Command-line Chic contrast inventory', (theme) => {
  it.each(readableText)('%s is at least 7:1 on every interface surface', (foreground) => {
    for (const background of surfaces) {
      expect(
        ratio(token(theme, foreground), token(theme, background)),
        `${foreground} on ${background}`
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it('button and badge text is at least 7:1 on its fill', () => {
    const pairs = [
      ['color-cta-text', 'color-cta', 'primary button'],
      ['primary-bg', 'color-error', 'danger button'],
      ['primary-bg', 'badge-pass', 'pass badge'],
      ['primary-bg', 'badge-fail', 'fail badge'],
    ];
    for (const [foreground, background, context] of pairs) {
      expect(
        ratio(token(theme, foreground), token(theme, background)),
        context
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it('control borders remain at least 3:1 against every interface surface', () => {
    for (const background of surfaces) {
      expect(
        ratio(token(theme, 'border-color'), token(theme, background)),
        `border on ${background}`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('the outer focus edge remains at least 3:1 against every interface surface', () => {
    for (const background of surfaces) {
      expect(
        ratio(token(theme, 'focus-contrast'), token(theme, background)),
        `focus edge on ${background}`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('the selected-state border remains at least 3:1 against its background', () => {
    expect(
      ratio(token(theme, 'selection-border'), token(theme, 'primary-bg'))
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('theme-independent alert contrast inventory', () => {
  it.each([
    ['yellow-dark', 'warning'],
    ['red-dark', 'error'],
    ['blue-dark', 'information'],
    ['green-dark', 'success'],
  ])('keeps %s alert text at least 7:1', (background, _context) => {
    expect(ratio(token('dark', 'alert-text'), token('dark', background))).toBeGreaterThanOrEqual(7);
  });

  it('uses fixed light text because alert fills stay dark in both themes', () => {
    expect(interfaceCss).toContain('color: var(--alert-text)');
    expect(interfaceCss).not.toMatch(/\.alert-(?:warning|error|success)[^{]*\{[^}]*color:\s*var\(--color-/s);
  });
});

describe('Command-line Chic typography inventory', () => {
  it('does not reduce interface text below the 18px root size', () => {
    expect(interfaceCss).not.toMatch(/font-size:\s*0?\.[0-9]+rem/);
    for (const [, pixels] of interfaceCss.matchAll(/font-size:\s*([0-9.]+)px/g)) {
      expect(Number(pixels)).toBeGreaterThanOrEqual(18);
    }
  });
});
