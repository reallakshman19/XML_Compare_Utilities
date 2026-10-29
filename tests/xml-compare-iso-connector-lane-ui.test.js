import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { renderIsoAuditConnectorLane, renderXmlCompareGraphConnectorLaneHtml } from '../xml-compare/XmlCompareGraphConnectorLane.js';
import { _test as view } from '../xml-compare/XmlCompareTabView.js';
import { scopeIsoDisplaySide, renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';
import { createXmlCompareWorkspaceModel } from '../xml-compare/XmlCompareWorkspaceModel.js';
import { clearXmlCompareInputSide, recordsForSide } from '../tabs/xml-compare-tab.js';

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
  const records = [
    { uid: 'S1:one', lineKey: 'PS_MAPPING_S1', displayName: 'S1 Mapping' },
    { uid: 'S2:one', lineKey: 'ISO_NOTES_S2', displayName: 'S2 Note' },
  ];
  const level = { levelId: 'element', records, recordCount: 2 };
  const data = {
    records,
    levelProfile: { levels: [level] },
    levelView: { levelId: 'element', records, hierarchyProfile: { levels: [level] } },
  };
  const source = scopeIsoDisplaySide(data, 'PS_MAPPING_S1');
  const target = scopeIsoDisplaySide(data, 'ISO_NOTES_S2');
  assert.deepEqual(source.records.map(r => r.uid), ['S1:one']);
  assert.deepEqual(target.records.map(r => r.uid), ['S2:one']);
  assert.equal(source.levelView.hierarchyProfile.levels[0].recordCount, 1);
  assert.equal(target.levelProfile.levels[0].recordCount, 1);
  assert.equal(data.records.length, 2, 'source model and transfer data are untouched');
  assert.equal(scopeIsoDisplaySide(data, 'generic'), data);
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
  assert.match(tab, /renderXmlCompareWorkspaceShellHtml\\(\\{ \\.\\.\\.workspace, isoNoteAuditLinks: state\\.isoNoteAuditLinks, isoViewMode:/);
  assert.match(shell, /auditLinks: input\.isoNoteAuditLinks/);
  const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
  assert.match(runtime, /invalidateInputComparison\(state\)/);
  assert.match(runtime, /state\.isoNoteAuditLinks = null/);
}
// Reproduces the Owner-observed S2 "not loaded" display using the actual
// categorized-XML parser/WorkspaceModel, not a hand-constructed side model.
{
  const isoXml = [
    '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">',
    '<IsoPartition key="PS_MAPPING_S1" levelType="partition">',
    '<IsoItem key="m1" levelType="group"><pipe>PIPE-1</pipe><psNo>PS-101.1</psNo></IsoItem>',
    '<IsoItem key="m2" levelType="group"><pipe>PIPE-2</pipe><psNo>PS-102.1</psNo></IsoItem>',
    '</IsoPartition>',
    '<IsoPartition key="ISO_NOTES_S2" levelType="partition">',
    '<IsoItem key="n1" levelType="group"><lineNoInCii>/PIPE-1</lineNoInCii><nodeName>/PS-101.1</nodeName></IsoItem>',
    '<IsoItem key="n2" levelType="group"><lineNoInCii>/PIPE-2</lineNoInCii><nodeName>/PS-102.1</nodeName></IsoItem>',
    '<IsoItem key="n3" levelType="group"><lineNoInCii>/PIPE-3</lineNoInCii><nodeName>/PS-103.1</nodeName></IsoItem>',
    '</IsoPartition></IsoNoteXml>',
  ].join('');
  const canvas = createXmlCompareCanvasState();
  const model = createXmlCompareWorkspaceModel({
    fileA: { name: 'combined-source.xml' }, fileB: { name: 'combined-target.xml' },
    textA: isoXml, textB: isoXml, canvasState: canvas,
  });
  assert.equal(model.source.records.length, 2, 'unprojected default holds two partition containers');
  assert.equal(model.target.records.length, 2, 'Target initially shows partitions, not S2 details');
  const source = scopeIsoDisplaySide(model.source, 'PS_MAPPING_S1');
  const target = scopeIsoDisplaySide(model.target, 'ISO_NOTES_S2');
  assert.equal(source.isoPartition.itemCount, 2);
  assert.equal(target.isoPartition.itemCount, 3);
  assert.equal(source.levelView.levelId, 'element');
  assert.equal(target.levelView.levelId, 'element');
  assert.equal(source.records.length, 2);
  assert.equal(target.records.length, 3);
  assert.ok(target.records.every(r => r.lineKey === 'ISO_NOTES_S2' && r.levelId === 'element'));
  assert.equal(scopeIsoDisplaySide(model.target, 'ISO_NOTES_S2', 'lineBlock').records.length, 1,
    'explicit LineBlock view remains supported');
  assert.equal(model.target.baseRecords.length, 7, 'source model remains complete and unmodified');
  const html = renderXmlCompareWorkspaceShellHtml({ ...model, isoViewMode: true, isoLevelSelections: canvas.levelViews });
  assert.match(html, /S1 PS Mapping: 2 records loaded/);
  assert.match(html, /S2 ISO Notes: 3 records loaded/);
  assert.match(html, /Target · S2 ISO Notes/);
  assert.match(html, /Preview first 3 support records/);
  const state = {
    fileA: { name: 'combined-source.xml' }, fileB: { name: 'combined-target.xml' },
    textA: isoXml, textB: isoXml, canvasState: canvas,
    transferModal: { open: false },
  };
  assert.deepEqual(recordsForSide(state, 'source').map(r => r.uid), source.records.map(r => r.uid));
  assert.deepEqual(recordsForSide(state, 'target').map(r => r.uid), target.records.map(r => r.uid));
  assert.equal(canvas.approvedMatchSet, null, 'display cannot grant approval');
  // If S2 really is missing, show explicit zero, not incorrect S1 fallback.
  const absentS2 = isoXml.replace(/<IsoPartition key="ISO_NOTES_S2"[\\s\\S]*?<\\/IsoPartition>/, '');
  const noS2Model = createXmlCompareWorkspaceModel({
    fileA: { name: 's1-only.xml' }, fileB: { name: 's1-only.xml' },
    textA: absentS2, textB: absentS2, canvasState: canvas,
  });
  const noS2 = scopeIsoDisplaySide(noS2Model.target, 'ISO_NOTES_S2');
  assert.equal(noS2.isoPartition.itemCount, 0);
  assert.equal(noS2.records.length, 0);
  assert.match(renderXmlCompareWorkspaceShellHtml({ ...noS2Model, isoViewMode: true }), /No records in this partition/);
}

console.log('XML Compare ISO connector lane and independent source/target UI tests passed');
