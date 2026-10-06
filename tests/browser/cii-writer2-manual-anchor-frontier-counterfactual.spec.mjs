import { expect, test } from '@playwright/test';

test('counterfactual boundary seeds test retained S1 topology closure without granting authority', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [sourceSet, baseSelection, multiPreview, censusModule, benchmarkModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
    ]);
    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = censusModule;
    const { deriveCiiNodeNameBenchmarkDeltaFromCii, buildCiiSourceTargetBenchmarkOverlay } = benchmarkModule;

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
    function metrics(preview, benchmark, elapsedMs, scenario) {
      const audit = buildCiiSourceTargetAudit(preview);
      const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
      const s1Rows = audit.rows.filter((row) => row.sourceId === 'S1');
      const member = preview.memberPreviews.find((item) => item.sourceId === 'S1')?.preview;
      const s1Key = (value) => String(value || '').startsWith('S1:');
      return {
        scenario: scenario.name,
        anchorCount: scenario.anchors.length,
        elapsedMs: Number(elapsedMs.toFixed(1)),
        memberStatus: member?.correspondence?.status || 'UNKNOWN',
        memberBlockers: member?.correspondence?.blockers || [],
        seedCoverage: member?.multiBaseCorrespondence?.seedCoverage || null,
        crossSeedConflicts: member?.multiBaseCorrespondence?.conflicts?.length || 0,
        boundNodeCount: s1Rows.filter((row) => row.state === 'BOUND').length,
        unresolvedNodeCount: s1Rows.filter((row) => row.state === 'UNRESOLVED').length,
        ambiguousNodeCount: s1Rows.filter((row) => row.state === 'AMBIGUOUS').length,
        unemittedNodeCount: s1Rows.filter((row) => row.state === 'UNEMITTED').length,
        qualifiedNodeNameChangeCount: s1Rows.filter((row) => row.qualifiedNodeNameChange).length,
        knownPositiveCorrespondenceRecoveredByS1: overlay.rows.filter((row) => (row.sourceRowKeys || []).some(s1Key)).length,
        knownPositiveMutationRecoveredByS1: overlay.rows.filter((row) => (row.mutationSourceRowKeys || []).some(s1Key)).length,
        additionalQualifiedByS1: overlay.additionalQualifiedRows.filter((row) => row.sourceId === 'S1').length,
      };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const [targetBytes, expectedBytes] = await Promise.all([
      fetchBytes('/Benchmark/T.CII'),
      fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII'),
    ]);
    const sources = sourceNames.map((fileName, index) => ({ sourceId: `S${index + 1}`, fileName, bytes: sourceBytes[index] }));
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII', expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII', cryptoRef: crypto,
    });

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes, targetFileName: 'T.CII',
    }, { cryptoRef: crypto });
    const baseLoopsBySource = automaticLoops(inspection);
    if (!baseLoopsBySource.S2?.length || !baseLoopsBySource.S3?.length) {
      throw new Error('S2_S3_AUTOMATIC_BASE_REQUIRED_FOR_COUNTERFACTUAL');
    }
    delete baseLoopsBySource.S1;

    const baseThree = [
      { sourceNodeId: '3910', targetNodeId: '875' },
      { sourceNodeId: '3940', targetNodeId: '880' },
      { sourceNodeId: '3870', targetNodeId: '870' },
    ];
    const left = { sourceNodeId: '3830', targetNodeId: '860' };
    const right = { sourceNodeId: '5200', targetNodeId: '1120' };
    const scenarios = [
      { name: 'THREE', anchors: baseThree },
      { name: 'FOUR_LEFT', anchors: [...baseThree, left] },
      { name: 'FOUR_RIGHT', anchors: [...baseThree, right] },
      { name: 'FIVE', anchors: [...baseThree, left, right] },
    ];

    const results = [];
    for (const scenario of scenarios) {
      const started = performance.now();
      const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        sources,
        targetBytes,
        targetFileName: 'T.CII',
        baseLoopsBySource,
        anchorPairsBySource: { S1: scenario.anchors },
      }, { cryptoRef: crypto });
      results.push(metrics(preview, benchmark, performance.now() - started, scenario));
    }

    return {
      benchmarkExpectedCount: benchmark.summary.expectedCount,
      authorityNote: '3830↔860 and 5200↔1120 are validation-only counterfactual seeds, not approved USER_LOCKED authority',
      results,
    };
  });

  console.log('SLICE5_COUNTERFACTUAL_JSON ' + JSON.stringify(diagnostics));
  expect(diagnostics.results).toHaveLength(4);
  expect(diagnostics.benchmarkExpectedCount).toBeGreaterThan(0);
});
