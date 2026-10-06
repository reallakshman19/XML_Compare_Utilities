import { expect, test } from '@playwright/test';

test('D5.1 traces final S1 mutation losses through production correspondence-review-transfer surfaces', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      multiPreview,
      censusModule,
      benchmarkModule,
      engineeringModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-engineering-delta.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = censusModule;
    const {
      deriveCiiNodeNameBenchmarkDeltaFromCii,
      buildCiiSourceTargetBenchmarkOverlay,
    } = benchmarkModule;
    const { ciiIdentityBound, ciiIdentityConfidence } = engineeringModule;

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
    function edgeEvidence(evidence) {
      if (!evidence) return null;
      return {
        identitySupported: evidence.identitySupported ?? null,
        identityConfidence: evidence.identityConfidence ?? null,
        hardFail: evidence.hardFail ?? null,
        score: evidence.score ?? null,
        rankingScore: evidence.rankingScore ?? null,
        reasons: evidence.reasons || [],
        methods: evidence.methods || null,
        dimensions: evidence.dimensions || null,
      };
    }
    function evidenceSummary(evidence) {
      if (!evidence) return null;
      return {
        identitySupported: evidence.identitySupported ?? null,
        identityConfidence: evidence.identityConfidence ?? null,
        identityEvidenceBasis: evidence.identityEvidenceBasis ?? null,
        methodALoopId: evidence.methodALoopId ?? null,
        methodABaseId: evidence.methodABaseId ?? null,
        leftElement: edgeEvidence(evidence.leftElement),
        rightElement: edgeEvidence(evidence.rightElement),
        candidates: evidence.candidates ? {
          status: evidence.candidates.status ?? null,
          winnerIdentityConfidence: evidence.candidates.winnerIdentityConfidence ?? null,
          winnerTargetElementId: evidence.candidates.winnerTargetElementId ?? null,
          winnerGap: evidence.candidates.winnerGap ?? null,
          requiredWinnerGap: evidence.candidates.requiredWinnerGap ?? null,
          reasons: evidence.candidates.reasons || [],
        } : null,
        multiBaseProvenance: (evidence.multiBaseProvenance || []).map((row) => ({
          loopId: row.loopId,
          method: row.method,
          baseConfidence: row.baseConfidence,
          rowStatus: row.rowStatus,
          rowAuthority: row.rowAuthority,
        })),
      };
    }
    function nodeRowSummary(row) {
      if (!row) return null;
      let bound = false; let confidence = 'UNRESOLVED';
      try { bound = Boolean(ciiIdentityBound(row)); } catch {}
      try { confidence = ciiIdentityConfidence(row); } catch {}
      return {
        correspondenceId: row.correspondenceId || null,
        sourceNodeId: row.sourceNodeId == null ? null : String(row.sourceNodeId),
        targetNodeId: row.targetNodeId == null ? null : String(row.targetNodeId),
        status: row.status || null,
        authority: row.authority || null,
        basisMethod: row.basisMethod || null,
        genericIdentityBound: bound,
        genericIdentityConfidence: confidence,
        evidence: evidenceSummary(row.evidence),
      };
    }
    function reviewRowSummary(row) {
      if (!row) return null;
      return {
        correspondenceId: row.correspondenceId || null,
        source: row.source == null ? null : String(row.source),
        target: row.target == null ? null : String(row.target),
        workflowStatus: row.workflowStatus || null,
        confidence: row.confidence || null,
        identityBound: row.identityBound === true,
        identityEvidenceBasis: row.identityEvidenceBasis || null,
        decision: row.decision || null,
        authority: row.authority || null,
        changeCount: row.changeCount ?? null,
        changeFamilies: row.changeFamilies || [],
        reasons: row.reasons || [],
        identityReasons: row.identityReasons || [],
        adjacentBoundary: row.adjacentBoundary || null,
      };
    }
    function deltaSummary(row) {
      return {
        deltaId: row.deltaId || null,
        correspondenceId: row.correspondenceId || null,
        sourceIdentity: row.sourceIdentity == null ? null : String(row.sourceIdentity),
        targetIdentity: row.targetIdentity == null ? null : String(row.targetIdentity),
        category: row.category || null,
        property: row.property || null,
        sourceValue: row.sourceValue ?? null,
        targetValue: row.targetValue ?? null,
        identityConfidence: row.identityConfidence || null,
        changed: row.changed === true,
        evidenceStatus: row.evidenceStatus || null,
        authority: row.authority || null,
        limitations: row.limitations || [],
      };
    }
    function operationTarget(operation) {
      return String(operation?.targetEvidence?.identity
        ?? operation?.targetEvidence?.nodeId
        ?? operation?.targetIdentity
        ?? '').trim();
    }
    function operationSummary(operation) {
      return {
        operationId: operation.operationId || null,
        sourceId: operation.sourceId || null,
        action: operation.action || null,
        status: operation.status || null,
        targetIdentity: operationTarget(operation) || null,
        correspondenceId: operation?.matchAuthority?.correspondenceId || null,
        memberCorrespondenceId: operation?.memberCorrespondenceId || null,
        engineeringDeltaId: operation?.engineeringDeltaId || null,
        memberEngineeringDeltaId: operation?.memberEngineeringDeltaId || null,
        sourceValue: operation?.sourceEvidence?.value ?? null,
        before: operation?.before ?? operation?.targetEvidence?.value ?? null,
        proposed: operation?.proposed ?? operation?.sourceEvidence?.value ?? null,
        blockers: operation.blockers || [],
      };
    }
    function loopSummary(loop) {
      return {
        loopId: loop?.loopId || null,
        baseId: loop?.baseId || null,
        method: loop?.method || null,
        status: loop?.status || null,
        confidence: loop?.confidence || null,
        weight: loop?.weight || null,
        anchorPairs: (loop?.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
      };
    }
    function classify(trace) {
      const raw = trace.rawLoopRows || [];
      if (!raw.length) return 'RAW_CORRESPONDENCE_MISSING';
      if (!raw.some((row) => row.row?.genericIdentityBound === true)) return 'RAW_IDENTITY_UNSUPPORTED';
      if (!trace.canonicalRows.some((row) => row.genericIdentityBound === true)) return 'ARBITRATION_EVIDENCE_LOSS';
      if (!trace.reviewRows.some((row) => row.identityBound === true)) return 'REVIEW_IDENTITY_GATE';
      if (!trace.nodeNameDeltas.some((row) => row.changed === true)) return 'ENGINEERING_DELTA_MISSING';
      if (!trace.combinedTransferOperations.length) return 'TRANSFER_SELECTION_GATE';
      if (trace.audit.state !== 'BOUND' || !trace.overlay.mutationRecovered) return 'SOURCE_TARGET_AUDIT_JOIN_DEFECT';
      return 'OTHER_WITH_EXACT_MECHANISM';
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: `S${index + 1}`, fileName, bytes: sourceBytes[index],
    }));

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes, targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto,
      methodAPhysicalCandidateLimit: 10,
      baseAnchorDisplayLimit: 5,
    });
    const automatic = automaticState(inspection);

    const previewInput = (reviewBySourceValue = undefined) => ({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });

    // All production correspondence/review/delta/transfer surfaces are derived before any TEXPECTED join.
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef: crypto });
    const reviews = reviewBySource(discovery);
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviews), { cryptoRef: crypto });
    const audit = buildCiiSourceTargetAudit(reviewed);

    // Oracle joins only after the complete production derivation above.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII',
      expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
      cryptoRef: crypto,
    });
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);

    const auditByKey = new Map((audit.rows || []).map((row) => [row.rowKey, row]));
    const memberBySource = new Map((reviewed.memberPreviews || []).map((row) => [row.sourceId, row]));

    function traceAuditRow(overlayRow, auditRow) {
      const member = memberBySource.get(auditRow.sourceId);
      const preview = member?.preview;
      const replacementPreview = member?.replacementPreview;
      const sourceNodeId = String(auditRow.sourceNodeId || '');
      const targetNodeId = String(overlayRow.nodeId || auditRow.targetNodeId || '');
      const canonicalRows = (preview?.correspondence?.nodeRows || [])
        .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
          && String(row?.targetNodeId || '') === targetNodeId)
        .map(nodeRowSummary);
      const rawLoopRows = (preview?.correspondence?.loopResults || []).flatMap((item) =>
        (item?.correspondence?.nodeRows || [])
          .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
            && String(row?.targetNodeId || '') === targetNodeId)
          .map((row) => ({
            loop: loopSummary(item.loop),
            row: nodeRowSummary(row),
          })));
      const correspondenceIds = new Set(canonicalRows.map((row) => row.correspondenceId).filter(Boolean));
      const reviewRows = (preview?.compareReview?.rows || [])
        .filter((row) => String(row?.source || '') === sourceNodeId
          && String(row?.target || '') === targetNodeId)
        .map(reviewRowSummary);
      for (const row of reviewRows) if (row.correspondenceId) correspondenceIds.add(row.correspondenceId);
      const nodeNameDeltas = (preview?.engineeringDeltas?.rows || [])
        .filter((row) => row?.category === 'NODE_NAME'
          && String(row?.sourceIdentity || '') === sourceNodeId
          && String(row?.targetIdentity || '') === targetNodeId)
        .map(deltaSummary);
      const memberTransferOperations = [
        ...(preview?.transferPlan?.operations || []),
        ...(preview?.transferPlan?.excludedOperations || []),
      ].filter((operation) => operationTarget(operation) === targetNodeId
        || correspondenceIds.has(String(operation?.matchAuthority?.correspondenceId || '')))
        .map(operationSummary);
      const replacementTransferOperations = [
        ...(replacementPreview?.transferPlan?.operations || []),
        ...(replacementPreview?.transferPlan?.excludedOperations || []),
      ].filter((operation) => operationTarget(operation) === targetNodeId
        || correspondenceIds.has(String(operation?.matchAuthority?.correspondenceId || '')))
        .map(operationSummary);
      const combinedTransferOperations = [
        ...(reviewed?.transferPlan?.operations || []),
        ...(reviewed?.transferPlan?.excludedOperations || []),
      ].filter((operation) => String(operation?.sourceId || '') === auditRow.sourceId
        && operationTarget(operation) === targetNodeId)
        .map(operationSummary);

      const trace = {
        overlay: {
          nodeId: overlayRow.nodeId,
          action: overlayRow.action,
          writerAction: overlayRow.writerAction,
          status: overlayRow.status,
          correspondenceRecovered: overlayRow.correspondenceRecovered,
          mutationRecovered: overlayRow.mutationRecovered,
          sourceRowKeys: overlayRow.sourceRowKeys || [],
          boundSourceRowKeys: overlayRow.boundSourceRowKeys || [],
          mutationSourceRowKeys: overlayRow.mutationSourceRowKeys || [],
        },
        audit: {
          rowKey: auditRow.rowKey,
          sourceId: auditRow.sourceId,
          sourceNodeId: auditRow.sourceNodeId,
          sourceNodeName: auditRow.sourceNodeName,
          state: auditRow.state,
          emitted: auditRow.emitted,
          identityBound: auditRow.identityBound,
          confidence: auditRow.confidence,
          targetNodeIds: auditRow.targetNodeIds || [],
          targetNodeNames: auditRow.targetNodeNames || [],
          targetNodeId: auditRow.targetNodeId,
          targetNodeName: auditRow.targetNodeName,
          qualifiedNodeNameChange: auditRow.qualifiedNodeNameChange,
          nodeNameDeltaIds: auditRow.nodeNameDeltaIds || [],
          correspondenceIds: auditRow.correspondenceIds || [],
          workflowStatuses: auditRow.workflowStatuses || [],
          authorities: auditRow.authorities || [],
          evidenceBases: auditRow.evidenceBases || [],
          reviewDecisions: auditRow.reviewDecisions || [],
          writerActions: auditRow.writerActions || [],
          writerStatuses: auditRow.writerStatuses || [],
          reasons: auditRow.reasons || [],
        },
        rawLoopRows,
        canonicalRows,
        reviewRows,
        nodeNameDeltas,
        memberTransferOperations,
        replacementTransferOperations,
        combinedTransferOperations,
      };
      return { ...trace, earliestClass: classify(trace) };
    }

    function traceOverlayRow(overlayRow) {
      const sourceRows = (overlayRow.sourceRowKeys || [])
        .filter((key) => String(key).startsWith('S1:'))
        .map((key) => auditByKey.get(key))
        .filter(Boolean);
      return {
        benchmarkRow: {
          nodeId: overlayRow.nodeId,
          action: overlayRow.action,
          writerAction: overlayRow.writerAction,
          status: overlayRow.status,
          sourceRowKeys: overlayRow.sourceRowKeys || [],
          mutationSourceRowKeys: overlayRow.mutationSourceRowKeys || [],
        },
        traces: sourceRows.map((row) => traceAuditRow(overlayRow, row)),
      };
    }

    const s1Rows = (overlay?.rows || []).filter((row) =>
      (row.sourceRowKeys || []).some((key) => String(key).startsWith('S1:')));
    const missingS1 = s1Rows.filter((row) => !row.mutationRecovered);

    // Control IDs are selected only after production derivation + lower-bound scoring.
    const d3RecoveredTargets = new Set(['925', '960', '975', '980', '995']);
    const preD3RecoveredTargets = new Set(['930', '940', '945', '955', '970']);
    const newControl = s1Rows.find((row) => row.mutationRecovered && d3RecoveredTargets.has(String(row.nodeId)));
    const oldControl = s1Rows.find((row) => row.mutationRecovered && preD3RecoveredTargets.has(String(row.nodeId)));

    return {
      schema: 'CIIWriter2S1D5_1CausalTrace.v1',
      oracleJoinedAfterProductionDerivation: true,
      automaticS1: {
        status: automatic.choices.S1?.status || null,
        reason: automatic.choices.S1?.reason || null,
        confidence: automatic.choices.S1?.confidence || null,
        basisMethod: automatic.choices.S1?.basisMethod || null,
        baseLoops: (automatic.choices.S1?.baseLoops || []).map(loopSummary),
      },
      reviewedS1: {
        reviewedCount: reviews.S1?.reviewedCorrespondenceIds?.length || 0,
        lockedCount: reviews.S1?.lockedCorrespondenceIds?.length || 0,
      },
      overlaySummary: overlay?.summary || null,
      missingS1: missingS1.map(traceOverlayRow),
      controls: {
        newlyRecoveredD3: newControl ? traceOverlayRow(newControl) : null,
        recoveredPreD3: oldControl ? traceOverlayRow(oldControl) : null,
      },
    };
  });

  console.log('S1_D5_1_CAUSAL_TRACE=' + JSON.stringify(diagnostics));

  expect(diagnostics.oracleJoinedAfterProductionDerivation).toBe(true);
  expect(diagnostics.automaticS1.status).toBe('READY');
  expect(diagnostics.reviewedS1.lockedCount).toBe(0);
  expect(diagnostics.missingS1).toHaveLength(2);
  expect(diagnostics.missingS1.map((row) => String(row.benchmarkRow.nodeId)).sort()).toEqual(['1000', '1005']);
  expect(diagnostics.controls.newlyRecoveredD3).not.toBeNull();
  expect(diagnostics.controls.recoveredPreD3).not.toBeNull();
  for (const row of diagnostics.missingS1) {
    expect(row.traces.length).toBeGreaterThan(0);
    for (const trace of row.traces) expect(trace.earliestClass).toBeTruthy();
  }
});
