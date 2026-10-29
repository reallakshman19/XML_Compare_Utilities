import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { renderIsoAuditConnectorLane, renderXmlCompareGraphConnectorLaneHtml } from '../xml-compare/XmlCompareGraphConnectorLane.js';
import { _test as view } from '../xml-compare/XmlCompareTabView.js';
import { clearXmlCompareInputSide } from '../tabs/xml-compare-tab.js';

const isoRoot = '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1"><IsoPartition key="PS_MAPPING_S1"/><IsoPartition key="ISO_NOTES_S2"/></IsoNoteXml>';
const links = Object.freeze(Array.from({ length: 7 }, (_, index) => {
  const supportId = 'PS-' + String(123 + index) + '.1';
  return Object.freeze({
    linkId: 'audit:src' + index + '=>dst' + index,
    sourceUid: 'src' + index, targetUid: 'dst' + index,
    supportId, pipeline: 'PIPE-42',
    s1Ref: 'S1:' + (index + 1), s2Ref: 'S2:' + (index + 101),
    disposition: 'IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED',
  });
}));
const auditLinks = Object.freeze({ readOnly: true, linkedCount: 7, links });

{
  const html = renderIsoAuditConnectorLane(auditLinks);
  assert.match(html, /7 verified identity connections/);
  assert.match(html, /read-only ISO identity connections/i);
  assert.equal((html.match(/data-xml-compare-iso-connector(?= )/g) || []).length, 7);
  assert.match(html, /PS-123\.1/);
  assert.match(html, /S1:1/);
  assert.match(html, /S2:101/);
  assert.match(html, /svg viewBox="0 0 44 20"/);
  assert.doesNotMatch(html, /Approve Link|data-xml-compare-candidate-action|approvedMatchSet/);
  assert.equal(renderIsoAuditConnectorLane({ readOnly: false, links }), '');
  assert.equal(renderIsoAuditConnectorLane(null), '');
  assert.match(renderXmlCompareGraphConnectorLaneHtml({ manualState: {}, auditLinks }), /Total approved<\/b><span>0<\/span>/);
  assert.equal((renderXmlCompareGraphConnectorLaneHtml({ manualState: {}, auditLinks }).match(/data-xml-compare-iso-connector(?= )/g) || []).length, 7);
  assert.equal((renderXmlCompareGraphConnectorLaneHtml({ manualState: {} }).match(/data-xml-compare-iso-connector(?= )/g) || []).length, 0);
}
{
  const wrong = { ...auditLinks, links: [...links, { sourceUid: 'unknown', targetUid: 'T', supportId: 'PS-99', pipeline: 'PIPE-42', disposition: 'TRANSFER_APPROVED' }] };
  assert.equal((renderIsoAuditConnectorLane(wrong).match(/data-xml-compare-iso-connector(?= )/g) || []).length, 7);
}
{
  const state = { fileA: { name: 'combined.xml' }, fileB: { name: 'combined.xml' }, textA: isoRoot, textB: isoRoot, config: {} };
  const importHtml = view.importSection(state);
  assert.match(importHtml, /1\. Load your XML inputs/);
  assert.match(importHtml, /Same combined ISO XML in both slots/);
  assert.match(importHtml, /PS Mapping · S1/);
  assert.match(importHtml, /ISO Notes · S2/);
  assert.match(importHtml, /data-xml-compare-load="a"/);
  assert.match(importHtml, /data-xml-compare-load="b"/);
  assert.match(importHtml, /data-xml-compare-action="clear-input-a"/);
  assert.match(importHtml, /data-xml-compare-action="clear-input-b"/);
  assert.match(importHtml, /Advanced comparison settings/);
  assert.match(importHtml, /Compare PS Mapping ↔ ISO Notes/);
  assert.match(importHtml, /xml-compare-toolbar/);
  const duplicateGeneric = view.inputPairNotice({ textA: '<A/>', textB: '<A/>' });
  assert.match(duplicateGeneric, /identical content/);
  assert.equal(view.inputPairNotice({ textA: '<A/>', textB: '<B/>' }), '');
}
{
  const state = {
    fileA: { name: 'source.xml' }, fileB: { name: 'target.xml' },
    textA: '<src/>', textB: '<dst/>',
    workspaceRevision: 3, report: { ok: true },
    isoNoteComparison: { ok: true }, isoNoteAuditLinks: auditLinks, isoNoteLinkedCount: 7,
    canvasState: createXmlCompareCanvasState({}),
    transferModal: { open: true, lastOutputReceipt: { id: 'stale' } },
  };
  clearXmlCompareInputSide(state, 'a');
  assert.equal(state.textA, '');
  assert.equal(state.fileA, null);
  assert.equal(state.textB, '<dst/>');
  assert.equal(state.isoNoteAuditLinks, null);
  assert.equal(state.isoNoteLinkedCount, 0);
  assert.equal(state.isoNoteComparison, null);
  assert.equal(state.report, null);
  assert.equal(state.canvasState.approvedMatchSet, null);
  assert.equal(state.transferModal.open, false);
  assert.equal(state.transferModal.lastOutputReceipt, null);
  clearXmlCompareInputSide(state, 'b');
  assert.equal(state.textB, '');
  assert.equal(state.fileB, null);
  assert.equal(state.workspaceRevision, 5);
}
{
  const tab = fs.readFileSync(new URL('../xml-compare/XmlCompareTabView.js', import.meta.url), 'utf8');
  const shell = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceShell.js', import.meta.url), 'utf8');
  assert.match(tab, /renderXmlCompareWorkspaceShellHtml\(\{ \.\.\.workspace, isoNoteAuditLinks: state\.isoNoteAuditLinks \}\)/);
  assert.match(shell, /auditLinks: input\.isoNoteAuditLinks/);
  const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
  assert.match(runtime, /invalidateInputComparison\(state\)/);
  assert.match(runtime, /state\.isoNoteAuditLinks = null/);
}
console.log('XML Compare ISO connector lane and independent source/target UI tests passed');
