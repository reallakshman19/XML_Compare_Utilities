import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const tab = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-find-replace-ui.js', import.meta.url), 'utf8');

test('existing CII installer exposes exactly one v14 Find & Replace tile', () => {
  assert.equal((tab.match(/data-ciiw-open-find-replace/g) || []).length, 1);
  assert.match(tab, /↔ CII Find & Replace — V14/);
  assert.match(tab, /mountCiiFindReplaceShell/);
  assert.match(tab, /cii-workspace-find-replace\.css/);
});

test('Find & Replace UI exposes target, CSV, manual table, preview and disabled file Apply', () => {
  for (const selector of [
    'data-ciifr-target',
    'data-ciifr-csv',
    'data-ciifr-add-row',
    'data-ciifr-preview-body',
    'data-ciifr-validate',
    'data-ciifr-export-audit',
  ]) assert.match(panel, new RegExp(selector));
  assert.match(panel, /data-ciifr-apply disabled/);
  assert.match(ui, /root\.querySelector\('\[data-ciifr-apply\]'\)\.disabled = true/);
});

test('NODE NAME is enabled while FORCE stays visible and qualification-pending', () => {
  assert.match(panel, /<option value="NODENAME">NODE NAME<\/option>/);
  assert.match(panel, /<option value="DISPLACEMENT">DISPLACEMENT<\/option>/);
  assert.match(panel, /<option value="FORCE" disabled>FORCE — qualification pending<\/option>/);
});

test('UI controller does not import writer or file-mutation modules', () => {
  assert.doesNotMatch(ui, /target-writer|writer1|writer2|writeFile|FileSystem/);
});
