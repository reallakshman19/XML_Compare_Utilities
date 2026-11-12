// p02-cii-edit-kernel benchmarks: node bench/run.mjs [--root XCU=<path>]
// One row per card benchmark (B1-B3). Times are the median of 3 engine calls only.
import { timeMedian, sha256Hex } from '../kit/core.mjs';
import { parseArgs, readBenchmark, writeResult } from '../kit/node.mjs';
import { readCii14, rigidOf } from '../kit/cii14.mjs';
import { applyChangeset } from '../engine/apply.mjs';

const args = parseArgs();
const rows = [];

async function weightSet(bytes, cii, rigids, newValue) {
  return {
    format: 'topofix.changeset', version: 1, createdAt: '2026-11-12T10:00:00Z',
    base: { kind: 'cii', fileName: 'bench.cii', sha256: await sha256Hex(bytes) },
    changes: rigids.map((rg, i) => {
      const e = cii.elements[rg.element];
      return { changeId: 'B' + (i + 1), target: { kind: 'cii', elementIndex: e.index, fromNode: String(e.from), toNode: String(e.to) },
        field: 'RIGID/WEIGHT', oldToken: rigidOf(cii, e.index).weight.token, newValue: newValue(rg),
        evidence: { source: 'manual', detail: 'bench' }, approval: { approved: true, by: 'bench', at: '2026-11-12T10:00:00Z' } };
    }),
  };
}

// B1: 124 weight changes on X-T; pass under 500 ms.
{
  const { bytes, entry } = await readBenchmark('X-T', args);
  const cii = readCii14(bytes);
  const cs = await weightSet(bytes, cii, cii.rigids, rg => Math.round(rg.weight.value * 1.1 * 1000) / 1000);
  const t = await timeMedian(() => applyChangeset(bytes, cs));
  rows.push({ bench: 'B1', input: entry.id, sha256: entry.sha256, changes: cs.changes.length, applied: t.last.applied.length,
    ok: t.last.ok, ms: t.ms, runs: t.runs, limitMs: 500, pass: t.last.ok && t.ms < 500 });
}
// B2: 1 weight change on X-S2; report.
{
  const { bytes, entry } = await readBenchmark('X-S2', args);
  const cii = readCii14(bytes);
  const cs = await weightSet(bytes, cii, cii.rigids.slice(0, 1), () => 150);
  const t = await timeMedian(() => applyChangeset(bytes, cs));
  rows.push({ bench: 'B2', input: entry.id, sha256: entry.sha256, changes: 1, applied: t.last.applied.length, ok: t.last.ok, ms: t.ms, runs: t.runs, pass: t.last.ok });
}
// B3: readCii14 on X-TEXP; pass under 2 s.
{
  const { bytes, entry } = await readBenchmark('X-TEXP', args);
  const t = await timeMedian(() => readCii14(bytes));
  rows.push({ bench: 'B3', input: entry.id, sha256: entry.sha256, numelt: t.last.counts.NUMELT, ms: t.ms, runs: t.runs, limitMs: 2000, pass: t.ms < 2000 });
}

const doc = writeResult(rows);
console.table(doc.rows.map(({ runs, sha256, ...r }) => r));
process.exit(rows.every(r => r.pass !== false) ? 0 : 1);
