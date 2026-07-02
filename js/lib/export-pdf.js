/**
 * Export analysis results as a PDF document.
 * Layout only — the PDF plumbing lives in pdf.js.
 */

import { PAGE, buildPdf, opText, opRect, textWidth, truncateToWidth } from './pdf.js';
import { hexToRgb } from './color-convert.js';

const MARGIN = 54;
const CONTENT_W = PAGE.width - MARGIN * 2;
const TOP_Y = PAGE.height - MARGIN;
const BOTTOM_Y = 50;
const ROW_H = 24;
const PALETTE_ROW_H = 18;
const TABLE_HEADER_H = 20;

const MUTED = [0.45, 0.45, 0.45];
const PASS_GREEN = [0, 0.45, 0.2];
const FAIL_RED = [0.75, 0.1, 0.1];
const HEADER_BAND = [0.93, 0.93, 0.93];
const ZEBRA = [0.96, 0.96, 0.96];
const SWATCH_STROKE = [0.75, 0.75, 0.75];

const COLS = [
  { label: 'Foreground', x: 0, w: 130 },
  { label: 'Background', x: 130, w: 130 },
  { label: 'Ratio', x: 260, w: 54 },
  { label: 'Normal Text', x: 314, w: 64 },
  { label: 'Large Text', x: 378, w: 64 },
  { label: 'Non-text UI', x: 442, w: 62 },
];

function fillFromHex(hex) {
  const c = hexToRgb(hex);
  if (!c) return [1, 1, 1];
  return [c.r / 255, c.g / 255, c.b / 255];
}

function tableHeaderOps(top) {
  const ops = [opRect(MARGIN, top - TABLE_HEADER_H, CONTENT_W, TABLE_HEADER_H, HEADER_BAND)];
  for (const col of COLS) {
    ops.push(opText(MARGIN + col.x + 2, top - 14, col.label, { font: 'F2', size: 9 }));
  }
  return ops.join('');
}

// One result row; `top` is the row's top edge.
function resultRowOps(r, top, index) {
  const ops = [];
  if (index % 2 === 1) {
    ops.push(opRect(MARGIN, top - ROW_H, CONTENT_W, ROW_H, ZEBRA));
  }
  ops.push(colorCellOps(r.foregroundLabel, r.foregroundHex, MARGIN + COLS[0].x, top));
  ops.push(colorCellOps(r.backgroundLabel, r.backgroundHex, MARGIN + COLS[1].x, top));
  ops.push(
    opText(MARGIN + COLS[2].x + 2, top - 15, `${r.contrastRatio}:1`, { font: 'F3', size: 9 })
  );
  ops.push(ratingOps(r.normalText, COLS[3], top));
  ops.push(ratingOps(r.largeText, COLS[4], top));
  ops.push(ratingOps(r.nonText, COLS[5], top));
  return ops.join('');
}

// Swatch, label, and hex stacked in a Foreground/Background cell.
function colorCellOps(label, hex, x, top) {
  return [
    opRect(x + 2, top - 13, 9, 9, fillFromHex(hex), SWATCH_STROKE),
    opText(x + 14, top - 11, truncateToWidth(label, 9, COLS[0].w - 16), { size: 9 }),
    opText(x + 14, top - 21, hex, { font: 'F3', size: 7.5, color: MUTED }),
  ].join('');
}

function ratingOps(value, col, top) {
  const color = value === 'fail' ? FAIL_RED : PASS_GREEN;
  return opText(MARGIN + col.x + 2, top - 15, value, { font: 'F2', size: 9, color });
}

export function exportAsPdf(palette, results) {
  const pages = [];
  let ops = [];
  let y = TOP_Y;

  function breakPage(nextPageOps) {
    pages.push(ops.join(''));
    ops = nextPageOps;
    y = TOP_Y;
  }

  ops.push(opText(MARGIN, y, 'Palette Contrast Analysis', { font: 'F2', size: 18 }));
  y -= 26;

  const date = new Date().toISOString().split('T')[0];
  ops.push(
    opText(
      MARGIN,
      y,
      `Generated ${date}  ·  ${palette.length} colors  ·  ${results.length} combinations`,
      { size: 10, color: MUTED }
    )
  );
  y -= 28;

  ops.push(opText(MARGIN, y, 'Palette', { font: 'F2', size: 13 }));
  y -= 20;

  for (const c of palette) {
    if (y - PALETTE_ROW_H < BOTTOM_Y) breakPage([]);
    ops.push(opRect(MARGIN, y - 2, 12, 12, fillFromHex(c.hex), SWATCH_STROKE));
    ops.push(opText(MARGIN + 18, y, truncateToWidth(c.displayLabel, 10, 220), { size: 10 }));
    ops.push(opText(MARGIN + 250, y, c.hex, { font: 'F3', size: 9, color: MUTED }));
    y -= PALETTE_ROW_H;
  }

  y -= 16;
  if (y - TABLE_HEADER_H - ROW_H < BOTTOM_Y) breakPage([]);
  ops.push(opText(MARGIN, y, 'Results', { font: 'F2', size: 13 }));
  y -= 14;
  ops.push(tableHeaderOps(y));
  y -= TABLE_HEADER_H;

  results.forEach((r, i) => {
    if (y - ROW_H < BOTTOM_Y) {
      breakPage([tableHeaderOps(TOP_Y)]);
      y -= TABLE_HEADER_H;
    }
    ops.push(resultRowOps(r, y, i));
    y -= ROW_H;
  });
  pages.push(ops.join(''));

  const footered = pages.map((page, i) => {
    const label = `Page ${i + 1} of ${pages.length}`;
    const x = MARGIN + (CONTENT_W - textWidth(label, 8)) / 2;
    return page + opText(x, 30, label, { size: 8, color: MUTED });
  });

  return buildPdf(footered);
}
