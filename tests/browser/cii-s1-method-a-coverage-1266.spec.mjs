import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('D1 diagnoses retained S1 Method-A single-span coverage loss', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSetModule,
      baseSelectionModule,
      multiPreviewModule,
      censusModule,
      benchmarkModule,
      topologyAdapterModule,
      topologyModule,
      arbitrationModule,
      propagationModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-topology.js'),
      import('/tabs/cii-workspace/cii-workspace-correspondence-arbitration.js'),
      import('/tabs/cii-workspace/cii-workspace-propagation.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSetModule;
    const { ciiAutomaticBaseSelection } = baseSelectionModule;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreviewModule;
    const { buildCiiSourceTargetAudit } = censusModule;
    const { deriveCiiNodeNameBenchmarkDeltaFromCii, buildCiiSourceTargetBenchmarkOverlay } = benchmarkModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyAdapterModule;
    const { compareLockedCiiAnchorSpan } = topologyModule;
    const { arbitrateCiiLoopCorrespondences } = arbitrationModule;
    const { propagateSingleCiiAnchorCorrespondence } = propagationModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('D1_HTTP:' + path + ':' + response.status);
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
    function normalizedClaims(correspondence) {
      return (correspondence?.nodeRows || []).flatMap((row) => {
        if (row?.sourceNodeId == null || row?.targetNodeId == null) return [];
        if (['UNRESOLVED', 'CONFLICT'].includes(row.status)) return [];
        return [{
          sourceNodeId: String(row.sourceNodeId),
          targetNodeId: String(row.targetNodeId),
          status: row.status,
          authority: row.authority || null,
          correspondenceId: row.correspondenceId || null,
        }];
      });
    }
    function claimsForSource(claims, sourceNodeId) {
      return claims.filter((row) => row.sourceNodeId === String(sourceNodeId));
    }
    function uniqueTargets(rows) {
      return [...new Set(rows.map((row) => row.targetNodeId))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    function rowByKey(audit, key) {
      return (audit?.rows || []).find((row) => row.rowKey === key) || null;
    }
    function productionReviewRows(preview, sourceNodeId) {
      return (preview?.compareReview?.rows || []).filter((row) => String(row?.source) === String(sourceNodeId));
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes('/Benchmark/' + name)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: 'S' + (index + 1), fileName, bytes: sourceBytes[index],
    }));

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes, targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto, methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5,
    });
    const automatic = automaticState(inspection);
    if (automatic.choices.S1?.status !== 'READY') throw new Error('D1_S1_NOT_READY:' + automatic.choices.S1?.reason);

    const previewInput = (reviewBySourceValue = undefined) => ({
      sources, targetBytes, targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef: crypto });
    const reviews = reviewBySource(discovery);
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviews), { cryptoRef: crypto });

    const audit = buildCiiSourceTargetAudit(reviewed);
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII', expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII', cryptoRef: crypto,
    });
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);

    const s1Member = (reviewed.memberPreviews || []).find((row) => row.sourceId === 'S1')?.preview;
    if (!s1Member) throw new Error('D1_S1_MEMBER_PREVIEW_REQUIRED');
    const sourceGraph = adaptCiiDocumentToTopologyGraph(s1Member.sourceDocument);
    const targetGraph = adaptCiiDocumentToTopologyGraph(s1Member.targetDocument);
    const methodALoop = (s1Member.multiBaseAuthority?.loops || []).find((loop) => loop.method === 'METHOD_A_SPATIAL' && loop.status === 'READY');
    if (!methodALoop?.geometry || methodALoop.geometry.status !== 'READY') throw new Error('D1_METHOD_A_READY_GEOMETRY_REQUIRED');

    const anchors = (automatic.choices.S1?.baseLoops?.[0]?.anchorPairs || []).map((row) => ({
      sourceNodeId: String(row.sourceNodeId), targetNodeId: String(row.targetNodeId),
    }));
    if (anchors.length < 3) throw new Error('D1_AUTOMATIC_METHOD_A_ANCHORS_REQUIRED');

    const localSpanResults = [];
    for (let left = 0; left < anchors.length - 1; left += 1) for (let right = left + 1; right < anchors.length; right += 1) {
      const anchorPairs = [anchors[left], anchors[right]];
      const correspondence = compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchorPairs, {
        geometryTransform: methodALoop.geometry,
      });
      localSpanResults.push({
        loop: {
          loopId: 'D1_METHOD_A_LOCAL_SPAN_' + left + '_' + right,
          method: 'METHOD_A_SPATIAL',
          status: 'READY',
          confidence: automatic.choices.S1.confidence,
          anchorPairs,
        },
        correspondence,
      });
    }
    const localSpanUnion = arbitrateCiiLoopCorrespondences(localSpanResults);
    const localSpanClaims = normalizedClaims(localSpanUnion);

    const propagationResults = anchors.map((anchor, index) => ({
      index,
      anchor,
      correspondence: propagateSingleCiiAnchorCorrespondence(sourceGraph, targetGraph, anchor, {}),
    }));
    const propagationClaims = propagationResults.flatMap((item) => normalizedClaims(item.correspondence)
      .filter((row) => !(row.sourceNodeId === item.anchor.sourceNodeId && row.targetNodeId === item.anchor.targetNodeId))
      .map((row) => ({ ...row, diagnosticAnchorIndex: item.index })));

    const s1Expected = (overlay?.rows || []).filter((row) => (row.sourceRowKeys || []).some((key) => String(key).startsWith('S1:')));
    const rowResults = s1Expected.map((expected) => {
      const sourceKeys = (expected.sourceRowKeys || []).filter((key) => String(key).startsWith('S1:'));
      const sourceRows = sourceKeys.map((key) => rowByKey(audit, key)).filter(Boolean);
      const sourceNodeIds = sourceRows.map((row) => String(row.sourceNodeId));
      const spanClaims = sourceNodeIds.flatMap((id) => claimsForSource(localSpanClaims, id));
      const propagation = sourceNodeIds.flatMap((id) => claimsForSource(propagationClaims, id));
      const spanTargets = uniqueTargets(spanClaims);
      const propagationTargets = uniqueTargets(propagation);
      const expectedTarget = String(expected.nodeId);
      const spanSupportsExpected = spanTargets.includes(expectedTarget);
      const propagationSupportsExpected = propagationTargets.includes(expectedTarget);
      const spanConflict = spanTargets.length > 1 || (localSpanUnion?.conflicts || []).some((conflict) =>
        sourceNodeIds.includes(String(conflict.key || '')));
      let classification = 'LOCAL_SPAN_STILL_UNRESOLVED';
      if (expected.mutationRecovered) classification = 'ALREADY_RECOVERED_CONTROL';
      else if (spanConflict) classification = 'LOCAL_SPAN_CONFLICT';
      else if (spanSupportsExpected) classification = 'SINGLE_SPAN_COVERAGE_LOSS';
      else if (propagationSupportsExpected) classification = 'PROPAGATION_ONLY_EVIDENCE';
      else if (sourceRows.some((row) => row.identityBound && !row.qualifiedNodeNameChange)) classification = 'MUTATION_QUALIFICATION_LOSS';
      return {
        benchmarkTargetNodeId: expected.nodeId,
        benchmarkAction: expected.action,
        benchmarkStatus: expected.status,
        mutationRecovered: expected.mutationRecovered,
        sourceRowKeys: sourceKeys,
        productionRows: sourceRows.map((row) => ({
          rowKey: row.rowKey,
          sourceNodeId: row.sourceNodeId,
          state: row.state,
          identityBound: row.identityBound,
          confidence: row.confidence,
          targetNodeIds: row.targetNodeIds,
          qualifiedNodeNameChange: row.qualifiedNodeNameChange,
          writerActions: row.writerActions,
          writerStatuses: row.writerStatuses,
          reasons: row.reasons,
          reviewRows: productionReviewRows(s1Member, row.sourceNodeId).map((review) => ({
            target: review.target,
            workflowStatus: review.workflowStatus,
            confidence: review.confidence,
            identityBound: review.identityBound,
            candidateStatus: review.candidateStatus,
            reasons: review.reasons || [],
            identityReasons: review.identityReasons || [],
            authority: review.authority,
            identityEvidenceBasis: review.identityEvidenceBasis,
          })),
        })),
        localSpan: {
          supportsExpected: spanSupportsExpected,
          targetNodeIds: spanTargets,
          claimCount: spanClaims.length,
          conflict: spanConflict,
        },
        diagnosticPropagation: {
          authority: 'DIAGNOSTIC_ONLY_METHOD_A_ANCHOR_PROPAGATION',
          supportsExpected: propagationSupportsExpected,
          targetNodeIds: propagationTargets,
          claimCount: propagation.length,
        },
        classification,
      };
    });

    return {
      schema: 'CIIWriter2S1MethodACoverageDiagnostic.v1',
      authority: 'VALIDATION_ONLY_METHOD_A_COVERAGE_DIAGNOSTIC',
      automaticChoice: {
        status: automatic.choices.S1.status,
        confidence: automatic.choices.S1.confidence,
        basisMethod: automatic.choices.S1.basisMethod,
        anchorPairs: anchors.map((row) => row.sourceNodeId + '=>' + row.targetNodeId),
      },
      production: {
        correspondenceStatus: s1Member.correspondence?.status,
        currentMethodACorrespondenceStatus: s1Member.multiBaseCorrespondence?.status,
        currentBlockers: s1Member.multiBaseCorrespondence?.blockers || [],
      },
      localSpans: {
        total: localSpanResults.length,
        ready: localSpanResults.filter((row) => row.correspondence.status === 'READY').length,
        unresolved: localSpanResults.filter((row) => row.correspondence.status === 'UNRESOLVED').length,
        blocked: localSpanResults.filter((row) => row.correspondence.status === 'BLOCKED').length,
        conflict: localSpanResults.filter((row) => row.correspondence.status === 'CONFLICT').length,
        unionStatus: localSpanUnion.status,
        unionConflicts: localSpanUnion.conflicts || [],
        nodeClaimCount: localSpanClaims.length,
        spanDiagnostics: localSpanResults.map((row) => ({
          loopId: row.loop.loopId,
          anchors: row.loop.anchorPairs.map((pair) => pair.sourceNodeId + '=>' + pair.targetNodeId),
          status: row.correspondence.status,
          blockers: row.correspondence.blockers || [],
          nodeClaimCount: normalizedClaims(row.correspondence).length,
        })),
      },
      propagation: {
        runs: propagationResults.length,
        nodeClaimCount: propagationClaims.length,
        runsByAnchor: propagationResults.map((row) => ({
          anchor: row.anchor.sourceNodeId + '=>' + row.anchor.targetNodeId,
          status: row.correspondence.status,
          blockers: row.correspondence.blockers || [],
          nodeClaimCount: normalizedClaims(row.correspondence).length,
        })),
      },
      s1LowerBound: {
        attributedCount: rowResults.length,
        recoveredMutationCount: rowResults.filter((row) => row.mutationRecovered).length,
        classificationCounts: Object.fromEntries([...new Set(rowResults.map((row) => row.classification))]
          .map((kind) => [kind, rowResults.filter((row) => row.classification === kind).length])),
        rows: rowResults,
      },
    };
  });

  await writeFile('s1-d1-method-a-coverage.json', JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
  console.log('S1_D1_METHOD_A_COVERAGE=' + JSON.stringify(diagnostics));

  expect(diagnostics.automaticChoice.status).toBe('READY');
  expect(diagnostics.automaticChoice.anchorPairs).toHaveLength(10);
  expect(diagnostics.localSpans.total).toBe(45);
  expect(diagnostics.s1LowerBound.attributedCount).toBe(12);
  expect(diagnostics.s1LowerBound.recoveredMutationCount).toBe(5);
});
