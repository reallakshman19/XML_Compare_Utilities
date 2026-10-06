import { expect, test } from '@playwright/test';

test('diagnose retained S1 THREE manual-seed unresolved frontier', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [sourceSet, baseSelection, multiPreview, censusModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
    ]);
    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = censusModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`RETAINED_BENCHMARK_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function automaticLoops(inspection) {
      const loops = {};
      for (const member of inspection.memberInspections || []) {
        const choice = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
        if (choice.status === 'READY') loops[member.sourceId] = choice.baseLoops;
      }
      return loops;
    }
    function compactNodeRow(row) {
      return {
        correspondenceId: row?.correspondenceId || null,
        status: row?.status || null,
        sourceNodeId: row?.sourceNodeId || row?.source || null,
        targetNodeId: row?.targetNodeId || row?.target || null,
        targetNodeIds: row?.targetNodeIds || null,
        candidateStatus: row?.candidateStatus || null,
        confidence: row?.confidence || null,
        authority: row?.authority || null,
        reasons: row?.reasons || [],
        identityReasons: row?.identityReasons || [],
      };
    }
    function compactElementRow(row) {
      return {
        correspondenceId: row?.correspondenceId || null,
        status: row?.status || null,
        sourceElementId: row?.sourceElementId || null,
        targetElementId: row?.targetElementId || null,
        targetElementIds: row?.targetElementIds || null,
        reasons: row?.reasons || [],
      };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: `S${index + 1}`,
      fileName,
      bytes: sourceBytes[index],
    }));

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes, targetFileName: 'T.CII',
    }, { cryptoRef: crypto });
    const baseLoopsBySource = automaticLoops(inspection);
    if (!baseLoopsBySource.S2?.length || !baseLoopsBySource.S3?.length) {
      throw new Error('S2_S3_AUTOMATIC_BASE_REQUIRED_FOR_FRONTIER_DIAGNOSTIC');
    }
    delete baseLoopsBySource.S1;

    const anchors = [
      { sourceNodeId: '3910', targetNodeId: '875' },
      { sourceNodeId: '3940', targetNodeId: '880' },
      { sourceNodeId: '3870', targetNodeId: '870' },
    ];
    const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource,
      anchorPairsBySource: { S1: anchors },
    }, { cryptoRef: crypto });

    const audit = buildCiiSourceTargetAudit(preview);
    const s1Summary = audit.summary.bySource.find((row) => row.sourceId === 'S1');
    const nonBoundRows = audit.rows
      .filter((row) => row.sourceId === 'S1' && row.state !== 'BOUND')
      .map((row) => ({
        sourceNodeId: row.sourceNodeId,
        sourceNodeName: row.sourceNodeName,
        state: row.state,
        targetNodeIds: row.targetNodeIds,
        targetNodeNames: row.targetNodeNames,
        emitted: row.emitted,
        confidence: row.confidence,
        correspondenceIds: row.correspondenceIds,
        workflowStatuses: row.workflowStatuses,
        authorities: row.authorities,
        evidenceBases: row.evidenceBases,
        reviewDecisions: row.reviewDecisions,
        reasons: row.reasons,
      }));

    const member = preview.memberPreviews.find((item) => item.sourceId === 'S1')?.preview;
    const multi = member?.multiBaseCorrespondence || {};
    const loopDiagnostics = (multi.loopResults || []).map((item) => ({
      loopId: item?.loop?.loopId || null,
      anchors: item?.loop?.anchorPairs || [],
      correspondenceStatus: item?.correspondence?.status || null,
      blockers: item?.correspondence?.blockers || [],
      propagation: item?.correspondence?.propagation || null,
      unresolvedNodeRows: (item?.correspondence?.nodeRows || [])
        .filter((row) => row?.status === 'UNRESOLVED')
        .map(compactNodeRow),
      unresolvedElementRows: (item?.correspondence?.elementRows || [])
        .filter((row) => row?.status === 'UNRESOLVED')
        .map(compactElementRow),
    }));

    return {
      anchors,
      s1Summary,
      memberStatus: member?.correspondence?.status || 'UNKNOWN',
      memberBlockers: member?.correspondence?.blockers || [],
      combination: multi.combination || null,
      seedCoverage: multi.seedCoverage || null,
      crossSeedConflicts: multi.conflicts || [],
      nonBoundRows,
      loopDiagnostics,
    };
  });

  console.log('SLICE5_FRONTIER_JSON ' + JSON.stringify(diagnostics));
  expect(diagnostics.s1Summary).toBeTruthy();
  expect(diagnostics.nonBoundRows.length).toBeGreaterThan(0);
  expect(diagnostics.crossSeedConflicts).toHaveLength(0);
});
