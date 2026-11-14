// p11-cii-map: CII v14 -> geometry graph with the SAME shape as ciifr-map buildXmlGraph.
// Pure: bytes in, graph out. No DOM, no fs, no network.
//
// How it works:
//  1. kit/cii14.mjs readCii14 reads the file (v14 only; it refuses everything else with CII_* codes).
//  2. We turn the CII into the same "profile" object that ciifr-map xml-profiles.js makes from an
//     F05 / R4 XML: {profile, elements[{index, from, to, delta, od, wall, witness, xmlWitness}], units, seeds, claimedCii}.
//     - delta = [DX, DY, DZ] of the element (the 3rd-5th numbers of its first ELEMENTS line).
//     - seeds = the #$ COORDS rows (see readCoords below).
//     - units = the #$ UNITS labels/factors, checked to be native mm by ciifr-map's assertMillimetres.
//  3. The vendored, unchanged ciifr-map buildXmlGraph walks the deltas from the seeds and builds the graph.
//     So the node/edge/component shape is identical by construction (T8 checks it against X-F05).
//  4. We then fill in what only a CII has: node names (NODENAME), and a `cii` handle for field comparison.
import { refuse, require, sha256Hex } from '../kit/core.mjs';
import { readCii14, field, rigidOf } from '../kit/cii14.mjs';
import { buildXmlGraph } from '../vendor/prototypes/ciifr-map/xml-graph.js';
import { assertMillimetres } from '../vendor/prototypes/ciifr-map/xml-utils.js';

/** Slots per RESTRANT record and rows per slot (6 restraints x 4 rows = 24 rows, per kit ROWS_PER_RECORD). */
const RESTRAINT_SLOTS = 6, ROWS_PER_SLOT = 4;

/**
 * #$ COORDS, as written by CAESAR II v14 (checked on S1 and T):
 *   row 1: field 0 = number of start points N
 *   rows 2..N+1: field 0 = node number, fields 1-3 = X, Y, Z (mm)
 * Each start point fixes the absolute position of one connected piece of the model.
 * A model without a COORDS section is read in a relative frame starting at 0,0,0 (what CAESAR II does).
 */
export function readCoords(cii) {
  const rows = cii.sections.get('COORDS');
  if (!rows) return [];
  require(rows.length >= 1, 'MAP_COORDS_INVALID', 'COORDS', 'no count row');
  const count = field(rows[0], 0, 'COORDS count').value;
  require(Number.isSafeInteger(count) && count >= 0 && rows.length === count + 1, 'MAP_COORDS_INVALID', 'COORDS',
    'count row says ' + count + ', section has ' + (rows.length - 1) + ' start points');
  return rows.slice(1).map((line, i) => {
    const where = 'COORDS row ' + (i + 2);
    const f = [0, 1, 2, 3].map(k => field(line, k, where));
    require(f.every(x => x.value !== null && Number.isFinite(x.value)), 'MAP_COORDS_INVALID', where, 'not a number');
    require(Number.isSafeInteger(f[0].value) && f[0].value > 0, 'MAP_COORDS_INVALID', where, 'node ' + f[0].token);
    return { node: String(f[0].value), xyz: [f[1].value, f[2].value, f[3].value], witness: where };
  });
}

/** #$ UNITS: 4 factor rows (22 factors) then 24 label rows; same indexes ciifr-map uses for F05. */
export function readUnits(cii) {
  const rows = cii.sections.get('UNITS');
  require(rows && rows.length >= 28, 'MAP_UNITS_NOT_MM', 'UNITS', 'section missing or short');
  const label = i => rows[i].text.trim();
  const factor = n => field(rows[Math.floor((n - 1) / 6)], (n - 1) % 6, 'UNITS factor ' + n).token;
  try {
    return assertMillimetres([label(4), label(6), label(26), label(27)], [1, 21, 22].map(factor));
  } catch (e) {
    refuse('MAP_UNITS_NOT_MM', 'UNITS', 'lengths must be native mm (' + e.message + ')');
  }
}

/** Number of used restraint slots in an element's RESTRANT record (node or type not zero). */
export function restraintCount(cii, el) {
  const p = el.pointers.RESTRANT;
  if (!p) return 0;
  const rows = cii.sections.get('RESTRANT');
  let n = 0;
  for (let s = 0; s < RESTRAINT_SLOTS; s++) {
    const line = rows[(p - 1) * RESTRAINT_SLOTS * ROWS_PER_SLOT + s * ROWS_PER_SLOT];
    const node = field(line, 0, 'RESTRANT ' + p + ' slot ' + (s + 1)).value, type = field(line, 1, 'RESTRANT ' + p).value;
    if (node || type) n++;
  }
  return n;
}

/** The named values compared per element pair (compare.mjs fieldDiffs). */
export function elementValues(cii, el) {
  const nn = el.pointers.NODENAME ? cii.nodeNames[el.pointers.NODENAME - 1] : null;
  const rigid = rigidOf(cii, el.index);
  return {
    diameter: el.fields.DIAMETER.value, wall: el.fields.WALL.value, insulation: el.fields.INSUL.value,
    T1: el.fields.T1.value, P1: el.fields.P1.value,
    rigidWeight: rigid ? rigid.weight.value : null,
    restraintCount: restraintCount(cii, el),
    fromName: nn ? nn.from.token : '', toName: nn ? nn.to.token : '',
  };
}

/** CII -> the profile object buildXmlGraph expects (same keys as ciifr-map xml-profiles.js). */
export function ciiProfile(cii, { elements = cii.elements } = {}) {
  return {
    profile: 'CII v14 (kit/cii14.mjs)',
    elements: elements.map((el, i) => {
      const witness = 'ELEMENTS/' + (el.index + 1);
      return {
        index: i, from: String(el.from), to: String(el.to),
        delta: [el.fields.DX.value, el.fields.DY.value, el.fields.DZ.value],
        od: el.fields.DIAMETER.value, wall: el.fields.WALL.value, witness,
        // Same role as xmlWitness in the XML graph: where the values sit, with byte spans.
        xmlWitness: { section: 'ELEMENTS', recordId: witness, recordIndex: el.index + 1,
          fields: ['FROM', 'TO', 'DX', 'DY', 'DZ', 'DIAMETER', 'WALL'].map(name => ({ name,
            value: name === 'FROM' ? String(el.from) : name === 'TO' ? String(el.to) : el.fields[name].token,
            start: name === 'FROM' || name === 'TO' ? null : el.fields[name].start,
            end: name === 'FROM' || name === 'TO' ? null : el.fields[name].end })) },
        ciiElementIndex: el.index,
      };
    }),
    units: readUnits(cii), seeds: readCoords(cii), claimedCii: { status: 'IS_CII_V14' },
  };
}

// Owner (12 Nov): a loop may miss by up to +-6 mm. Every closure is reported
// (graph.loopClosures and the compare output), so nothing is closed silently.
export const LOOP_TOLERANCE_MM = 6;

/**
 * CII v14 writes 7 significant digits, so a loop of long elements may not close to the 1e-4 mm that
 * ciifr-map's buildXmlGraph demands. Walk each piece first (breadth first, elements in file order).
 * When an element closes a loop, the miss is compared with LOOP_TOLERANCE_MM (Owner: +-6 mm):
 *  - within it, the element's delta is replaced by the difference of the first-reached positions, so
 *    the loop closes exactly (the edge's xmlWitness keeps the file's own tokens);
 *  - beyond it, MAP_LOOP_NOT_CLOSED names the node and the miss.
 * Returns {elements, loops:[{element, node, missMm, toleranceMm}]}; only changed elements are new objects.
 */
export function closeLoops(elements) {
  const adj = new Map();
  const push = (n, x) => { if (!adj.has(n)) adj.set(n, []); adj.get(n).push(x); };
  elements.forEach((e, i) => { if (e.from === e.to) return; push(e.from, { i, to: e.to, sign: 1 }); push(e.to, { i, to: e.from, sign: -1 }); });
  const pos = new Map(), seen = new Set(), fixed = new Map(), loops = [], parents = new Map();
  // The BFS tree gives the unique fundamental cycle for each closing edge.
  function cycle(n, to, i) {
    const ancestors = new Set();
    for (let v = n; v !== undefined; v = parents.get(v)?.node) ancestors.add(v);
    const nodeIds = [], indices = [i];
    let v = to;
    while (!ancestors.has(v)) { nodeIds.push(v); const p = parents.get(v); indices.push(p.i); v = p.node; }
    const common = v;
    for (v = n; v !== common; v = parents.get(v).node) { nodeIds.push(v); indices.push(parents.get(v).i); }
    nodeIds.push(common);
    return { nodeIds, elementIndices: indices.map(j => elements[j].ciiElementIndex ?? j) };
  }
  for (const root of adj.keys()) {
    if (pos.has(root)) continue;
    pos.set(root, [0, 0, 0]);
    for (let q = [root], k = 0; k < q.length; k++) {
      const n = q[k];
      for (const { i, to, sign } of adj.get(n)) {
        if (seen.has(i)) continue;
        seen.add(i);
        const d = elements[i].delta, next = pos.get(n).map((v, j) => v + sign * d[j]);
        if (!pos.has(to)) { pos.set(to, next); parents.set(to, { node: n, i }); q.push(to); continue; }
        const miss = Math.hypot(...next.map((v, j) => v - pos.get(to)[j]));
        const tol = LOOP_TOLERANCE_MM;
        // 1e-9 mm absorbs float noise, so an exact 6.000 mm miss is not refused.
        require(miss <= tol + 1e-9, 'MAP_LOOP_NOT_CLOSED', 'node ' + to + ' (' + elements[i].witness + ')',
          'the loop through this element misses by ' + miss.toFixed(4) + ' mm; allowed ' + tol.toFixed(4) + ' mm');
        if (miss > 0) {
          const [f, t] = sign > 0 ? [n, to] : [to, n];
          fixed.set(i, pos.get(t).map((v, j) => v - pos.get(f)[j]));
          loops.push({ element: elements[i].witness, node: to, missMm: miss, toleranceMm: tol, ...cycle(n, to, i) });
        }
      }
    }
  }
  return { elements: elements.map((e, i) => fixed.has(i) ? { ...e, delta: fixed.get(i) } : e), loops };
}

// Owner (14 Nov): COORDS start points of one connected piece may disagree with the element
// lengths by up to 6 mm by default; the tolerance may be set from 6 to 25 mm.
export const SEED_TOLERANCE_MM = Object.freeze({ min: 6, max: 25, default: 6 });

/**
 * Keep the first COORDS start point of each connected piece; every further start point of the
 * same piece is checked against it after walking the (loop-closed) element deltas. A miss within
 * `toleranceMm` is reported in `drifts` and that start point is dropped (the piece is placed by
 * its first start point); a larger miss refuses with MAP_COORDS_SEED_DRIFT.
 */
export function reconcileSeeds(elements, seeds, toleranceMm = SEED_TOLERANCE_MM.default) {
  require(typeof toleranceMm === 'number' && toleranceMm >= SEED_TOLERANCE_MM.min && toleranceMm <= SEED_TOLERANCE_MM.max,
    'MAP_SEED_TOLERANCE_INVALID', 'seedToleranceMm', String(toleranceMm) + ' (allowed 6 to 25 mm)');
  const adj = new Map();
  const push = (n, x) => { if (!adj.has(n)) adj.set(n, []); adj.get(n).push(x); };
  elements.forEach(e => { if (e.from !== e.to) { push(e.from, { to: e.to, d: e.delta, sign: 1 }); push(e.to, { to: e.from, d: e.delta, sign: -1 }); } });
  const pos = new Map(), piece = new Map();
  for (const root of adj.keys()) {
    if (pos.has(root)) continue;
    pos.set(root, [0, 0, 0]); piece.set(root, root);
    for (let q = [root], k = 0; k < q.length; k++) {
      for (const { to, d, sign } of adj.get(q[k])) {
        if (pos.has(to)) continue;
        pos.set(to, pos.get(q[k]).map((v, j) => v + sign * d[j])); piece.set(to, root); q.push(to);
      }
    }
  }
  const first = new Map(), kept = [], drifts = [];
  for (const seed of seeds) {
    if (!pos.has(seed.node)) { kept.push(seed); continue; }  // buildXmlGraph names this case itself
    const shift = seed.xyz.map((v, j) => v - pos.get(seed.node)[j]), root = piece.get(seed.node);
    if (!first.has(root)) { first.set(root, { seed, shift }); kept.push(seed); continue; }
    // A second row for the same node is not a start-point drift: keep it, so buildXmlGraph refuses a
    // contradictory duplicate (XML_CONTRADICTORY_DUPLICATE_SEED) exactly as before (review B1).
    if (first.get(root).seed.node === seed.node) { kept.push(seed); continue; }
    const missMm = Math.hypot(...shift.map((v, j) => v - first.get(root).shift[j]));
    require(missMm <= toleranceMm + 1e-9, 'MAP_COORDS_SEED_DRIFT', 'COORDS node ' + seed.node,
      'start point misses node ' + first.get(root).seed.node + "'s placement by " + missMm.toFixed(3) + ' mm; allowed ' + toleranceMm + ' mm');
    if (missMm > 1e-4) drifts.push({ node: seed.node, placedBy: first.get(root).seed.node, missMm, toleranceMm });
    else kept.push(seed);  // an agreeing start point stays a witness, as before
  }
  return { seeds: kept, drifts };
}

/**
 * Build the graph from an already-read CII (readCii14 result). `elements` lets a caller (tests)
 * drop elements in memory. Returns the buildXmlGraph shape plus `cii` and `elementValues`.
 */
export function graphFromCii(cii, { member = 'CII', sha256, byteLength, elements = cii.elements, seedToleranceMm } = {}) {
  require(elements.length > 0, 'MAP_EMPTY_INPUT', 'ELEMENTS', 'no elements');
  const raw = ciiProfile(cii, { elements });
  const closed = closeLoops(raw.elements);
  const seeds = reconcileSeeds(closed.elements, raw.seeds, seedToleranceMm);
  const profile = { ...raw, elements: closed.elements, seeds: seeds.seeds };
  let graph;
  try {
    graph = buildXmlGraph(profile, { member, sha256, byteLength });
  } catch (e) {
    refuse('MAP_GRAPH_INVALID', member, e.message);
  }
  graph.byteAuthority = 'CII_BYTES_MEASURED';
  graph.authority = 'CII_GEOMETRY_PREVIEW_ONLY';
  // Node names: NODENAME FROM name belongs to the element's FROM node, TO name to its TO node.
  for (const el of elements) {
    const nn = el.pointers.NODENAME ? cii.nodeNames[el.pointers.NODENAME - 1] : null;
    if (!nn) continue;
    const a = graph.nodeIndex.get(String(el.from)), b = graph.nodeIndex.get(String(el.to));
    if (a && nn.from.token && !a.nodeName) a.nodeName = nn.from.token;
    if (b && nn.to.token && !b.nodeName) b.nodeName = nn.to.token;
  }
  graph.loopClosures = closed.loops;
  graph.seedDrifts = seeds.drifts;
  graph.cii = cii;
  graph.ciiElements = elements;
  return graph;
}

/** readCiiGraph(bytes): CII v14 bytes -> geometry graph (buildXmlGraph shape). */
export async function readCiiGraph(bytes, { member = 'CII', seedToleranceMm } = {}) {
  require(bytes instanceof Uint8Array && bytes.length > 0, 'MAP_EMPTY_INPUT', member);
  const cii = readCii14(bytes);
  const sha256 = await sha256Hex(bytes);
  return graphFromCii(cii, { member, sha256, byteLength: bytes.length, seedToleranceMm });
}
