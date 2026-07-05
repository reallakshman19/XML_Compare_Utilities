import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const benchmarkDoc = readFileSync('docs/ps-family-clash-audit-benchmark.md', 'utf8');

assert.match(benchmarkDoc, /Parser correctness \| Met/);
assert.match(benchmarkDoc, /PS-11147 audit correctness \| Met/);
assert.match(benchmarkDoc, /POSFamily correctness \| Met/);
assert.match(benchmarkDoc, /POS tolerance boundary \| Met/);
assert.match(benchmarkDoc, /Export availability \| Met/);
assert.match(benchmarkDoc, /Configurable source side \/ source family \/ tolerance \| Met/);
assert.match(benchmarkDoc, /Browser UI smoke \| Met/);
assert.match(benchmarkDoc, /Snapshot stability \| Met/);
assert.match(benchmarkDoc, /Medium\/large performance \| Met/);
assert.match(benchmarkDoc, /Accessibility \/ keyboard navigation \| Met/);
assert.match(benchmarkDoc, /no open planned gate/);

console.log('ps-family-clash-audit-benchmark-readiness tests passed');
