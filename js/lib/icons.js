/**
 * Inline SVG icon set.
 *
 * Each export is an SVG markup string sized in `em` (so it scales with the
 * button's font-size) and drawn with `currentColor` (so it inherits text
 * color). All are decorative — the buttons that use them carry their own
 * `aria-label`/`title`, so the SVGs are `aria-hidden` and `focusable="false"`.
 */

function icon(paths) {
  return (
    '<svg class="icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    paths +
    '</svg>'
  );
}

export const eye = icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>');
export const chevronUp = icon('<path d="m6 15 6-6 6 6"/>');
export const chevronDown = icon('<path d="m6 9 6 6 6-6"/>');
export const close = icon('<path d="M18 6 6 18M6 6l12 12"/>');
