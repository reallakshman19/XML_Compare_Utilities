import { expect, test } from '@playwright/test';

test('Phase A retained S1 semantic trace', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const trace = await page.evaluate(async () => {
    const [
      sourceSetModule,
      baseSelectionModule,
      multiPreviewModule,
      censusModule,
      benchmarkModule,
      physicalCandidatesModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSetModule;
    const { ciiAutomaticBaseSelection } = baseSelectionModule;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreviewModule;
    const { buildCiiSourceTargetAudit } = censusModule;
    const {
      deriveCiiNodeNameBenchmarkDeltaFromCii,
      buildCiiSourceTargetBenchmarkOverlay,
    } = benchmarkModule;
    const {
      uniqueIncidentComponentLengthPairs,
      selectPhysicalCandidatePairs,
    } = physicalCandidatesModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('RETAINED_HTTP:' + path + ':' + response.status);
      return new Uint8Array(await response.arrayBuffer());
    }

    function compactSuggestion(suggestion) {
      return {
        sourceNodeId: suggestion?.sourceNodeId ?? null,
        targetNodeId: suggestion?.targetNodeId ?? null,
        confidence: suggestion?.confidence ?? null,
        basisMethod: suggestion?.basisMethod ?? null,
        methodAStatus: suggestion?.methodA?.status ?? null,
        methodAConfidence: suggestion?.methodA?.confidence ?? null,
        methodABestBaseId: suggestion?.methodA?.bestBase?.baseId ?? null,
        methodAAnchorCount: suggestion?.methodA?.bestBase?.anchorCount ?? null,
        methodAValidationAnchorCount: suggestion?.methodA?.bestBase?.validationAnchorCount ?? null,
        methodBStatus: suggestion?.methodB?.status ?? null,
        candidateGeneration: suggestion?.candidateGeneration ?? null,
        basis: suggestion?.basis ?? [],
      };
    }

    function compactChoice(choice) {
      return {
        status: choice?.status ?? null,
        reason: choice?.reason ?? null,
        sourceNodeId: choice?.sourceNodeId ?? null,
        targetNodeId: choice?.targetNodeId ?? null,
        confidence: choice?.confidence ?? null,
        basisMethod: choice?.basisMethod ?? null,
        outcomeSignature: choice?.outcomeSignature ?? null,
        baseLoops: (choice?.baseLoops || []).map((loop) => ({
          baseId: loop?.baseId ?? null,
          method: loop?.method ?? null,
          confidence: loop?.confidence ?? null,
          anchorPairs: loop?.anchorPairs ?? [],
        })),
      };
    }

    function automaticLoops(inspection) {
      const loops = {};
      const choices = {};
      for (const member of inspection?.memberInspections || []) {
        const suggestions = member.inspection?.baseAnchorSuggestions || [];
        const choice = ciiAutomaticBaseSelection(suggestions);
        choices[member.sourceId] = {
          choice: compactChoice(choice),
          suggestions: suggestions.map(compactSuggestion),
        };
        if (choice.status === 'READY') loops[member.sourceId] = choice.baseLoops;
      }
      return { loops, choices };
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

    function candidateSummary(candidates) {
      if (!candidates) return null;
      return {
        status: candidates.status ?? null,
        reason: candidates.reason ?? candidates.blocker ?? null,
        winnerIdentityConfidence: candidates.winnerIdentityConfidence ?? null,
        winnerGap: candidates.winnerGap ?? candidates.gap ?? null,
        requiredGap: candidates.requiredGap ?? null,
        winner: candidates.winner ? {
          targetElementId: candidates.winner?.target?.elementId ?? candidates.winner?.targetElementId ?? null,
          rankingScore: candidates.winner?.rankingScore ?? candidates.winner?.score ?? null,
          identityConfidence: candidates.winner?.identityConfidence ?? null,
        } : null,
      };
    }

    function unresolvedRowTrace(row) {
      return {
        kind: row?.kind ?? null,
        status: row?.status ?? null,
        sourceNodeId: row?.sourceNodeId ?? null,
        targetNodeId: row?.targetNodeId ?? null,
        sourceElementId: row?.sourceElementId ?? null,
        targetElementIds: row?.targetElementIds ?? [],
        authority: row?.authority ?? null,
        propagation: row?.evidence?.propagation ?? null,
        candidates: candidateSummary(row?.evidence?.candidates),
      };
    }

    function seedTrace(member) {
      const mb = member?.multiBaseCorrespondence || {};
      return {
        status: mb.status ?? null,
        combination: mb.combination ?? null,
        blockers: mb.blockers ?? [],
        conflicts: mb.conflicts ?? [],
        seedCoverage: mb.seedCoverage ?? null,
        seedDiagnostics: mb.seedDiagnostics ?? [],
        unresolvedCanonicalRows: [
          ...(mb.nodeRows || []),
          ...(mb.elementRows || []),
        ].filter((row) => row?.status === 'UNRESOLVED').map(unresolvedRowTrace),
        loopResults: (mb.loopResults || []).map((item) => ({
          loopId: item?.loop?.loopId ?? null,
          loopMethod: item?.loop?.method ?? null,
          loopStatus: item?.loop?.status ?? null,
          correspondenceStatus: item?.correspondence?.status ?? null,
          blockers: item?.correspondence?.blockers ?? [],
          propagation: item?.correspondence?.propagation ?? null,
          unresolvedRows: [
            ...(item?.correspondence?.nodeRows || []),
            ...(item?.correspondence?.elementRows || []),
          ].filter((row) => row?.status === 'UNRESOLVED').map(unresolvedRowTrace),
        })),
      };
    }

    function previewTrace(preview, benchmark) {
      const audit = buildCiiSourceTargetAudit(preview);
      const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
      const s1Rows = audit.rows.filter((row) => row.sourceId === 'S1');
      const s1Member = preview.memberPreviews.find((item) => item.sourceId === 'S1')?.preview;
      const s1Op = (operation) => String(operation?.sourceId || '') === 'S1';
      const combinedS1Operations = [
        ...(preview.transferPlan?.operations || []),
        ...(preview.transferPlan?.excludedOperations || []),
      ].filter(s1Op);

      const knownPositiveS1 = overlay.rows
        .filter((row) => (row.sourceRowKeys || []).some((key) => String(key).startsWith('S1:')))
        .map((row) => ({
          targetNodeId: row.nodeId,
          action: row.action,
          status: row.status,
          correspondenceRecovered: row.correspondenceRecovered,
          mutationRecovered: row.mutationRecovered,
          sourceRowKeys: row.sourceRowKeys,
          boundSourceRowKeys: row.boundSourceRowKeys,
          mutationSourceRowKeys: row.mutationSourceRowKeys,
        }));

      const qualifiedS1 = s1Rows
        .filter((row) => row.qualifiedNodeNameChange)
        .map((row) => ({
          rowKey: row.rowKey,
          state: row.state,
          sourceNodeId: row.sourceNodeId,
          targetNodeId: row.targetNodeId,
          sourceNodeName: row.sourceNodeName,
          targetNodeName: row.targetNodeName,
          confidence: row.confidence,
          identityBound: row.identityBound,
          writerActions: row.writerActions,
          writerStatuses: row.writerStatuses,
          reasons: row.reasons,
        }));

      return {
        combinedCorrespondence: {
          status: preview.correspondence?.status ?? null,
          blockers: preview.correspondence?.blockers ?? [],
        },
        combinedTransferPlan: {
          status: preview.transferPlan?.status ?? null,
          mutationAuthority: preview.transferPlan?.mutationAuthority ?? null,
          blockers: preview.transferPlan?.blockers ?? [],
          s1OperationCount: combinedS1Operations.length,
          s1Operations: combinedS1Operations.map((operation) => ({
            operationId: operation?.operationId ?? null,
            action: operation?.action ?? null,
            status: operation?.status ?? null,
            property: operation?.property ?? null,
            targetNodeId: operation?.targetEvidence?.nodeId ?? operation?.targetEvidence?.identity ?? null,
            correspondenceId: operation?.matchAuthority?.correspondenceId ?? null,
          })),
        },
        s1Member: {
          correspondenceStatus: s1Member?.correspondence?.status ?? null,
          correspondenceBlockers: s1Member?.correspondence?.blockers ?? [],
          transferStatus: s1Member?.transferPlan?.status ?? null,
          transferBlockers: s1Member?.transferPlan?.blockers ?? [],
          transferOperationCount: s1Member?.transferPlan?.operations?.length ?? 0,
          engineeringDeltaCount: s1Member?.engineeringDeltas?.rows?.length ?? s1Member?.engineeringDeltas?.deltas?.length ?? null,
          seed: seedTrace(s1Member),
        },
        s1AuditSummary: {
          total: s1Rows.length,
          bound: s1Rows.filter((row) => row.state === 'BOUND').length,
          unresolved: s1Rows.filter((row) => row.state === 'UNRESOLVED').length,
          ambiguous: s1Rows.filter((row) => row.state === 'AMBIGUOUS').length,
          unemitted: s1Rows.filter((row) => row.state === 'UNEMITTED').length,
          qualifiedNodeNameChange: qualifiedS1.length,
        },
        qualifiedS1,
        knownPositiveS1,
        expectedAll: overlay.rows.map((row) => ({
          targetNodeId: row.nodeId,
          action: row.action,
          status: row.status,
          correspondenceRecovered: row.correspondenceRecovered,
          mutationRecovered: row.mutationRecovered,
          sourceRowKeys: row.sourceRowKeys,
          boundSourceRowKeys: row.boundSourceRowKeys,
          mutationSourceRowKeys: row.mutationSourceRowKeys,
        })),
        overlaySummary: overlay.summary,
      };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes('/Benchmark/' + name)));
    const [targetBytes, expectedBytes] = await Promise.all([
      fetchBytes('/Benchmark/T.CII'),
      fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII'),
    ]);
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: 'S' + (index + 1),
      fileName,
      bytes: sourceBytes[index],
    }));

    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII',
      expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
      cryptoRef: crypto,
    });

    async function inspectAtBudget(budget) {
      const started = performance.now();
      const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge(
        { sources, targetBytes, targetFileName: 'T.CII' },
        { cryptoRef: crypto, methodAPhysicalCandidateLimit: budget },
      );
      const auto = automaticLoops(inspection);
      return {
        budget,
        elapsedMs: Number((performance.now() - started).toFixed(1)),
        inspection,
        auto,
      };
    }

    const budget10 = await inspectAtBudget(10);
    const budget11 = await inspectAtBudget(11);

    const s1InspectionForCandidates = budget11.inspection?.memberInspections
      ?.find((member) => member.sourceId === 'S1')?.inspection;
    const rawPhysicalPairs = uniqueIncidentComponentLengthPairs(
      s1InspectionForCandidates?.sourceGraph,
      s1InspectionForCandidates?.targetGraph,
    );
    const selectedPhysical = Object.fromEntries([10, 11, 24].map((limit) => [
      String(limit),
      selectPhysicalCandidatePairs(
        s1InspectionForCandidates?.sourceGraph,
        s1InspectionForCandidates?.targetGraph,
        rawPhysicalPairs,
        limit,
      ).map((row) => ({
        sourceNodeId: row.sourceNodeId,
        targetNodeId: row.targetNodeId,
        fingerprint: row.physicalFingerprint?.fingerprint || null,
      })),
    ]));
    const diagnosticAnchors = [
      ['3910', '875'],
      ['3940', '880'],
      ['3870', '870'],
      ['4930', '1055'],
      ['5040', '1080'],
      ['5070', '1085'],
      ['5080', '1090'],
      ['5140', '1100'],
    ];
    const pairKey = (s, t) => String(s) + '=>' + String(t);
    const rawKeys = new Set(rawPhysicalPairs.map((row) => pairKey(row.sourceNodeId, row.targetNodeId)));
    const selectedKeys = Object.fromEntries(Object.entries(selectedPhysical)
      .map(([limit, rows]) => [limit, new Set(rows.map((row) => pairKey(row.sourceNodeId, row.targetNodeId)))]));
    const physicalCandidateTrace = {
      rawCount: rawPhysicalPairs.length,
      rawPairs: rawPhysicalPairs.map((row) => ({
        sourceNodeId: row.sourceNodeId,
        targetNodeId: row.targetNodeId,
        fingerprint: row.physicalFingerprint?.fingerprint || null,
      })),
      selected: selectedPhysical,
      diagnosticPairMembership: diagnosticAnchors.map(([sourceNodeId, targetNodeId]) => ({
        sourceNodeId,
        targetNodeId,
        inRawUniquePhysicalPool: rawKeys.has(pairKey(sourceNodeId, targetNodeId)),
        selectedAt10: selectedKeys['10'].has(pairKey(sourceNodeId, targetNodeId)),
        selectedAt11: selectedKeys['11'].has(pairKey(sourceNodeId, targetNodeId)),
        selectedAt24: selectedKeys['24'].has(pairKey(sourceNodeId, targetNodeId)),
      })),
    };

    let automatic11 = null;
    if (budget11.auto.loops.S1 && budget11.auto.loops.S2 && budget11.auto.loops.S3) {
      const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        sources,
        targetBytes,
        targetFileName: 'T.CII',
        baseLoopsBySource: budget11.auto.loops,
      }, { cryptoRef: crypto, methodAPhysicalCandidateLimit: 11 });
      const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        sources,
        targetBytes,
        targetFileName: 'T.CII',
        baseLoopsBySource: budget11.auto.loops,
        reviewBySource: reviewBySource(discovery),
      }, { cryptoRef: crypto, methodAPhysicalCandidateLimit: 11 });
      automatic11 = previewTrace(reviewed, benchmark);
    }

    const manualLoops = { ...budget11.auto.loops };
    delete manualLoops.S1;
    if (!manualLoops.S2 || !manualLoops.S3) throw new Error('TRACE_REQUIRES_S2_S3_AUTOMATIC_LOOPS');

    const threeAnchors = [
      { sourceNodeId: '3910', targetNodeId: '875' },
      { sourceNodeId: '3940', targetNodeId: '880' },
      { sourceNodeId: '3870', targetNodeId: '870' },
    ];

    const manualDiscovery = await createCiiWriter2SourceSetPreviewWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: manualLoops,
      anchorPairsBySource: { S1: threeAnchors },
    }, { cryptoRef: crypto, methodAPhysicalCandidateLimit: 11 });

    const manualReviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: manualLoops,
      anchorPairsBySource: { S1: threeAnchors },
      reviewBySource: reviewBySource(manualDiscovery),
    }, { cryptoRef: crypto, methodAPhysicalCandidateLimit: 11 });

    return {
      schema: 'CIIWriter2S1SemanticTrace.v1',
      benchmark: {
        expectedCount: benchmark.summary?.expectedCount ?? benchmark.rows?.length ?? null,
        actionCounts: benchmark.summary?.byAction ?? null,
      },
      physicalCandidateTrace,
      automatic: {
        budget10: {
          elapsedMs: budget10.elapsedMs,
          S1: budget10.auto.choices.S1,
          S2: budget10.auto.choices.S2,
          S3: budget10.auto.choices.S3,
        },
        budget11: {
          elapsedMs: budget11.elapsedMs,
          S1: budget11.auto.choices.S1,
          S2: budget11.auto.choices.S2,
          S3: budget11.auto.choices.S3,
          reviewedPreview: automatic11,
        },
      },
      manualThree: {
        anchors: threeAnchors,
        reviewedPreview: previewTrace(manualReviewed, benchmark),
      },
    };
  });

  console.log('S1_SEMANTIC_TRACE ' + JSON.stringify(trace));
  expect(trace.schema).toBe('CIIWriter2S1SemanticTrace.v1');
  expect(trace.manualThree.reviewedPreview.s1Member.seed.seedCoverage).toBeTruthy();
});
