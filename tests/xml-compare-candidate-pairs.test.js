import assert from 'node:assert/strict';

import { createXmlCompareCandidatePairs } from '../xml-compare/XmlCompareCandidatePairModel.js';

// Benchmark geometry: source is an absolute Z-riser (X/Y constant); target is delta-basis (origin 0,0,0).
// Anchor s10 <-> t1010 -> translation offset re-bases the target onto the source frame.
const src = (n, z) => ({ uid: `s${n}`, stableKey: `LINENO1::${n}`, nodeNumber: String(n), displayName: `${n}->x`, position: { x: 23227.580, y: 3257.150, z } });
const tgt = (n, z) => ({ uid: `t${n}`, stableKey: `UNSPECIFIED_LINE::${n}`, nodeNumber: String(n), displayName: `${n}->x`, position: { x: 0, y: 0, z } });

const sourceRecords = [src(10, -19800), src(20, -19908), src(70, -22942.292)];
// t1050 as-saved chosen so aligned (offset z = -19692) lands exactly on s70: -3250.292 + -19692 = -22942.292
const targetRecords = [tgt(1010, -108), tgt(1020, -1100), tgt(1050, -3250.292)];
const anchor = { sourceUid: 's10', targetUid: 't1010' };

const result = createXmlCompareCandidatePairs({ sourceRecords, targetRecords, anchor, toleranceMm: 6 });
const pair = (uid) => result.pairs.find((p) => p.sourceUid === uid);

// Anchor pair: exact, valid.
assert.equal(pair('s10').isAnchor, true);
assert.equal(pair('s10').targetUid, 't1010');
assert.equal(pair('s10').deltaMm, 0);
assert.equal(pair('s10').status, 'valid');

// Coincident node after alignment: valid at ~0 mm.
assert.equal(pair('s70').targetUid, 't1050');
assert.ok(pair('s70').deltaMm < 0.01, `s70 delta ~0, got ${pair('s70').deltaMm}`);
assert.equal(pair('s70').status, 'valid');

// Off-by-one node: nearest is the anchor target ~108 mm away -> review.
assert.equal(pair('s20').targetUid, 't1010');
assert.ok(Math.abs(pair('s20').deltaMm - 108) < 0.01, `s20 delta ~108, got ${pair('s20').deltaMm}`);
assert.equal(pair('s20').status, 'review');

assert.deepEqual(
  { valid: result.summary.validCount, review: result.summary.reviewCount, conflict: result.summary.conflictCount },
  { valid: 2, review: 1, conflict: 0 },
);

// --- Conflict: two source nodes claim the same target -> both flagged conflict. ---
const withConflict = createXmlCompareCandidatePairs({
  sourceRecords: [...sourceRecords, src(71, -22942.0)],
  targetRecords, anchor, toleranceMm: 6,
});
const c70 = withConflict.pairs.find((p) => p.sourceUid === 's70');
const c71 = withConflict.pairs.find((p) => p.sourceUid === 's71');
assert.equal(c70.targetUid, 't1050');
assert.equal(c71.targetUid, 't1050');
assert.equal(c70.status, 'conflict', 'duplicate target claim flags conflict');
assert.equal(c71.status, 'conflict');
assert.equal(withConflict.summary.conflictCount, 2);

// --- No anchor -> no offset -> different origins never align (all review). ---
const noAnchor = createXmlCompareCandidatePairs({ sourceRecords, targetRecords, toleranceMm: 6 });
assert.equal(noAnchor.summary.validCount, 0, 'without an anchor, nothing is valid by coordinate');

// --- PS basis (AIM 2): match by node name (delimiter token), no coordinate anchor needed. ---
const nSrc = [
  { uid: 'ns1', stableKey: 'L::1', nodeNumber: '1', nodeName: 'PS.A100.10' },
  { uid: 'ns2', stableKey: 'L::2', nodeNumber: '2', nodeName: 'PS.A100.20' },
  { uid: 'ns3', stableKey: 'L::3', nodeNumber: '3', nodeName: 'PS.A100.99' },
];
const nTgt = [
  { uid: 'nt1', stableKey: 'T::1', nodeNumber: '5001', nodeName: 'PS.A100.10' },
  { uid: 'nt2', stableKey: 'T::2', nodeNumber: '5002', nodeName: 'PS.A100.20' },
];
// whole-name match
const byName = createXmlCompareCandidatePairs({ sourceRecords: nSrc, targetRecords: nTgt, basis: 'name', nameField: 'nodeName' });
const np = (uid) => byName.pairs.find((p) => p.sourceUid === uid);
assert.equal(np('ns1').targetUid, 'nt1', 'name match pairs by identical node name');
assert.equal(np('ns1').status, 'valid');
assert.equal(np('ns3').status, 'no-target', 'unmatched name -> no-target');
assert.equal(byName.basis, 'name');
// delimiter-token match: last token after "." (position 3)
const byToken = createXmlCompareCandidatePairs({ sourceRecords: nSrc, targetRecords: nTgt, basis: 'name', nameField: 'nodeName', nameDelimiter: '.', namePosition: 3 });
assert.equal(byToken.pairs.find((p) => p.sourceUid === 'ns2').targetUid, 'nt2', 'token position 3 ("20") matches');

console.log('XML Compare candidate pair tests passed');
