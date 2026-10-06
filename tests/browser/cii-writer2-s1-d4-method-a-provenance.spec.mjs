import { expect, test } from '@playwright/test';

test('D4 validates retained S1 Method-A provenance recovery at default bounded budget', async ({ page }) => {
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
      const choices = {}; const loops = {};
      for (const member of inspection?.memberInspections || []) {
        const sourceId = String(member?.sourceId || '');
        const choice = ciiAutomaticBaseSelection(member?.inspection?.baseAnchorSuggestions || []);
        choices[sourceId] = choice;
        if (choice.status === 'READY' && (choice.baseLoops || []).length) loops[sourceId] = choice.baseLoops;
      }
      return { choices, loops };
    }
    function reviewBySource(preview) {
      return Object.fromEntries((preview?.memberPreviews || []).map(({ sourceId, preview: member }) => {
        const rows = member?.compareReview?.rows || [];
        return [sourceId, {
          ...(member?.review || {}),
          reviewedCorrespondenceIds: rows
            .filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence))
            .map((row) => row.correspondenceId),
          lockedCorrespondenceIds: rows
            .filter((row) => row.decision === 'LOCKED')
            .map((row) => row.correspondenceId),
          rejectedCorrespondenceIds: [],
        }];
      }));
    }
    function countByPrefix(rows, field, sourceId) {
      const prefix = `${sourceId}:`;
      return (rows || []).filter((row) => (row?.[field] || []).some((key) => String(key).startsWith(prefix))).length;
    }
    function sourceMetrics(sourceId, audit, overlay) {
      const sourceRows = (audit?.rows || []).filter((row) => row.sourceId === sourceId);
      return {
        bound: sourceRows.filter((row) => row.state === 'BOUND').length,
        unresolved: sourceRows.filter((row) => row.state === 'UNRESOLVED').length,
        ambiguous: sourceRows.filter((row) => row.state === 'AMBIGUOUS').length,
        unemitted: sourceRows.filter((row) => row.state === 'UNEMITTED').length,
        qualifiedNodeNameChanges: sourceRows.filter((row) => row.qualifiedNodeNameChange).length,
        knownPositiveCorrespondence: countByPrefix(overlay?.rows, 'sourceRowKeys', sourceId),
        knownPositiveMutation: countByPrefix(overlay?.rows, 'mutationSourceRowKeys', sourceId),
        additionalQualified: (overlay?.additionalQualifiedRows || []).filter((row) => row.sourceId === sourceId).length,
      };
    }
    function choiceSummary(choice) {
      return {
        status: choice?.status || 'UNKNOWN',
        reason: choice?.reason || null,
        sourceNodeId: choice?.sourceNodeId || null,
        targetNodeId: choice?.targetNodeId || null,
        confidence: choice?.confidence || null,
        basisMethod: choice?.basisMethod || null,
        outcomeSignature: choice?.outcomeSignature || null,
        baseLoops: (choice?.baseLoops || []).map((loop) => ({
          method: loop.method,
          baseId: loop.baseId,
          confidence: loop.confidence || null,
          weight: loop.weight || null,
          anchorPairs: (loop.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
        })),
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
    const instrumentationEvents = [];
    const inspectionStarted = performance.now();
    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto,
      methodAPhysicalCandidateLimit: 10,
      baseAnchorDisplayLimit: 5,
      instrumentation: { record: (name, value) => instrumentationEvents.push([name, value]) },
    });
    const inspectionElapsedMs = performance.now() - inspectionStarted;

    const automatic = automaticState(inspection);
    for (const sourceId of ['S1', 'S2', 'S3']) {
      assert(automatic.choices[sourceId]?.status === 'READY',
        `${sourceId} must be READY at default bounded budget 10: ${automatic.choices[sourceId]?.reason}`);
    }

    const previewInput = (reviewBySourceValue = undefined) => ({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });

    const discoveryStarted = performance.now();
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef: crypto });
    const discoveryElapsedMs = performance.now() - discoveryStarted;
    const reviews = reviewBySource(discovery);
    const reviewedStarted = performance.now();
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviews), { cryptoRef: crypto });
    const reviewedElapsedMs = performance.now() - reviewedStarted;

    // Validation oracle joins only after production correspondence + explicit review projection exist.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII',
      expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
      cryptoRef: crypto,
    });
    const audit = buildCiiSourceTargetAudit(reviewed);
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);

    return {
      schema: 'CIIWriter2S1D4MethodAProvenance.v1',
      validationSearchBudget: 10,
      timingsMs: {
        inspection: Number(inspectionElapsedMs.toFixed(1)),
        discoveryPreview: Number(discoveryElapsedMs.toFixed(1)),
        reviewedPreview: Number(reviewedElapsedMs.toFixed(1)),
      },
      automaticChoices: Object.fromEntries(Object.entries(automatic.choices)
        .map(([sourceId, choice]) => [sourceId, choiceSummary(choice)])),
      reviewCounts: Object.fromEntries(Object.entries(reviews).map(([sourceId, review]) => [sourceId, {
        reviewed: (review.reviewedCorrespondenceIds || []).length,
        locked: (review.lockedCorrespondenceIds || []).length,
        rejected: (review.rejectedCorrespondenceIds || []).length,
      }])),
      correspondence: {
        status: reviewed?.correspondence?.status || 'UNKNOWN',
        conflicts: reviewed?.correspondence?.conflicts?.length || 0,
        blockers: reviewed?.correspondence?.blockers || [],
      },
      sourceMetrics: {
        S1: sourceMetrics('S1', audit, overlay),
        S2: sourceMetrics('S2', audit, overlay),
        S3: sourceMetrics('S3', audit, overlay),
      },
      lowerBound: {
        expectedCount: benchmark?.summary?.expectedCount || 0,
        byAction: benchmark?.summary?.byAction || {},
        summary: overlay?.summary || null,
        missingTargets: (overlay?.rows || []).filter((row) => !row.mutationRecovered)
          .map((row) => ({ nodeId: row.nodeId, action: row.action, status: row.status })),
      },
      instrumentationEvents,
    };
  });

  console.log('S1_D4_METHOD_A_PROVENANCE=' + JSON.stringify(diagnostics));

  expect(diagnostics.validationSearchBudget).toBe(10);
  expect(diagnostics.lowerBound.expectedCount).toBe(36);
  expect(diagnostics.automaticChoices.S1.status).toBe('READY');
  expect(diagnostics.automaticChoices.S2.status).toBe('READY');
  expect(diagnostics.automaticChoices.S3.status).toBe('READY');
  expect(diagnostics.automaticChoices.S1.baseLoops.length).toBeGreaterThan(0);
  expect(diagnostics.automaticChoices.S1.baseLoops.every((loop) => loop.method !== 'USER_LOCKED_SEED'
    && loop.method !== 'USER_LOCKED_LEGACY')).toBe(true);
  expect(diagnostics.reviewCounts.S1.locked).toBe(0);
  expect(diagnostics.correspondence.conflicts).toBe(0);
  expect(diagnostics.sourceMetrics.S1.knownPositiveCorrespondence).toBe(12);
  expect(diagnostics.sourceMetrics.S1.knownPositiveMutation).toBeGreaterThanOrEqual(12);
  expect(diagnostics.sourceMetrics.S2.knownPositiveMutation).toBeGreaterThanOrEqual(3);
  expect(diagnostics.sourceMetrics.S3.knownPositiveMutation).toBeGreaterThanOrEqual(2);
  expect(diagnostics.instrumentationEvents.some(([name, value]) =>
    name === 'ANCHOR_PHYSICAL_SEARCH_LIMIT' && Number(value) === 10)).toBe(true);
});
