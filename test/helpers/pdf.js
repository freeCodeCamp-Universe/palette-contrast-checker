import { expect } from 'vitest';

export function decodeLatin1(bytes) {
  return Array.from(bytes, (b) => String.fromCharCode(b)).join('');
}

// Walk the xref table and verify the file's structural claims: the
// startxref pointer, that each in-use entry points at "<n> 0 obj", and
// that every stream's declared /Length matches its actual byte count.
export function checkXref(bytes) {
  const src = decodeLatin1(bytes);

  const tail = src.match(/startxref\n(\d+)\n%%EOF$/);
  expect(tail, 'startxref trailer').not.toBeNull();
  const xrefOffset = Number(tail[1]);
  expect(src.slice(xrefOffset, xrefOffset + 5)).toBe('xref\n');

  const header = src.slice(xrefOffset).match(/^xref\n0 (\d+)\n/);
  expect(header, 'xref subsection header').not.toBeNull();
  const count = Number(header[1]);

  let pos = xrefOffset + header[0].length;
  for (let n = 0; n < count; n++) {
    const entry = src.slice(pos, pos + 20);
    expect(entry, `entry ${n} is 20 bytes`).toMatch(/^\d{10} \d{5} [nf] \n$/);
    if (entry[17] === 'n') {
      const offset = Number(entry.slice(0, 10));
      expect(src.slice(offset).startsWith(`${n} 0 obj`), `object ${n} offset`).toBe(true);
    }
    pos += 20;
  }

  const streamRe = /<< \/Length (\d+) >>\nstream\n/g;
  let m;
  while ((m = streamRe.exec(src)) !== null) {
    const length = Number(m[1]);
    const start = m.index + m[0].length;
    expect(src.slice(start + length, start + length + 10)).toBe('\nendstream');
  }
}
