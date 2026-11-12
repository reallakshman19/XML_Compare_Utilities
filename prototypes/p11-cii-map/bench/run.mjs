// p11-cii-map benchmarks: node bench/run.mjs [--root XCU=<path>]
// Each time is the median of 3 runs of the engine call: readCiiGraph(A) + readCiiGraph(B) + compareCii.
import { readFileSync } from 'node:fs';
import { timeMedian, requireSha256 } from '../kit/core.mjs';
import { parseArgs, readBenchmark, writeResult } from '../kit/node.mjs';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';

const args = parseArgs();
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

const doc = writeResult(rows);
console.table(doc.rows.map(({ sha256, runs, ...r }) => r));
process.exit(rows.every(r => r.pass !== false) ? 0 : 1);
