// p11-cii-map benchmarks: node bench/run.mjs [--root XCU=<path>]
// Each time is the median of 3 runs of the engine call: readCiiGraph(A) + readCiiGraph(B) + compareCii.
import { readFileSync } from 'node:fs';
import { timeMedian, requireSha256 } from '../kit/core.mjs';
import { parseArgs, readBenchmark, writeResult } from '../kit/node.mjs';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';
import { toMapFile } from '../engine/to-map.mjs';
import { readInputXmlGraph } from '../engine/xml-input.mjs';
import { matchXmlCii } from '../engine/xml-match.mjs';

import { readPsi116Graph, matchPsi116Cii } from '../engine/psi116-match.mjs';
import { makePsi116Case } from '../tests/psi116-fixtures.mjs';

const args = parseArgs();
if (args['repo-root']) args.roots.XCU = args['repo-root'];
const rows = [];
const run = async (bench, ia, a, ib, b, limitMs) => {
  const t = await timeMedian(async () => compareCii(await readCiiGraph(a, { member: ia }), await readCiiGraph(b, { member: ib })));
  const s = t.last.summary;
  rows.push({ bench, input: ia + ' vs ' + ib, sha256: { [ia]: await sha(a), [ib]: await sha(b) },
    elementPairs: s.elementPairs, nodePairs: s.nodePairs, unmatchedA: s.unmatchedA, unmatchedB: s.unmatchedB,
    unmatchedNodesA: s.unmatchedNodesA, unmatchedNodesB: s.unmatchedNodesB, fieldDiffs: s.fieldDiffs,
    ms: t.ms, runs: t.runs, limitMs, pass: t.ms < limitMs });
};
const { sha256Hex: sha } = await import('../kit/core.mjs');

const s1 = await readBenchmark('X-S1', args);
const m = JSON.parse(readFileSync(new URL('../tests/fixtures/manifest.json', import.meta.url), 'utf8')).files.find(f => f.file === 'X-S1M.cii');
const s1m = new Uint8Array(readFileSync(new URL('../tests/fixtures/X-S1M.cii', import.meta.url)));
await requireSha256(s1m, m.sha256, 'X-S1M');
await run('B1', 'X-S1', s1.bytes, 'X-S1M', s1m, 300);
const s2 = await readBenchmark('X-S2', args);
await run('B2', 'X-S2', s2.bytes, 'X-S2', s2.bytes, 300);
const t = await readBenchmark('X-T', args), te = await readBenchmark('X-TEXP', args);
await run('B3', 'X-T', t.bytes, 'X-TEXP', te.bytes, 30000);

const ga = await readCiiGraph(t.bytes), gb = await readCiiGraph(te.bytes);
const comparison = compareCii(ga, gb);
const options = {sourceFile: {fileName: 'T.CII', sha256: ga.sha256}, targetFile: {fileName: 'TEXPECTED-PARTIALLLYDONE.CII', sha256: gb.sha256}};
const mt = await timeMedian(() => toMapFile(comparison, options));
rows.push({bench:'P1.3 B1', input:'X-T vs X-TEXP', sha256:{'X-T':ga.sha256,'X-TEXP':gb.sha256},
  elementPairs:comparison.summary.elementPairs,nodePairs:comparison.summary.nodePairs,pairs:mt.last.pairs.length,
  ms:mt.ms,runs:mt.runs,limitMs:1000,pass:mt.ms<1000});
// P1.2 B1: pinned XML/CII reads and matching, timed together (file I/O excluded).
const f05 = await readBenchmark('X-F05', args);
await requireSha256(f05.bytes, '1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995', 'X-F05');
await requireSha256(s1.bytes, '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b', 'X-S1');
await requireSha256(s2.bytes, '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd', 'X-S2');
for (const mode of ['same-run', 'geometry']) {
  const timed = await timeMedian(async () => matchXmlCii(await readInputXmlGraph(f05.bytes, 'X-F05'), await readCiiGraph(s1.bytes, {member:'X-S1'}), {mode}));
  const r = timed.last;
  rows.push({bench:'P1.2 B1 ' + mode, input:'X-F05 vs X-S1', sha256:{'X-F05':r.inputs.xml.sha256,'X-S1':r.inputs.cii.sha256},
    elementPairs:r.elementPairs.length,nodePairs:r.nodePairs.length,unmatchedA:r.unmatchedElementsXml.length,unmatchedB:r.unmatchedElementsCii.length,
    unmatchedNodesA:r.unmatchedNodesXml.length,unmatchedNodesB:r.unmatchedNodesCii.length,ms:timed.ms,runs:timed.runs,limitMs:2000,
    pass:timed.ms<2000 && r.elementPairs.length===56 && r.nodePairs.length===57 && !r.unmatchedElementsXml.length && !r.unmatchedElementsCii.length && !r.unmatchedNodesXml.length && !r.unmatchedNodesCii.length});
}
// P1.2b: invented 41 x 40 XML records; coincident branch endpoints share CII nodes.
const psi = makePsi116Case({branches:41,nodes:40,renumber:1000});
const pt = await timeMedian(async () => matchPsi116Cii(await readPsi116Graph(psi.xml), await readCiiGraph(psi.cii)));
const ps = pt.last.summary;
rows.push({bench:'P1.2b B1',input:'invented PSI116 41 x 40 vs renumbered CII',sha256:{xml:pt.last.inputs.xml.sha256,cii:pt.last.inputs.cii.sha256},
  ...ps,ms:pt.ms,runs:pt.runs,limitMs:2000,pass:pt.ms<2000&&ps.paired===1640&&ps.pairedCii===1600&&ps.unmatchedXml===0&&ps.unmatchedCii===0&&ps.ambiguous===0});
const doc = writeResult(rows);
console.table(doc.rows.map(({ sha256, runs, ...r }) => r));
process.exit(rows.every(r => r.pass !== false) ? 0 : 1);
