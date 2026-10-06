import { expect, test } from '@playwright/test';

test('C2 compares retained S1 AUTO_11 against MANUAL_THREE downstream recovery', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      multiPreview,
      censusModule,
      benchmarkModule,
    ] = await Promise.all([
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
    const {
      deriveCiiNodeNameBenchmarkDeltaFromCii,
      buildCiiSourceTargetBenchmarkOverlay,
    } = benchmarkModule;

    function assert(condition, message) {
      if (!condition) throw new Error(message);
    }
    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`RETAINED_BENCHMARK_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function automaticState(inspection) {
      const choices = {};
      const loops = {};
      for (const member of inspection?.memberInspections || []) {
        const sourceId = String(member?.sourceId || '');
        const choice = ciiAutomaticBaseSelection(member?.inspection?.baseAnchorSuggestions || []);
        choices[sourceId] = choice;
        if (choice.status === 'READY' && (choice.baseLoops || []).length) loops[sourceId] = choice.baseLoops;
      }
      return { choices, loops };
    }
    function metrics(preview, benchmark, name, elapsedMs) {
      const audit = buildCiiSourceTargetAudit(preview);
      const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
      const s1Rows = (audit?.rows || []).filter((row) => row.sourceId === 'S1');
      const member = (preview?.memberPreviews || []).find((item) => item.sourceId === 'S1')?.preview;
      const s1Key = (value) => String(value || '').startsWith('S1:');
      const s1ExpectedCorrespondence = (overlay?.rows || []).filter((row) =>
        (row.sourceRowKeys || []).some(s1Key));
      const s1ExpectedMutation = (overlay?.rows || []).filter((row) =>
        (row.mutationSourceRowKeys || []).some(s1Key));
      return {
        name,
        elapsedMs: Number(elapsedMs.toFixed(1)),
        correspondenceStatus: member?.correspondence?.status || 'UNKNOWN',
        authorityMode: member?.multiBaseAuthority?.inputMode || 'UNKNOWN',
        combination: member?.multiBaseCorrespondence?.combination || 'UNKNOWN',
        seedCoverage: member?.multiBaseCorrespondence?.seedCoverage || null,
        seedDiagnostics: member?.multiBaseCorrespondence?.seedDiagnostics || [],
        blockers: member?.correspondence?.blockers || [],
        conflicts: member?.multiBaseCorrespondence?.conflicts?.length || 0,
        emittedNodeRows: member?.correspondence?.nodeRows?.length || 0,
        boundNodeCount: s1Rows.filter((row) => row.state === 'BOUND').length,
        unresolvedNodeCount: s1Rows.filter((row) => row.state === 'UNRESOLVED').length,
        ambiguousNodeCount: s1Rows.filter((row) => row.state === 'AMBIGUOUS').length,
        unemittedNodeCount: s1Rows.filter((row) => row.state === 'UNEMITTED').length,
        qualifiedNodeNameChangeCount: s1Rows.filter((row) => row.qualifiedNodeNameChange).length,
        s1KnownPositiveCorrespondenceCount: s1ExpectedCorrespondence.length,
        s1KnownPositiveMutationCount: s1ExpectedMutation.length,
        s1KnownPositiveCorrespondenceTargets: s1ExpectedCorrespondence.map((row) => row.nodeId),
        s1KnownPositiveMutationTargets: s1ExpectedMutation.map((row) => row.nodeId),
        additionalQualifiedByS1: (overlay?.additionalQualifiedRows || [])
          .filter((row) => row.sourceId === 'S1').length,
        aggregateLowerBound: overlay?.summary || null,
        aggregateMissingTargets: (overlay?.rows || [])
          .filter((row) => !row.mutationRecovered)
          .map((row) => ({ nodeId: row.nodeId, action: row.action, status: row.status })),
      };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const [targetBytes, expectedBytes] = await Promise.all([
      fetchBytes('/Benchmark/T.CII'),
      fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII'),
    ]);
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: `S${index + 1}`,
      fileName,
      bytes: sourceBytes[index],
    }));
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII',
      expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
      cryptoRef: crypto,
    });

    const inspectStarted = performance.now();
    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto,
      methodAPhysicalCandidateLimit: 11,
      baseAnchorDisplayLimit: 5,
    });
    const inspectElapsedMs = performance.now() - inspectStarted;

    const automatic = automaticState(inspection);
    for (const sourceId of ['S1', 'S2', 'S3']) {
      assert(automatic.choices[sourceId]?.status === 'READY',
        `${sourceId} must be READY at validation-only budget 11: ${automatic.choices[sourceId]?.reason}`);
      assert((automatic.loops[sourceId] || []).length > 0, `${sourceId} must expose a qualified loop`);
    }

    const autoStarted = performance.now();
    const autoPreview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
    }, { cryptoRef: crypto });
    const autoMetrics = metrics(autoPreview, benchmark, 'AUTO_11', performance.now() - autoStarted);

    const manualLoops = {
      S2: automatic.loops.S2,
      S3: automatic.loops.S3,
    };
    const manualAnchors = [
      { sourceNodeId: '3910', targetNodeId: '875' },
      { sourceNodeId: '3940', targetNodeId: '880' },
      { sourceNodeId: '3870', targetNodeId: '870' },
    ];
    const manualStarted = performance.now();
    const manualPreview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: manualLoops,
      anchorPairsBySource: { S1: manualAnchors },
    }, { cryptoRef: crypto });
    const manualMetrics = metrics(manualPreview, benchmark, 'MANUAL_THREE', performance.now() - manualStarted);

    assert(manualMetrics.authorityMode === 'INDEPENDENT_MANUAL_SEEDS',
      'MANUAL_THREE must use independent manual-seed authority');
    assert(manualMetrics.conflicts === 0, 'MANUAL_THREE diagnostic must remain conflict-free');

    return {
      schema: 'CIIWriter2S1C2PropagationRca.v1',
      validationSearchBudget: 11,
      benchmarkExpectedCount: benchmark.summary.expectedCount,
      benchmarkByAction: benchmark.summary.byAction,
      inspectElapsedMs: Number(inspectElapsedMs.toFixed(1)),
      automaticChoices: Object.fromEntries(Object.entries(automatic.choices).map(([sourceId, choice]) => [sourceId, {
        status: choice.status,
        reason: choice.reason,
        sourceNodeId: choice.sourceNodeId || null,
        targetNodeId: choice.targetNodeId || null,
        confidence: choice.confidence || null,
        basisMethod: choice.basisMethod || null,
        outcomeSignature: choice.outcomeSignature || null,
        baseLoops: (choice.baseLoops || []).map((loop) => ({
          method: loop.method,
          baseId: loop.baseId,
          anchorPairs: (loop.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
        })),
      }])),
      scenarios: [autoMetrics, manualMetrics],
      comparison: {
        boundNodeDeltaManualMinusAuto: manualMetrics.boundNodeCount - autoMetrics.boundNodeCount,
        unresolvedNodeDeltaManualMinusAuto: manualMetrics.unresolvedNodeCount - autoMetrics.unresolvedNodeCount,
        unemittedNodeDeltaManualMinusAuto: manualMetrics.unemittedNodeCount - autoMetrics.unemittedNodeCount,
        qualifiedChangeDeltaManualMinusAuto:
          manualMetrics.qualifiedNodeNameChangeCount - autoMetrics.qualifiedNodeNameChangeCount,
        s1KnownPositiveCorrespondenceDeltaManualMinusAuto:
          manualMetrics.s1KnownPositiveCorrespondenceCount - autoMetrics.s1KnownPositiveCorrespondenceCount,
        s1KnownPositiveMutationDeltaManualMinusAuto:
          manualMetrics.s1KnownPositiveMutationCount - autoMetrics.s1KnownPositiveMutationCount,
      },
    };
  });

  console.log('S1_C2_RCA=' + JSON.stringify(diagnostics));
  expect(diagnostics.benchmarkExpectedCount).toBe(36);
  expect(diagnostics.scenarios).toHaveLength(2);
  expect(diagnostics.automaticChoices.S1.status).toBe('READY');
});

