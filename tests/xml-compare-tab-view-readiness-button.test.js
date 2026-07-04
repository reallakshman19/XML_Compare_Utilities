import assert from 'node:assert/strict';

import { renderXmlCompareTabView } from '../xml-compare/XmlCompareTabView.js';

const state = {
  fileA: null,
  fileB: null,
  textA: '',
  textB: '',
  report: null,
  filters: { severity: 'ALL', search: '' },
  selectedIssueId: '',
  hiddenComponentIds: new Set(),
  status: { kind: 'info', message: 'Ready.' },
  sideload: {},
  enrichmentConfig: {},
};
const side = { records: [], levelView: { fields: [] }, diagnostics: [], logs: [] };
const workspace = {
  source: side,
  target: side,
  navStates: {},
  manualConnectors: [],
  matchMap: null,
  connectorCandidates: null,
  compareFields: [],
  logs: [],
  diagnostics: [],
};

const html = renderXmlCompareTabView({ state, workspace, issues: [] });
const readinessMatches = html.match(/data-xml-compare-action="download-input-readiness-json"/g) || [];
const gateMatches = html.match(/data-xml-compare-action="download-readiness-gate-json"/g) || [];
assert.equal(readinessMatches.length, 1);
assert.equal(gateMatches.length, 1);
assert.equal(html.includes('Download Input Readiness JSON'), true);
assert.equal(html.includes('Download Readiness Gate JSON'), true);
assert.equal(html.includes('data-xml-compare-action="compare"'), true);
assert.equal(html.includes('data-xml-compare-action="export-filtered-csv"'), true);

console.log('XML compare tab view readiness button tests passed');
