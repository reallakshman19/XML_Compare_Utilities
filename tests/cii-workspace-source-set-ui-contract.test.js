import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ciiSourceSetCustodyMarkup } from '../tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js';

const tab = await readFile(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
const wrapper = await readFile(new URL('../tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js', import.meta.url), 'utf8');
const sourceSet = await readFile(new URL('../tabs/cii-workspace/cii-workspace-source-set.js', import.meta.url), 'utf8');

assert(tab.includes("import { mountCiiWriter2MultiSourceShell } from './cii-workspace-multisource-writer2-ui.js';"));
assert(tab.includes("writerVersion === '2'"));
assert(tab.includes('mountCiiWriter2MultiSourceShell'));
assert(tab.includes('mountCiiWorkspaceScopedEngineeringShell'), 'legacy/single-source shell route must remain present');

assert(wrapper.includes('sourceInput.multiple = true'));
assert(wrapper.includes("analyze.disabled = multiSource"));
assert(wrapper.includes("analyzeButton.addEventListener('click', blockMultiSourceAnalyze, true)"));
assert(wrapper.includes("inspectButton.addEventListener('click', inspectMultiSource, true)"));
assert(wrapper.includes('inspectCiiWorkspaceSourceSetWithVersionBridge'));
assert(wrapper.includes('Correspondence remains blocked until WP-002'));

assert(sourceSet.includes('inspectCiiWorkspaceModelsWithVersionBridge'));
assert(sourceSet.includes("MULTISOURCE_CORRESPONDENCE_REQUIRES_WP_002"));
assert(!sourceSet.includes('createCiiWorkspacePreviewWithVersionBridge'));
assert(!sourceSet.includes('applyCiiWorkspaceTargetWriter2WithVersionBridge'));

const markup = ciiSourceSetCustodyMarkup(Object.freeze({
  sourceSet: Object.freeze({
    sourceSetSha256: 'SET_SHA',
    members: Object.freeze([
      Object.freeze({ sourceId: 'S1', fileName: 'S1.CII', originalVersion: 14, normalizedVersion: 11, originalSha256: 'a'.repeat(64), normalizedSha256: 'b'.repeat(64) }),
      Object.freeze({ sourceId: 'S2', fileName: 'S2.CII', originalVersion: 14, normalizedVersion: 11, originalSha256: 'c'.repeat(64), normalizedSha256: 'd'.repeat(64) }),
      Object.freeze({ sourceId: 'S3', fileName: 'S3.CII', originalVersion: 14, normalizedVersion: 11, originalSha256: 'e'.repeat(64), normalizedSha256: 'f'.repeat(64) }),
    ]),
  }),
  versionBridge: Object.freeze({ target: Object.freeze({ originalSha256: 'TARGET_SHA' }) }),
}));
assert(markup.includes('S1.CII'));
assert(markup.includes('S2.CII'));
assert(markup.includes('S3.CII'));
assert(markup.includes('SET_SHA'));
assert(markup.includes('TARGET_SHA'));
assert(markup.includes('WP-002'));

console.log('CII Writer2 multi-source intake UI fail-closed contract: PASS');
