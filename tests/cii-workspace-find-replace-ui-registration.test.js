import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const tab = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace-ui.js', import.meta.url), 'utf8');
const panelAndUi = `${panel}\n${ui}`;

test('existing CII installer exposes exactly one v14 Find & Replace tile', () => {
  assert.equal((tab.match(/data-ciiw-open-find-replace/g) || []).length, 1);
  assert.match(tab, /↔ CII Find & Replace — V14/);
  assert.match(tab, /mountCiiFindReplaceShell/);
  assert.match(tab, /cii-workspace-find-replace\.css/);
});

test('Find & Replace UI exposes editable spreadsheet then Preview and Apply-to-new-copy', () => {
  for (const selector of [
    'data-ciifr-target',
    'data-ciifr-csv',
    'data-ciifr-manual-grid',
    'data-ciifr-manual-body',
    'data-ciifr-add-row',
    'data-ciifr-clear-grid',
    'data-ciifr-sync-grid',
    'data-ciifr-preview-body',
    'data-ciifr-validate',
    'data-ciifr-apply',
    'data-ciifr-download',
    'data-ciifr-export-audit',
  ]) assert.match(panel, new RegExp(selector));
  assert.match(panel, /Excel-style grid/);
  assert.match(panel, /paste a rectangular range copied from Microsoft Excel/);
  assert.match(ui, /parseSpreadsheetPaste/);
  assert.match(ui, /replaceFindReplaceManualRows/);
  assert.match(ui, /refs\.manualGrid, 'paste', onGridPaste/);
  assert.match(panel, /Apply to New Copy/);
  assert.doesNotMatch(panel, /Direct Apply to File/);
  assert.match(ui, /refs\.apply\.disabled = !summary\.canApplyToNewCopy/);
  assert.match(ui, /refs\.download\.disabled = !summary\.canDownload/);
  assert.match(ui, /applyFindReplaceToNewCopy/);
});

test('NODE NAME is enabled while FORCE stays visible and qualification-pending', () => {
  assert.match(panelAndUi, /NODENAME/);
  assert.match(panelAndUi, /NODE NAME/);
  assert.match(panelAndUi, /DISPLACEMENT/);
  assert.match(panelAndUi, /FORCE — qualification pending/);
  assert.match(panelAndUi, /disabled/);
});

test('UI controller does not import writer or file-mutation modules', () => {
  assert.doesNotMatch(ui, /target-writer|writer1|writer2|writeFile|FileSystem/);
});
