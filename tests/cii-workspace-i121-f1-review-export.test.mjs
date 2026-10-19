import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ciiWriter2ReviewArtifactExportReady } from '../docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js';

// The oracle is the Owner-authorized fail-closed F1 export contract:
// artifacts describe the presently reconciled review, never pending changes.
const committed = Object.freeze({ artifacts: { correspondenceCsv: 'committed CSV', auditJson: '{}' } });
const cases = [
  { name: 'no computed review yet', preview: null, dirty: false, disposed: false, allowed: false },
  { name: 'committed review available', preview: committed, dirty: false, disposed: false, allowed: true },
  { name: 'pending review changes', preview: committed, dirty: true, disposed: false, allowed: false },
  { name: 'unmounted shell', preview: committed, dirty: false, disposed: true, allowed: false },
  { name: 'unmounted and dirty', preview: committed, dirty: true, disposed: true, allowed: false },
];
for (const scenario of cases) {
  test('F1 export admission: ' + scenario.name, () => {
    assert.equal(ciiWriter2ReviewArtifactExportReady(scenario.preview, scenario.dirty, scenario.disposed),
      scenario.allowed);
  });
}

const ui = readFileSync(fileURLToPath(new URL(
  '../docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js', import.meta.url)), 'utf8');
const block = (begin, end) => {
  const i = ui.indexOf(begin), j = ui.indexOf(end, i + begin.length);
  assert.ok(i >= 0 && j > i, 'missing actual Writer2 UI function ' + begin);
  return ui.slice(i, j);
};

test('F1 actual renderer refuses both downloads while review is dirty', () => {
  const s = block('const renderMultiReview = () => {', 'const markReviewDirty = (message) => {');
  assert.match(s, /csvButton\.disabled\s*=\s*!reviewArtifactsReady\(\)/);
  assert.match(s, /jsonButton\.disabled\s*=\s*!reviewArtifactsReady\(\)/);
});

test('F1 real dirty-review path invokes renderer without resetting pending decision state', () => {
  const s = block('const markReviewDirty = (message) => {', 'const resetMulti = () => {');
  assert.match(s, /reviewDirty\s*=\s*true/);
  assert.match(s, /renderMultiReview\(\)/);
  assert.doesNotMatch(s, /reviewDirty\s*=\s*false/);
});

test('F1 CSV and JSON event handlers require current committed review before export', () => {
  for (const [start, end, filename] of [
    ['const onCsvExport = (event) => {', 'const onJsonExport = (event) => {', 'cii-multisource-correspondence.csv'],
    ['const onJsonExport = (event) => {', 'const blockLegacyAnalyze = (event) => {', 'cii-multisource-audit.json'],
  ]) {
    const s = block(start, end);
    assert.match(s, /event\.stopImmediatePropagation\(\)/);
    assert.match(s, /if \(!reviewArtifactsReady\(\)\) return/);
    assert.ok(s.indexOf('if (!reviewArtifactsReady()) return') < s.indexOf('downloadPayload('));
    assert.ok(s.includes(filename));
  }
});

test('F1 container capture guard blocks stale synthetic clicks before older legacy listeners', () => {
  const gate = block('const onReviewArtifactExportGate = (event) => {', 'const onCsvExport = (event) => {');
  assert.match(gate, /\[data-ciiw-export-csv\]/);
  assert.match(gate, /\[data-ciiw-export-json\]/);
  assert.match(gate, /if \(reviewArtifactsReady\(\)\) return/);
  assert.match(gate, /event\.preventDefault\(\)/);
  assert.match(gate, /event\.stopImmediatePropagation\(\)/);
  assert.match(ui, /container\.addEventListener\('click', onReviewArtifactExportGate, true\)/);
  assert.match(ui, /container\.removeEventListener\('click', onReviewArtifactExportGate, true\)/);
});

test('F1 physical BOUND/Apply remains downstream of unchanged review/target guards', () => {
  const apply = block('const applyScoped = async () => {', 'function bindTransferActions()');
  assert.match(apply, /!scopedPreview\?\.writerReadiness\?\.ready/);
  assert.match(apply, /cachedTargetBytes !== sourceTargetBytes/);
  assert.match(apply, /downloadApplied\(container\.ownerDocument, applied\)/);
});
