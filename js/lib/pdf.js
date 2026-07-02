/**
 * Minimal PDF 1.4 writer — pure, no DOM, no dependencies.
 *
 * The whole file is assembled as a JS string whose characters are all
 * single-byte (codes <= 0xFF), then encoded to a Uint8Array at the end.
 * That invariant makes string offsets equal byte offsets, which the xref
 * table depends on. escapePdfText() is the sole gate for user-supplied
 * text: it replaces anything outside WinAnsi's Latin-1 range with '?'.
 */

export const PAGE = { width: 612, height: 792 }; // US Letter, points

// Helvetica AFM advance widths (per mille) for chars 0x20–0x7E.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const FALLBACK_WIDTH = 556;

// Escape for a PDF literal string and enforce the single-byte invariant:
// backslash and parens get escaped; printable Latin-1 passes through;
// everything else (control chars, emoji, CJK, …) becomes '?'.
export function escapePdfText(str) {
  let out = '';
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out += ch;
    else out += '?';
  }
  return out;
}

// Estimated rendered width in points of str in Helvetica at the given size.
export function textWidth(str, size) {
  let units = 0;
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    units +=
      code >= 0x20 && code <= 0x7e ? HELVETICA_WIDTHS[code - 0x20] : FALLBACK_WIDTH;
  }
  return (units / 1000) * size;
}

// Truncate str (appending '...') so it fits within maxWidth points.
export function truncateToWidth(str, size, maxWidth) {
  const s = String(str);
  if (textWidth(s, size) <= maxWidth) return s;
  const chars = Array.from(s);
  let end = chars.length;
  while (end > 0 && textWidth(chars.slice(0, end).join('') + '...', size) > maxWidth) {
    end--;
  }
  return chars.slice(0, end).join('') + '...';
}

// Serialize a coordinate without float noise (54.00000000001 → "54").
function num(n) {
  return String(Number(n.toFixed(2)));
}

function rgb(color) {
  return color.map(num).join(' ');
}

// Text op. x/y position the baseline; color components are 0–1.
export function opText(x, y, text, { font = 'F1', size = 10, color = [0, 0, 0] } = {}) {
  return `${rgb(color)} rg BT /${font} ${num(size)} Tf ${num(x)} ${num(y)} Td (${escapePdfText(text)}) Tj ET\n`;
}

// Filled rectangle; optional 0.5pt stroke (so light fills stay visible).
export function opRect(x, y, w, h, fill, stroke = null) {
  const rect = `${num(x)} ${num(y)} ${num(w)} ${num(h)} re`;
  if (stroke) {
    return `${rgb(fill)} rg ${rgb(stroke)} RG 0.5 w ${rect} B\n`;
  }
  return `${rgb(fill)} rg ${rect} f\n`;
}

/**
 * Assemble a complete PDF from per-page content streams.
 *
 * Object graph (fixed numbering — page count is known up front, so no
 * back-patching): 1 catalog, 2 pages root, 3/4/5 fonts F1 Helvetica,
 * F2 Helvetica-Bold, F3 Courier, then per page i: 6+2i page, 7+2i stream.
 */
export function buildPdf(pageContents) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];

  const kids = pageContents.map((_, i) => `${6 + 2 * i} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageContents.length} >>`);

  for (const name of ['Helvetica', 'Helvetica-Bold', 'Courier']) {
    objects.push(
      `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`
    );
  }

  pageContents.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`
    );
    // /Length counts exactly the bytes between "stream\n" and "\nendstream".
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  // Header comment with high-bit bytes marks the file as binary.
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objects.forEach((body, idx) => {
    offsets.push(out.length);
    out += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  // Every xref entry must be exactly 20 bytes, hence the space before \n.
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}
