// Test helpers: write small invented CII v14 files, cut X-S1M from X-S1 by byte-span edits,
// and a tiny DOM adapter so ciifr-map's XML reader runs in Node without packages.
// Run `node tests/fixture-tools.mjs` to (re)write the invented fixtures and the manifest.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readCii14 } from '../kit/cii14.mjs';
import { scanXml } from '../kit/xmlspan.mjs';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const enc = s => new Uint8Array(Buffer.from(s, 'latin1'));

/** A number the way v14 writes it: 1.390000E+03, right-aligned in 13 characters. */
export function f13(v) {
  const [m, e] = Number(v).toExponential(6).toUpperCase().split('E');
  const s = m + 'E' + (e[0] === '-' ? '-' : '+') + e.replace(/^[+-]/, '').padStart(2, '0');
  if (s.length > 13) throw Error('does not fit: ' + v);
  return s.padStart(13);
}
const i13 = v => String(v).padStart(13);
const row = fields => '  ' + fields.join('');

const UNITS = [
  [25.4, 4.44822, 0.453592, 0.112985, 0.112985, 6.89476], [0.555556, -17.7778, 6.89476, 6.89476, 0.02768, 0.02768],
  [0.02768, 1.75127, 0.112985, 1.75127, 1, 6.89476], [0.0254, 25.4, 25.4, 25.4]].map(r => row(r.map(f13)))
  .concat(['SI (mm)', 'on', 'mm.', 'N.', 'Kg.', 'N.m.', 'N.m..', 'KPa', 'C', 'C', 'KPa', 'KPa', 'kg.cu.cm.', 'kg.cu.cm.',
    'kg.cu.cm.', 'N./cm.', 'N.m./deg', 'N./cm.', "g's", 'Kpa', 'm.', 'mm.', 'mm.', 'mm.'].map(s => '  ' + s));

/**
 * Invented CII v14 text. elements: [{from, to, d:[dx,dy,dz]}], coords: [{node, xyz}].
 * Options: lengthUnit (UNITS label row 7), coordsCount (to make a broken COORDS section).
 */
export function makeCii({ elements, coords = [], lengthUnit = 'mm.', coordsCount }) {
  const L = ['#$ VERSION', '    5.00000      14.0000        1256', '  Invented test model (p11-cii-map)', '#$ CONTROL',
    row([elements.length, 0, 0, 0, 0, 0].map(i13)), row([0, 0, 0, 0, 0, 0].map(i13)), row([0, 0, 0, 0, 0, 0].map(i13)), row([0].map(i13)),
    '#$ ELEMENTS'];
  for (const e of elements) {
    L.push(row([i13(e.from), i13(e.to), ...e.d.map(f13), f13(e.od ?? 168.275)]));
    L.push(row([f13(e.wall ?? 7.112), f13(0), f13(0), f13(e.t1 ?? 100), f13(0), f13(0)]));
    for (let r = 2; r < 12; r++) L.push(row([0, 0, 0, 0, 0, 0].map(f13)));
    L.push(row([0, 0, 0, 0, 0, 0].map(i13)), row([0, 0, 0, 0, 0, 0].map(i13)), row([0, 0, 0].map(i13)));
  }
  const units = UNITS.slice(); units[6] = '  ' + lengthUnit;
  L.push('#$ UNITS', ...units, '#$ COORDS', row([i13(coordsCount ?? coords.length)]),
    ...coords.map(c => row([i13(c.node), ...c.xyz.map(f13)])));
  return enc(L.join('\r\n') + '\r\n');
}

/** Replace byte spans [{start, end, text}] (text must have the same length). */
export function replaceSpans(bytes, edits) {
  const out = new Uint8Array(bytes);
  for (const e of edits) {
    if (e.text.length !== e.end - e.start) throw Error('span width changed');
    out.set(enc(e.text), e.start);
  }
  return out;
}

/** X-S1M: X-S1 with the rigid weight x 1.1, T1 of elements 3 and 7 (0-based) + 25, NODENAME entry 1 FROM name changed. */
export function makeS1M(s1bytes) {
  const c = readCii14(s1bytes);
  const w = c.rigids[0].weight, n1 = c.nodeNames[0].from;
  const t1 = [3, 7].map(i => c.elements[i].fields.T1);
  return replaceSpans(s1bytes, [
    { start: w.start, end: w.end, text: f13(Math.round(w.value * 1.1 * 1000) / 1000) },
    ...t1.map(f => ({ start: f.start, end: f.end, text: f13(f.value + 25) })),
    { start: n1.start, end: n1.end, text: 'P11-RENAMED'.padEnd(n1.end - n1.start) },
  ]);
}

/** The invented fixtures. Node 30 of "bend-moved" sits 0.5 mm further along X than in "bend". */
export const INVENTED = {
  'line3.cii': { purpose: 'T6: 3 elements, all 4 nodes on one straight line (automatic anchors must refuse)',
    model: { elements: [{ from: 10, to: 20, d: [1000, 0, 0] }, { from: 20, to: 30, d: [1000, 0, 0] }, { from: 30, to: 40, d: [1000, 0, 0] }],
      coords: [{ node: 10, xyz: [0, 0, 0] }] } },
  'bend.cii': { purpose: 'T7: 4 elements in an L and a riser (not on one line)',
    model: { elements: [{ from: 10, to: 20, d: [1000, 0, 0] }, { from: 20, to: 30, d: [1000, 0, 0] }, { from: 30, to: 40, d: [0, 0, 1000] }, { from: 40, to: 50, d: [0, 1000, 0] }],
      coords: [{ node: 10, xyz: [5000, 2000, 1000] }] } },
  'bend-moved.cii': { purpose: 'T7: bend.cii with node 30 moved +0.5 mm in X (other nodes unchanged)',
    model: { elements: [{ from: 10, to: 20, d: [1000, 0, 0] }, { from: 20, to: 30, d: [1000.5, 0, 0] }, { from: 30, to: 40, d: [-0.5, 0, 1000] }, { from: 40, to: 50, d: [0, 1000, 0] }],
      coords: [{ node: 10, xyz: [5000, 2000, 1000] }] } },
};

export const sha256 = b => createHash('sha256').update(b).digest('hex');

/** Minimal DOM over kit/xmlspan.mjs: just what ciifr-map xml-profiles.js / xml-utils.js call. */
export const xmlDomParser = {
  parseFromString(text) {
    const doc = scanXml(new TextEncoder().encode(text));
    const wrap = el => ({ nodeType: 1, tagName: el.name, namespaceURI: null,
      get childNodes() { return el.children.map(wrap); },
      getAttribute(n) { const a = el.attrs.find(x => x.name === n); return a ? a.value : null; } });
    return { documentElement: wrap(doc.root), getElementsByTagName: n => doc.elements.filter(e => e.name === n).map(wrap) };
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const manifestPath = FIXTURES + 'manifest.json';
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const keep = manifest.files.filter(f => !(f.file in INVENTED));
  for (const [file, { purpose, model }] of Object.entries(INVENTED)) {
    const bytes = makeCii(model);
    writeFileSync(FIXTURES + file, bytes);
    keep.push({ file, sha256: sha256(bytes), bytes: bytes.length, madeBy: 'tests/fixture-tools.mjs (invented)', purpose });
  }
  const { readBenchmark } = await import('../kit/node.mjs');
  const s1 = await readBenchmark('X-S1');
  const s1m = makeS1M(s1.bytes);
  writeFileSync(FIXTURES + 'X-S1M.cii', s1m);
  keep.splice(keep.findIndex(f => f.file === 'X-S1M.cii') >>> 0, keep.some(f => f.file === 'X-S1M.cii') ? 1 : 0);
  keep.push({ file: 'X-S1M.cii', sha256: sha256(s1m), bytes: s1m.length, madeBy: 'tests/fixture-tools.mjs makeS1M (T3 rewrites it)',
    from: { id: 'X-S1', path: s1.entry.path, sha256: s1.entry.sha256 },
    purpose: 'T3 / B1: X-S1 with 4 planted changes: RIGID 1 weight x 1.1, T1 of elements 3 and 7 (0-based) + 25, NODENAME entry 1 FROM name' });
  manifest.files = keep.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  console.log(manifest.files.map(f => f.file + ' ' + f.bytes).join('\n'));
}
