import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const benchmarkDoc = readFileSync('docs/ps-family-clash-audit-benchmark.md', 'utf8');

assert.match(benchmarkDoc, /Parser correctness \| Met/);
assert.match(benchmarkDoc, /PS-11147 audit correctness \| Met/);
assert.match(benchmarkDoc, /POSFamily correctness \| Met/);
assert.match(benchmarkDoc, /POS tolerance boundary \| Met/);
assert.match(benchmarkDoc, /Export availability \| Met/);
assert.match(benchmarkDoc, /Configurable source side \/ source family \/ tolerance \| Met/);
assert.match(benchmarkDoc, /Browser UI smoke \| Planned/);
assert.match(benchmarkDoc, /Medium\/large performance \| Planned/);
assert.match(benchmarkDoc, /Snapshot stability \| Planned/);
assert.match(benchmarkDoc, /complete benchmark program is not yet fully closed/);

console.log('ps-family-clash-audit-benchmark-readiness tests passed');
