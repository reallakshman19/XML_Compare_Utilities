import { expect, test } from '@playwright/test';

test('C2 compares reviewed retained S1 AUTO_11 against MANUAL_THREE downstream recovery', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      multiPreview,
      censusModule,
      benchmarkModule,
      canonicalModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = censusModule;
    const {
      deriveCiiNodeNameBenchmarkDeltaFromCii,
      buildCiiSourceTargetBenchmarkOverlay,
    } = benchmarkModule;
    const { ciiCanonicalWriter2MutationSelection } = canonicalModule;

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
    function candidateOperations(plan) {
      const byId = new Map();
      for (const operation of [...(plan?.operations || []), ...(plan?.excludedOperations || [])]) {
        const id = String(operation?.operationId || '').trim();
        if (id && !byId.has(id)) byId.set(id, operation);
      }
      return byId;
    }
    function targetId(operation) {
      return String(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId || '').trim();
    }
    function transferKey(action, nodeId) {
      return `${String(action || '').trim()}|${String(nodeId || '').trim()}`;
    }
    function canonicalTransfer(preview, benchmark) {
      const candidates = candidateOperations(preview?.transferPlan);
      const canonical = ciiCanonicalWriter2MutationSelection([...candidates.values()]);
      const operations = (canonical?.appliedOperationIds || []).map((id) => candidates.get(id)).filter(Boolean);
      const actualKeys = operations
        .map((operation) => transferKey(operation.action, targetId(operation)))
        .filter((key) => !key.endsWith('|'))
        .sort();
      const expectedKeys = (benchmark?.rows || [])
        .map((row) => transferKey(row.writerAction, row.nodeId))
        .sort();
      const actual = new Set(actualKeys);
      const expected = new Set(expectedKeys);
      return {
        appliedOperationCount: operations.length,
        actualKeys,
        missingRequiredKeys: expectedKeys.filter((key) => !actual.has(key)),
        additionalKeys: actualKeys.filter((key) => !expected.has(key)),
        conflicts: canonical?.conflicts || [],
        duplicateOperationIds: canonical?.duplicateOperationIds || [],
      };
    }
    function detailForExpectedS1Rows(audit, overlay) {
      const byKey = new Map((audit?.rows || []).map((row) => [String(row.rowKey || ''), row]));
      return (overlay?.rows || []).flatMap((expected) => {
        const keys = (expected.sourceRowKeys || []).filter((key) => String(key).startsWith('S1:'));
        if (!keys.length) return [];
        return keys.map((key) => {
          const row = byKey.get(String(key));
          return {
            benchmarkTargetNodeId: expected.nodeId,
            benchmarkAction: expected.action,
            benchmarkStatus: expected.status,
            rowKey: key,
            sourceNodeId: row?.sourceNodeId || null,
            sourceNodeName: row?.sourceNodeName || '',
            targetNodeId: row?.targetNodeId || null,
            targetNodeName: row?.targetNodeName || '',
            state: row?.state || '',
            confidence: row?.confidence || '',
            identityBound: row?.identityBound === true,
            nodeNameDifferent: row?.nodeNameDifferent,
            qualifiedNodeNameChange: row?.qualifiedNodeNameChange === true,
            evidenceBases: row?.evidenceBases || [],
            reviewDecisions: row?.reviewDecisions || [],
            writerActions: row?.writerActions || [],
            writerStatuses: row?.writerStatuses || [],
            correspondenceIds: row?.correspondenceIds || [],
          };
        });
      });
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
        expectedS1RowDetails: detailForExpectedS1Rows(audit, overlay),
        canonicalTransfer: canonicalTransfer(preview, benchmark),
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

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto,
      methodAPhysicalCandidateLimit: 11,
      baseAnchorDisplayLimit: 5,
    });

    const automatic = automaticState(inspection);
    for (const sourceId of ['S1', 'S2', 'S3']) {
      assert(automatic.choices[sourceId]?.status === 'READY',
        `${sourceId} must be READY at validation-only budget 11: ${automatic.choices[sourceId]?.reason}`);
    }

    async function reviewedScenario(input, name) {
      const discoveryStarted = performance.now();
      const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(input, { cryptoRef: crypto });
      const discoveryElapsedMs = performance.now() - discoveryStarted;
      const reviews = reviewBySource(discovery);
      const reviewedStarted = performance.now();
      const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        ...input,
        reviewBySource: reviews,
      }, { cryptoRef: crypto });
      const reviewedElapsedMs = performance.now() - reviewedStarted;
      return {
        discovery: metrics(discovery, benchmark, `${name}_DISCOVERY`, discoveryElapsedMs),
        reviewed: metrics(reviewed, benchmark, `${name}_REVIEWED`, reviewedElapsedMs),
        reviewCounts: Object.fromEntries(Object.entries(reviews).map(([sourceId, review]) => [sourceId, {
          reviewed: (review.reviewedCorrespondenceIds || []).length,
          locked: (review.lockedCorrespondenceIds || []).length,
          rejected: (review.rejectedCorrespondenceIds || []).length,
        }])),
      };
    }

    const auto = await reviewedScenario({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
    }, 'AUTO_11');

    const manualAnchors = [
      { sourceNodeId: '3910', targetNodeId: '875' },
      { sourceNodeId: '3940', targetNodeId: '880' },
      { sourceNodeId: '3870', targetNodeId: '870' },
    ];
    const manual = await reviewedScenario({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: {
        S2: automatic.loops.S2,
        S3: automatic.loops.S3,
      },
      anchorPairsBySource: { S1: manualAnchors },
    }, 'MANUAL_THREE');

    assert(manual.reviewed.authorityMode === 'INDEPENDENT_MANUAL_SEEDS',
      'MANUAL_THREE must use independent manual-seed authority');
    assert(manual.reviewed.conflicts === 0, 'MANUAL_THREE diagnostic must remain conflict-free');

    return {
      schema: 'CIIWriter2S1C2ReviewedPropagationRca.v2',
      validationSearchBudget: 11,
      benchmarkExpectedCount: benchmark.summary.expectedCount,
      benchmarkByAction: benchmark.summary.byAction,
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
      scenarios: { auto, manual },
      reviewedComparison: {
        boundNodeDeltaManualMinusAuto:
          manual.reviewed.boundNodeCount - auto.reviewed.boundNodeCount,
        unemittedNodeDeltaManualMinusAuto:
          manual.reviewed.unemittedNodeCount - auto.reviewed.unemittedNodeCount,
        s1KnownPositiveCorrespondenceDeltaManualMinusAuto:
          manual.reviewed.s1KnownPositiveCorrespondenceCount - auto.reviewed.s1KnownPositiveCorrespondenceCount,
        s1KnownPositiveMutationDeltaManualMinusAuto:
          manual.reviewed.s1KnownPositiveMutationCount - auto.reviewed.s1KnownPositiveMutationCount,
        aggregateMutationRecoveryDeltaManualMinusAuto:
          (manual.reviewed.aggregateLowerBound?.mutationRecoveredCount || 0)
          - (auto.reviewed.aggregateLowerBound?.mutationRecoveredCount || 0),
      },
    };
  });

  console.log('S1_C2_REVIEWED_RCA=' + JSON.stringify(diagnostics));
  expect(diagnostics.benchmarkExpectedCount).toBe(36);
  expect(diagnostics.automaticChoices.S1.status).toBe('READY');
  expect(diagnostics.scenarios.manual.reviewed.authorityMode).toBe('INDEPENDENT_MANUAL_SEEDS');
});
