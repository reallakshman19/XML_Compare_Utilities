import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PSNM_CORE_TEST } from '../tabs/psnm-utility-tab-v6.js';
import { PSNM_REVIEW_TEST } from '../tabs/psnm-utility-tab-coordinate-review-ui.js';
import { PSNM_createRunLogger, PSNM_buildMatchTable } from '../tabs/psnm-utility/psnm-match-engine.js';
import { PSNM_resolveMasterPsTable } from '../tabs/psnm-utility/psnm-master-resolver.js';
import { PSNM_resolveMasterNodeTable, PSNM_applyMasterNodeTransform } from '../tabs/psnm-utility/psnm-master-node-resolver.js';
import { PSNM_masterPsToMatchRows, PSNM_masterNodeToMatchRows, PSNM_masterMandatoryNodeRows, PSNM_masterPsCoverageRows, PSNM_masterNodeCoverageRows } from '../tabs/psnm-utility/psnm-master-adapter.js';

globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };

function resolveMock(state) {
  const logger = PSNM_createRunLogger();
  const ps = PSNM_resolveMasterPsTable({
    table1Text: state.source.table1Text, table4AText: state.source.table4AText, logger,
  });
  const node = PSNM_resolveMasterNodeTable({
    table2Text: state.source.table2Text,
    table3Text: state.source.table3Text, table4BText: state.source.table4BText, logger,
  });
  state.master.psRows = ps.rows;
  state.master.nodeRows = node.rows;
  state.master.psIssues = ps.issues;
  state.master.nodeIssues = node.issues;
  state.masterReady = true;
  state.sourceDirty = false;
  PSNM_CORE_TEST.ensureAnchors(state);
  return logger;
}

test('shipped two-row PSNM mock resolves from Masters and produces honest exceptions', () => {
  const state = PSNM_CORE_TEST.makeState();
  const logger = resolveMock(state);
  assert.equal(state.master.psRows.length, 2);
  assert.equal(state.master.nodeRows.length, 3);
  assert.equal(state.master.nodeIssues.length, 1);
  assert.equal(state.master.nodeIssues[0].node, '22220');

  PSNM_CORE_TEST.runAutoAnchorSearch(state);
  assert.equal(state.autoAnchor.pairs.length, 4);
  const selected = state.autoAnchor.pairs[0];
  assert.equal(selected.psName, 'PS-12231/DATUM');
  assert.equal(selected.node, '22140');
  PSNM_CORE_TEST.applyAutoAnchorPair(state, 0);
  assert.equal(state.setup.anchorTransform.axisMode, true);

  const anchor = PSNM_CORE_TEST.selectedAnchor(state);
  PSNM_applyMasterNodeTransform(state.master.nodeRows, state.setup.anchorTransform, 0);
  const result = PSNM_buildMatchTable({
    logger, anchor, axisTransform: state.setup.anchorTransform,
    psRows: PSNM_masterPsToMatchRows(state.master.psRows),
    nodeRows: PSNM_masterNodeToMatchRows(state.master.nodeRows),
    mandatoryNodeRows: PSNM_masterMandatoryNodeRows(state.master.nodeRows),
    nodeDiaRows: [], boreMode: 'prefer', coordinateDecimals: 0,
    enableApprox1: true, enableApprox2: true, enableApprox3: true,
    approx1: { xMm: 25, yMm: 25, zMm: 25 },
    approx2: { xMm: 50, yMm: 25, zMm: 50 },
    approx3: { xMm: 50, yMm: 25, zMm: 50 },
  });
  assert.equal(result.candidateRows.length, 1);
  assert.equal(result.rows.filter((row) => row.finalStatus === 'MATCHED').length, 1);
  assert.equal(result.rows.filter((row) => row.finalStatus === 'UNMAPPED').length, 1);
  assert.ok(PSNM_masterPsCoverageRows(state.master.psRows, result.rows).some((row) => row.status === 'UNMAPPED'));
  assert.ok(PSNM_masterNodeCoverageRows(state.master.nodeRows, result.rows).some((row) => row.node === '22220' && row.status === 'MISSING_FROM_TABLE2'));
});

test('native Master Table Auto Anchor detects permuted coordinate axes', () => {
  const state = PSNM_CORE_TEST.makeState();
  state.masterReady = true;
  state.sourceDirty = false;
  const points = [
    { name: 'PS-A', e: 21000, s: 7500, u: 101000, bore: 150 },
    { name: 'PS-B', e: 24500, s: 9900, u: 108000, bore: 100 },
    { name: 'PS-C', e: 32200, s: 12000, u: 112500, bore: 200 },
  ];
  state.master.psRows = points.map((p, i) => ({
    rowId: 'ps-' + i, psName: p.name, psE: p.e, psU: p.u, psS: p.s,
    p1bore: p.bore, positionRaw: 'E ' + p.e + ' S ' + p.s + ' U ' + p.u,
    status: 'OK', enabled: true,
  }));
  state.master.nodeRows = points.map((p, i) => ({
    rowId: 'node-' + i, node: String(100 + i), occurrenceId: 'n#' + i,
    rawX: p.s - 5000, rawY: p.u - 100000, rawZ: p.e - 20000,
    finalNodeBore: p.bore, status: 'OK', enabled: true,
  }));
  PSNM_CORE_TEST.ensureAnchors(state);
  PSNM_CORE_TEST.runAutoAnchorSearch(state);
  const best = state.autoAnchor.pairs[0];
  assert.equal(best.totalMatches, 3);
  assert.deepEqual(best.transform.axes, { e: 'z', u: 'y', s: 'x' });
  assert.deepEqual(best.transform.offsets, { e: 20000, u: 100000, s: 5000 });
  PSNM_CORE_TEST.applyAutoAnchorPair(state, 0);
  assert.equal(state.setup.anchorTransform.axisFormula.includes('E=Z+20000'), true);
});

test('review queue is stable across repeated observer enhancement cycles', () => {
  let writes = 0;
  const body = {
    current: null,
    querySelector: () => body.current,
    insertBefore(el) { body.current = el; writes += 1; },
    get firstChild() { return body.current; },
  };
  const panel = { querySelector: () => body };
  const container = {
    querySelector: (selector) => selector === '[data-psnm-panel="coverage"]' ? panel : null,
    querySelectorAll: () => [],
  };
  const priorDocument = globalThis.document;
  globalThis.document = { createElement: () => ({
    dataset: {},
    innerHTML: '',
    replaceWith(next) { body.current = next; writes += 1; },
  }) };
  try {
    for (let i = 0; i < 5; i++) PSNM_REVIEW_TEST.ensureReviewQueue(container);
    assert.equal(writes, 1, 'unchanged review queue must not mutate DOM repeatedly');
  } finally {
    globalThis.document = priorDocument;
  }
});

test('production PSNM loads one anchor authority, and docs mirrors are synchronized', () => {
  const entry = readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
  const overlays = readFileSync(new URL('../tabs/psnm-utility/psnm-context-actions.js', import.meta.url), 'utf8');
  assert.doesNotMatch(entry, /['"]Axis auto-anchor['"],/);
  assert.doesNotMatch(overlays, /^import '.\/psnm-(?:auto-anchor|auto-datum-groups|axis-auto-anchor-benchmark)\.js/m);
  for (const path of [
    'psnm-utility-tab.js', 'psnm-utility-tab-v6.js',
    'psnm-utility-tab-coordinate-review-ui.js', 'psnm-utility-tab-phase1-ui.js',
    'psnm-utility/psnm-context-actions.js', 'psnm-utility/psnm-anchor-persistence-addon.js',
    'psnm-utility/psnm-match-engine.js',
  ]) {
    const source = readFileSync(new URL('../tabs/' + path, import.meta.url), 'utf8');
    const mirror = readFileSync(new URL('../docs/tabs/' + path, import.meta.url), 'utf8');
    assert.equal(mirror, source, path);
  }
});

test('Candidate Matrix paginates DOM but retains the complete result collection', () => {
  const state = PSNM_CORE_TEST.makeState();
  state.result.candidateRows = Array.from({ length: 250 }, (_, i) => ({
    psName: 'PS-ROW-' + String(i).padStart(3, '0'),
  }));
  const first = PSNM_CORE_TEST.candidateMatrixTable(state);
  assert.match(first, /Candidates 1-100 of 250/);
  assert.match(first, /PS-ROW-099/);
  assert.doesNotMatch(first, /PS-ROW-100/);
  state.ui.candidatePage = 1;
  const middle = PSNM_CORE_TEST.candidateMatrixTable(state);
  assert.match(middle, /Candidates 101-200 of 250/);
  assert.match(middle, /PS-ROW-100/);
  assert.doesNotMatch(middle, /PS-ROW-200/);
  state.ui.candidatePage = 2;
  const last = PSNM_CORE_TEST.candidateMatrixTable(state);
  assert.match(last, /Candidates 201-250 of 250/);
  assert.match(last, /PS-ROW-249/);
  assert.equal(state.result.candidateRows.length, 250);
});
