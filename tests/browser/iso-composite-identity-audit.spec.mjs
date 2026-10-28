import { expect, test } from '@playwright/test';

test('ISO audit: DATUM identity, exact approval gate, and traceable Tab 3 output', async ({ page }) => {
  await page.goto('/tests/browser/xml-builder-viewport-fixture.html');
  const result = await page.evaluate(async () => {
    const [{ createIsoNoteRevCompareAudit }, { renderIsoNoteRevCompareDashboardHtml },
      { guardCompositeApprovalAction }, { ISO_NOTE_COMPOSITE_ID_POLICY },
      { createCategorizedInputXmlCanvasModel },
      { serializeIsoNoteEngineeringFindingsCsv }] = await Promise.all([
        import('/xml-compare/rev-compare/rev-compare-iso-note-mode.js'),
        import('/xml-compare/rev-compare/rev-compare-iso-note-ui.js'),
        import('/xml-compare/XmlCompareCompositeApprovalGate.js'),
        import('/xml-compare/XmlCompareIsoNoteIdentityAdapter.js'),
        import('/xml-compare/XmlCompareCategorizedInputXmlCanvasBuilder.js'),
        import('/xml-compare/XmlCompareIsoNoteEngineeringFindings.js'),
      ]);
    const xml = '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">' +
      '<IsoPartition key="PS_MAPPING_S1">' +
      '<IsoItem sourceRefs="S1:1"><pipe>PIPE-1/B4</pipe><psNo>PS-006.5</psNo><dtxr>PIPE REST XRT01</dtxr></IsoItem>' +
      '<IsoItem sourceRefs="S1:2"><pipe>PIPE-2</pipe><psNo>PS-001</psNo></IsoItem></IsoPartition>' +
      '<IsoPartition key="ISO_NOTES_S2">' +
      '<IsoItem sourceRefs="S2:1"><lineNoInCii>/PIPE-1/B4</lineNoInCii><nodeName>/PS-006.5</nodeName>' +
      '<rawNote>/PS-006.5/DATUM :ISONOTE REST(2kN) [25mm GAP]</rawNote></IsoItem>' +
      '<IsoItem sourceRefs="S2:2"><lineNoInCii>/PIPE-3</lineNoInCii><nodeName>/PS-001</nodeName>' +
      '<rawNote>/PS-001 :ISONOTE REST(2kN)</rawNote></IsoItem>' +
      '<IsoItem sourceRefs="S2:3"><lineNoInCii>/PIPE-2</lineNoInCii><nodeName>/PS-001</nodeName>' +
      '<rawNote>/PS-002 :ISONOTE REST(2kN)</rawNote></IsoItem></IsoPartition></IsoNoteXml>';
    const audit = createIsoNoteRevCompareAudit({ sourceXml: xml, targetXml: xml });
    const records = createCategorizedInputXmlCanvasModel({ xmlText: xml }).records;
    const s1 = records.find(r => r.lineKey === 'PS_MAPPING_S1' && r.psNo === 'PS-006.5');
    const s2 = records.find(r => r.lineKey === 'ISO_NOTES_S2' && r.nodeName === '/PS-006.5');
    const wrong = records.find(r => r.lineKey === 'ISO_NOTES_S2' && r.nodeName === '/PS-001');
    const pairs = [{ sourceUid: s1.uid, targetUid: s2.uid }, { sourceUid: s1.uid, targetUid: wrong.uid }];
    const actions = ['accept-candidate', 'bulk-approve-candidate-pairs', 'approve-pending-connector']
      .map(type => guardCompositeApprovalAction({
        scoped: true, action: type === 'bulk-approve-candidate-pairs' ?
          { type, candidates: pairs } : { type, candidate: pairs[1] },
        pendingPreview: pairs[1], sourceRecords: records, targetRecords: records,
        policy: ISO_NOTE_COMPOSITE_ID_POLICY,
      }));
    const csv = serializeIsoNoteEngineeringFindingsCsv(audit.report);
    document.body.innerHTML = '<main id="audit">' + renderIsoNoteRevCompareDashboardHtml(audit) + '</main>';
    return {
      ok: audit.ok, identities: audit.summary.identityMatches,
      reviews: audit.summary.identityReviews, missingS1Gap: audit.summary.gapReviews,
      csvHasRefs: csv.includes('S1:1') && csv.includes('S2:1'),
      csvHasConflict: csv.includes('NODE_NAME_NOTE_MISMATCH'),
      rejects: actions.map(a => a.blocked),
    };
  });
  expect(result.ok).toBe(true);
  expect(result.identities).toBe(1);
  expect(result.reviews).toBe(1);
  expect(result.missingS1Gap).toBe(1);
  expect(result.csvHasRefs).toBe(true);
  expect(result.csvHasConflict).toBe(true);
  expect(result.rejects).toEqual([true, true, true]);
  await expect(page.locator('[data-xmlc-rev-compare-mode="iso-note-engineering"]')).toHaveCount(1);
  await expect(page.getByText('Engineering delta grid', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Finding-level evidence and provenance', { exact: false }).first()).toBeVisible();
});
