import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const url = new URL('./fixtures/cii-phase2/owner-phase2-original.txt', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json', import.meta.url), 'utf8'));
const bytes = await readFile(url);
const originalText = bytes.toString('utf8');
const rows = originalText.split(/\r?\n/).map((raw, index) => ({
  originalLine: index + 1, raw, match: raw.trim().match(/^(PS\S+)\s+(SL\S+)$/),
})).filter(item => item.match);
const bySource = new Map();
for (const row of rows) {
  const key = row.match[1];
  bySource.set(key, (bySource.get(key) || 0) + 1);
}
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.originalUploadSha256, 'Owner fixture bytes must match original upload; never silently normalize');
assert.equal(originalText.split(/\r?\n/).length, manifest.originalLineCount);
assert.equal(rows.length, manifest.lexicalRowCount);
assert.equal(new Set(rows.map(r => r.match[1])).size, manifest.uniqueSourceLabels);
assert.equal(new Set(rows.map(r => r.match[2])).size, manifest.uniqueTargetLabels);
assert.equal(bySource.get('PS02687.1'), 78);
assert.equal(bySource.get('PS02694.1'), 2);
for (const label of manifest.verbatimAnomalies) assert(rows.some(r => r.match[2] === label), 'Do not repair owner punctuation: ' + label);
assert.equal(manifest.benchmarkMinimumValidatedRecall, 0.70);
assert.equal(Math.ceil(rows.length * manifest.benchmarkMinimumValidatedRecall), manifest.minimumValidatedRowsForOriginalDenominator);
assert.equal(manifest.sourceMemberResolution, 'PENDING_INDEPENDENT_PHYSICAL_REVIEW');
console.log('PASS CII Phase 2 owner original: 428 rows/436 lines, immutable SHA, multiplicity, 300 required; physical proof is NOT claimed');
