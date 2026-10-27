import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  publishPsMappingState,
  readPsMappingResult,
  releasePsMappingState,
} from '../tabs/ps-mapping-utility-tab-result-cache.js';

function read(path) {
  return readFileSync(new URL('../tabs/' + path, import.meta.url), 'utf8');
}

test('100-row page size is enforced by the actual base table renderer', () => {
  const source = read('ps-mapping-utility-tab.js');
  const start = source.indexOf('function table(rows = [], columns = [], state = null) {');
  const end = source.indexOf('function summary(state)', start);
  assert.ok(start >= 0 && end > start);
  const factory = new Function(
    'visibleColumns', 'groupedHeader', 'h', 'groupClass', 'displayList', 'TABLE_PAGE_SIZE',
    source.slice(start, end) + '\nreturn table;',
  );
  const table = factory((cols) => cols, () => '', String, () => '', (v) => String(v ?? ''), 100);
  const rows = Array.from({ length: 5902 }, (_, i) => ({ id: 'PS-' + i }));
  const columns = [{ key: 'id', group: 'Source', label: 'Model Support No' }];
  const state = { activeTab: 'candidates', setup: {}, pageByTab: {} };
  const first = table(rows, columns, state);
  assert.equal((first.match(/<tr>/g) || []).length, 100);
  assert.match(first, /Showing 1–100 of 5,902/);
  assert.doesNotMatch(first, /PS-5901/);

  state.pageByTab.candidates = 59;
  const last = table(rows, columns, state);
  assert.equal((last.match(/<tr>/g) || []).length, 2);
  assert.match(last, /Showing 5901–5902 of 5,902/);
});

test('modal builds only the active tab; Candidate view is not rebuilt on other tabs', () => {
  const source = read('ps-mapping-utility-tab.js');
  assert.match(source, /state\.activeTab === id \? render\(\) : ''/);
  for (const name of ['source', 'setup', 'config', 'ct1', 'ct2', 'validator', 'coverage', 'candidates', 'user', 'debug']) {
    assert.ok(source.includes("activePanel('" + name + "'"), name);
  }
});

test('Candidate Matrix uses cached result and pages, filters, and exports full CSV', () => {
  const candidate = read('ps-mapping-utility-tab-candidate-copy-ui.js');
  assert.match(candidate, /return readPsMappingResult\(\);/);
  assert.match(candidate, /filtered\.slice\(start, start \+ CANDIDATE_PAGE_SIZE\)/);
  assert.match(candidate, /data-psmap-candidate-search/);
  assert.match(candidate, /data-psmap-candidate-filter/);
  assert.match(candidate, /Export all candidates \(CSV\)/);
  assert.match(candidate, /const rows = currentRows\(\);/);
  assert.match(candidate, /URL\.createObjectURL\(blob\)/);
  assert.match(candidate, /anchor\.download/);
  assert.doesNotMatch(candidate, /return runPsMappingResolver\(/);
  const cacheState = { result: { candidates: [{ supportNoModel: 'PS-1' }] } };
  publishPsMappingState(cacheState);
  assert.equal(readPsMappingResult(), cacheState.result);
  releasePsMappingState(cacheState);
  assert.equal(readPsMappingResult(), null);
});

test('preflight and node actions do not trigger repeated full mapping runs', () => {
  const preflight = read('ps-mapping-utility-tab-preflight-ui.js');
  const tally = read('ps-mapping-utility-tab-tally-ui.js');
  const copy = read('ps-mapping-utility-tab-support-number-ui.js');
  assert.doesNotMatch(preflight, /new MutationObserver/);
  assert.match(preflight, /setTimeout\(runIfVisible, 220\)/);
  assert.match(tally, /const result = readPsMappingResult\(\)/);
  assert.match(copy, /const result = readPsMappingResult\(\)/);
  assert.doesNotMatch(copy, /const result = runPsMappingResolver\(/);
});

test('all performance changes are mirrored in GitHub Pages', () => {
  for (const name of [
    'ps-mapping-utility-tab.js',
    'ps-mapping-utility-tab-candidate-copy-ui.js',
    'ps-mapping-utility-tab-candidate-detail-ui.js',
    'ps-mapping-utility-tab-preflight-ui.js',
    'ps-mapping-utility-tab-support-number-ui.js',
    'ps-mapping-utility-tab-tally-ui.js',
    'ps-mapping-utility-tab-result-cache.js',
  ]) {
    const app = readFileSync(new URL('../tabs/' + name, import.meta.url), 'utf8');
    const docs = readFileSync(new URL('../docs/tabs/' + name, import.meta.url), 'utf8');
    assert.equal(docs, app, name);
  }
});
