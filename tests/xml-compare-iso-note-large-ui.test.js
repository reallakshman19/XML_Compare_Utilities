import assert from 'node:assert/strict';
import test from 'node:test';
import { renderIsoNoteMappingCompareHtml, serializeIsoNoteMappingCsv } from '../xml-compare/XmlCompareIsoNoteDirectCompare.js';
import { _test as view } from '../xml-compare/XmlCompareTabView.js';

function row(index, status = 'S1_ONLY') {
  const support = 'PS-' + String(index);
  return {
    pipe: 'LINE-A', psNo: support, nodeName: status === 'MATCH' ? support : '',
    status, reason: status, supportGap: '', isoNote: '', dtxr: '',
    s1Ref: 'S1:' + index, s2Ref: 'S2:' + index,
    gap: { status: 'REVIEW', reason: 'missing source gap', s1RestMm: '', s2RestMm: '', s1GuideMm: '', s2GuideMm: '', s1LineStopMm: '', s2LineStopMm: '', s1Evidence: {}, s2Evidence: {} },
    coverage: { status: 'REVIEW', reason: 'not certified', required: '', provided: '', missing: '', extra: '', sourceEvidence: {}, targetEvidence: {} },
    action: { code: 'REVIEW', action: 'Check original geometry' },
    matchRule: 'PIPE_PLUS_FULL_ID', sourceUid: 'a:' + index, targetUid: 'b:' + index,
  };
}

test('ISO large report renders at most 120 rows; exact matches/reviews survive and full CSV remains intact', () => {
  const rows = Array.from({ length: 3600 }, (_, i) => row(i));
  for (let i = 3500; i < 3507; i++) rows[i] = row(i, 'MATCH');
  for (let i = 3507; i < 3550; i++) rows[i] = row(i, 'REVIEW');
  const report = {
    ok: true, rows, countS1: 2778, countS2: 819,
    message: 'Synthetic audit review',
    summary: {
      match: 7, s1Only: 2743, s2Only: 797, review: 43,
      gapMatch: 0, gapMismatch: 0, gapReview: 7, gapNotSpecified: 0,
      coverageCovered: 0, coverageMissing: 0, coverageExtra: 0, coverageReview: 7,
    },
  };
  const html = renderIsoNoteMappingCompareHtml(report, 7);
  assert.match(html, /Showing 120 of 3600 comparison rows/);
  assert.equal((html.match(/<tr>/g) || []).length, 121); // One heading and bounded body.
  assert.match(html, /PS-3500/);
  assert.match(html, /PS-3549/);
  assert.doesNotMatch(html, /PS-3599/);
  assert.match(html, /Download comparison CSV for every row/);
  const csv = serializeIsoNoteMappingCsv(report);
  assert.match(csv, /PS-3599/);
  assert.equal(csv.trim().split('\r\n').length, 3601);
});

test('large XML is retained in state but clearly identified as a bounded, read-only preview', () => {
  const source = '<IsoNoteXml>' + 'A'.repeat(410000);
  const target = '<IsoNoteXml>' + 'B'.repeat(410000);
  const preview = view.xmlInputPreview(source);
  assert.equal(preview.large, true);
  assert.equal(preview.text.length, 2048);
  assert.equal(preview.chars, source.length);
  const html = view.importSection({
    fileA: { name: 'table_to_categorized_source.xml' },
    fileB: { name: 'table_to_categorized_target.xml' },
    textA: source, textB: target, config: {},
  });
  assert.match(html, /Full XML loaded/);
  assert.match(html, /read-only preview/);
  assert.match(html, /readonly aria-label="Source XML preview; full XML loaded"/);
  assert.match(html, /readonly aria-label="Target XML preview; full XML loaded"/);
  assert.match(html, /&lt;IsoNoteXml&gt;/);
  assert.ok(html.length < 20000, 'full 820k XML must not be inserted into the DOM');
  assert.equal(view.xmlInputPreview('<Small />').large, false);
  assert.doesNotMatch(view.importSection({ textA: '<Small />', textB: '', config: {} }), /readonly aria-label=/);
});

test('exact connector evidence is automatically visible but never becomes transfer approval', () => {
  const links = {
    readOnly: true, linkedCount: 1,
    links: [{ pipeline: 'LINE-A', supportId: 'PS-124.1',
      s1Ref: 'S1:11', s2Ref: 'S2:22', disposition: 'IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED' }],
  };
  const html = view.renderIsoAuditConnectorEvidence({ ok: true }, links);
  assert.match(html, /ISO automatically identified connections/);
  assert.match(html, /PS-124.1/);
  assert.match(html, /S1:11/);
  assert.match(html, /S2:22/);
  assert.match(html, /NOT approved transfer connectors/);
  assert.doesNotMatch(html, /approve-pending-connector|approvedMatchSet|data-xml-compare-candidate-action/);
  assert.equal(view.renderIsoAuditConnectorEvidence(null, links), '');
  assert.equal(view.renderIsoAuditConnectorEvidence({ ok: true }, { ...links, readOnly: false }), '');
});
