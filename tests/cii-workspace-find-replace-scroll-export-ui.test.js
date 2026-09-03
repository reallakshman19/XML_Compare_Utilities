import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const panel = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace.css', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace-ui.js', import.meta.url), 'utf8');
const output = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace-output.js', import.meta.url), 'utf8');

test('editable Preview reserves a dedicated vertical scrollbar for large batches', () => {
  const wrap = css.match(/\.ciifr-sheet-wrap\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(wrap, /max-height:\s*390px/);
  assert.match(wrap, /overflow-x:\s*auto/);
  assert.match(wrap, /overflow-y:\s*scroll/);
  assert.match(wrap, /scrollbar-gutter:\s*stable/);
  assert.match(panel, /dedicated vertical scrollbar/);
});

test('UI exposes replaced CII export only after Validate and Apply-to-new-copy custody', () => {
  const validate = panel.indexOf('data-ciifr-validate');
  const apply = panel.indexOf('data-ciifr-apply');
  const exportCii = panel.indexOf('data-ciifr-download');
  assert.ok(validate >= 0 && validate < apply && apply < exportCii);
  assert.match(panel, /Export Replaced CII/);
  assert.match(panel, /applied, independently revalidated TARGET1/);
  assert.match(ui, /refs\.download\.disabled = !summary\.canDownload/);
  assert.match(ui, /buildFindReplaceDownloadArtifact\(session\)/);
  assert.match(ui, /result\.status !== 'READY_FOR_DOWNLOAD'/);
  assert.match(ui, /session\.release\?\.status !== 'APPLIED_TO_NEW_COPY'/);
  assert.match(ui, /downloadText/);
});

test('export backend emits a new CII artifact without writer or overwrite authority', () => {
  assert.match(output, /\.find-replace\.cii/);
  assert.match(output, /originalFileOverwritten:\s*false/);
  assert.match(output, /writerInvoked:\s*false/);
  assert.match(output, /APPLY_TO_NEW_COPY_REQUIRED/);
  assert.match(output, /READY_FOR_DOWNLOAD/);
  assert.match(output, /APPLIED_TARGET1_HASH_MISMATCH/);
});
