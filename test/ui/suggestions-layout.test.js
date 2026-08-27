import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'css/suggestions.css'), 'utf8');

describe('suggestion card layout', () => {
  it('keeps the best-result badge in grid flow so it cannot cover suggestion text', () => {
    expect(css).toMatch(/\.suggestion-item\s*\{[^}]*display:\s*grid/s);
    expect(css).toMatch(/\.suggestion-best\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
    expect(css).not.toMatch(/\.suggestion-best\s*\{[^}]*position:\s*absolute/s);
  });
});
