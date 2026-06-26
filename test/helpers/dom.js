/**
 * Test helper: load the real index.html body into jsdom so UI modules
 * (which query elements by id) can be initialised against the actual markup.
 *
 * Usage (in a test file that opts into jsdom):
 *   // @vitest-environment jsdom
 *   import { loadAppDom, resetLocalStorage } from '../helpers/dom.js';
 *   beforeEach(() => { loadAppDom(); resetLocalStorage(); });
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// vitest runs from the repo root, so index.html is resolvable from cwd.
// (import.meta.url is not a file URL under the jsdom environment.)
const indexPath = resolve(process.cwd(), 'index.html');

/**
 * Replace document.body's contents with the markup from index.html.
 * The module <script> tag is stripped so nothing auto-bootstraps; tests
 * call the relevant init<Feature>(store) themselves.
 */
export function loadAppDom() {
  const html = readFileSync(indexPath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) throw new Error('Could not find <body> in index.html');
  const body = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  document.body.innerHTML = body;
}

/** Clear localStorage between tests (jsdom provides a real implementation). */
export function resetLocalStorage() {
  if (typeof localStorage !== 'undefined') localStorage.clear();
}
