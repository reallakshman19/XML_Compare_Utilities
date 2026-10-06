import { expect, test } from '@playwright/test';

test('U6 traces final post-U4 six-row correspondence losses through raw alignment and downstream gates', async ({ page }) => {
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
      arbitrationModule,
      topologyModule,
      topologyAdapterModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-engineering-delta.js'),
      import('/tabs/cii-workspace/cii-workspace-correspondence-arbitration.js'),
      import('/tabs/cii-workspace/cii-workspace-topology.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
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
    const { arbitrateCiiLoopCorrespondences } = arbitrationModule;
    const { compareLockedCiiAnchorSpan } = topologyModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyAdapterModule;

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
        boundaryIdentity: evidence.boundaryIdentity ? {
          status: evidence.boundaryIdentity.status ?? null,
          identitySupported: evidence.boundaryIdentity.identitySupported ?? null,
          identityConfidence: evidence.boundaryIdentity.identityConfidence ?? null,
          reason: evidence.boundaryIdentity.reason ?? null,
          basis: evidence.boundaryIdentity.basis ?? null,
          left: evidence.boundaryIdentity.left ? {
            identitySupported: evidence.boundaryIdentity.left.identitySupported ?? null,
            endpointDistanceMm: evidence.boundaryIdentity.left.endpointDistanceMm ?? null,
            odPass: evidence.boundaryIdentity.left.odPass ?? null,
            m1Pass: evidence.boundaryIdentity.left.m1Pass ?? null,
            m2Pass: evidence.boundaryIdentity.left.m2Pass ?? null,
            hardFail: evidence.boundaryIdentity.left.hardFail ?? null,
          } : null,
          right: evidence.boundaryIdentity.right ? {
            identitySupported: evidence.boundaryIdentity.right.identitySupported ?? null,
            endpointDistanceMm: evidence.boundaryIdentity.right.endpointDistanceMm ?? null,
            odPass: evidence.boundaryIdentity.right.odPass ?? null,
            m1Pass: evidence.boundaryIdentity.right.m1Pass ?? null,
            m2Pass: evidence.boundaryIdentity.right.m2Pass ?? null,
            hardFail: evidence.boundaryIdentity.right.hardFail ?? null,
          } : null,
        } : null,
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
        nodeCustodyGate: evidence.nodeCustodyGate ? {
          status: evidence.nodeCustodyGate.status || null,
          blocker: evidence.nodeCustodyGate.blocker || null,
          sourceElementIds: evidence.nodeCustodyGate.sourceElementIds || [],
          linkedCandidateEvidence: (evidence.nodeCustodyGate.linkedCandidateEvidence || []).map((item) => ({
            correspondenceId: item.correspondenceId || null,
            status: item.status || null,
            candidateStatus: item.candidates?.status || null,
            winnerIdentityConfidence: item.candidates?.winnerIdentityConfidence || null,
            winnerTargetElementId: item.candidates?.winnerTargetElementId || null,
            reasons: item.candidates?.reasons || [],
          })),
        } : null,
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
    function elementRowSummary(row) {
      if (!row) return null;
      return {
        correspondenceId: row.correspondenceId || null,
        sourceElementIds: (row.sourceElementIds || (row.sourceElementId ? [row.sourceElementId] : [])).map(String),
        targetElementIds: (row.targetElementIds || (row.targetElementId ? [row.targetElementId] : [])).map(String),
        status: row.status || null,
        authority: row.authority || null,
        candidateStatus: row.evidence?.candidates?.status || null,
        winnerIdentityConfidence: row.evidence?.candidates?.winnerIdentityConfidence || null,
        winnerTargetElementId: row.evidence?.candidates?.winnerTargetElementId || null,
        winnerGap: row.evidence?.candidates?.winnerGap ?? null,
        requiredWinnerGap: row.evidence?.candidates?.requiredWinnerGap ?? null,
        reasons: row.evidence?.candidates?.reasons || [],
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
      const rawAlignment = trace.rawAlignmentRows || [];
      if (!rawAlignment.length) return { class: 'RAW_ALIGNMENT_MISSING', mechanism: null };
      const rawBoundarySupported = rawAlignment.some((row) =>
        row.evidence?.boundaryIdentity?.identitySupported === true
        || (row.evidence?.leftElement?.identitySupported === true
          && row.evidence?.leftElement?.identityConfidence === 'HIGH'
          && row.evidence?.rightElement?.identitySupported === true
          && row.evidence?.rightElement?.identityConfidence === 'HIGH'));
      if (!rawBoundarySupported) {
        return { class: 'RAW_BOUNDARY_IDENTITY_UNSUPPORTED', mechanism: null };
      }
      const projected = trace.projectedLoopRows || [];
      if (!projected.some((row) => row.row?.genericIdentityBound === true)) {
        return { class: 'METHOD_A_PROJECTION_UNSUPPORTED', mechanism: null };
      }
      if (!trace.arbitrationRows.some((row) => row.genericIdentityBound === true)) {
        return { class: 'ARBITRATION_EVIDENCE_LOSS', mechanism: null };
      }
      if (!trace.postCustodyRows.some((row) => row.genericIdentityBound === true)) {
        const gate = trace.postCustodyRows.find((row) => row.evidence?.nodeCustodyGate);
        return gate
          ? { class: 'POST_ARBITRATION_NODE_CUSTODY_GATE', mechanism: gate.evidence?.nodeCustodyGate?.blocker || null }
          : { class: 'POST_ARBITRATION_IDENTITY_LOSS', mechanism: null };
      }
      if (!trace.reviewRows.some((row) => row.identityBound === true)) {
        return { class: 'REVIEW_IDENTITY_GATE', mechanism: null };
      }
      if (!trace.nodeNameDeltas.some((row) => row.changed === true)) {
        return { class: 'ENGINEERING_DELTA_MISSING', mechanism: null };
      }
      if (!trace.combinedTransferOperations.length) {
        return { class: 'TRANSFER_SELECTION_GATE', mechanism: null };
      }
      if (trace.audit.state !== 'BOUND' || !trace.overlay.mutationRecovered) {
        return { class: 'SOURCE_TARGET_AUDIT_JOIN_DEFECT', mechanism: null };
      }
      return { class: 'NO_LOSS_CONTROL_ROW', mechanism: null };
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
      const sourceGraph = adaptCiiDocumentToTopologyGraph(preview.sourceDocument);
      const targetGraph = adaptCiiDocumentToTopologyGraph(preview.targetDocument);
      const loopResults = preview?.multiBaseCorrespondence?.loopResults || preview?.correspondence?.loopResults || [];
      const rawAlignmentRows = loopResults.flatMap((item) => {
        if (item?.loop?.method !== 'METHOD_A_SPATIAL') return [];
        const anchors = (item.loop.anchorPairs || []).map((pair) => ({
          sourceNodeId: String(pair.sourceNodeId),
          targetNodeId: String(pair.targetNodeId),
        }));
        const raw = compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchors, {
          geometryTransform: item.loop.geometry,
        });
        return (raw?.nodeRows || [])
          .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
            && String(row?.targetNodeId || '') === targetNodeId)
          .map(nodeRowSummary);
      });
      const directArbitration = arbitrateCiiLoopCorrespondences(loopResults);
      const arbitrationRows = (directArbitration?.nodeRows || [])
        .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
          && String(row?.targetNodeId || '') === targetNodeId)
        .map(nodeRowSummary);
      const postCustodyRows = (preview?.correspondence?.nodeRows || [])
        .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
          && String(row?.targetNodeId || '') === targetNodeId)
        .map(nodeRowSummary);
      const projectedLoopRows = loopResults.flatMap((item) =>
        (item?.correspondence?.nodeRows || [])
          .filter((row) => String(row?.sourceNodeId || '') === sourceNodeId
            && String(row?.targetNodeId || '') === targetNodeId)
          .map((row) => ({
            loop: loopSummary(item.loop),
            row: nodeRowSummary(row),
          })));
      const correspondenceIds = new Set(postCustodyRows.map((row) => row.correspondenceId).filter(Boolean));
      const gatedSourceElementIds = new Set(postCustodyRows
        .flatMap((row) => row.evidence?.nodeCustodyGate?.sourceElementIds || [])
        .map(String));
      const affectedElementRows = (preview?.correspondence?.elementRows || [])
        .filter((row) => {
          const ids = (row.sourceElementIds || (row.sourceElementId ? [row.sourceElementId] : [])).map(String);
          return ids.some((id) => gatedSourceElementIds.has(id));
        })
        .map(elementRowSummary);
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
        rawAlignmentRows,
        projectedLoopRows,
        arbitrationRows,
        postCustodyRows,
        affectedElementRows,
        reviewRows,
        nodeNameDeltas,
        memberTransferOperations,
        replacementTransferOperations,
        combinedTransferOperations,
      };
      return { ...trace, classification: classify(trace) };
    }

    function traceOverlayRow(overlayRow) {
      const sourceRows = (overlayRow.sourceRowKeys || [])
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

    const missing = (overlay?.rows || []).filter((row) => !row.mutationRecovered);

    // Controls are selected only after production derivation + lower-bound scoring.
    const u4RecoveredTargets = new Set(['8970', '8980', '9030', '9040']);
    const u4Controls = (overlay?.rows || [])
      .filter((row) => row.mutationRecovered && u4RecoveredTargets.has(String(row.nodeId)))
      .map(traceOverlayRow);
    const olderControl = (overlay?.rows || []).find((row) =>
      row.mutationRecovered
      && !u4RecoveredTargets.has(String(row.nodeId))
      && (row.sourceRowKeys || []).some((key) => String(key).startsWith('S2:') || String(key).startsWith('S3:')));

    return {
      schema: 'CIIWriter2S23U6PostU4CausalTrace.v1',
      oracleJoinedAfterProductionDerivation: true,
      automaticChoices: Object.fromEntries(Object.entries(automatic.choices).map(([sourceId, choice]) => [sourceId, {
        status: choice?.status || null,
        reason: choice?.reason || null,
        confidence: choice?.confidence || null,
        basisMethod: choice?.basisMethod || null,
        outcomeSignature: choice?.outcomeSignature || null,
      }])),
      reviewedCounts: Object.fromEntries(Object.entries(reviews).map(([sourceId, review]) => [sourceId, {
        reviewed: review.reviewedCorrespondenceIds?.length || 0,
        locked: review.lockedCorrespondenceIds?.length || 0,
      }])),
      overlaySummary: overlay?.summary || null,
      missing: missing.map(traceOverlayRow),
      controls: {
        u4Recovered: u4Controls,
        olderRecovered: olderControl ? traceOverlayRow(olderControl) : null,
      },
    };
  });

  console.log('S23_U6_POST_U4_CAUSAL_TRACE=' + JSON.stringify(diagnostics));

  expect(diagnostics.oracleJoinedAfterProductionDerivation).toBe(true);
  for (const sourceId of ['S1', 'S2', 'S3']) {
    expect(diagnostics.automaticChoices[sourceId].status).toBe('READY');
    expect(diagnostics.reviewedCounts[sourceId].locked).toBe(0);
  }
  expect(diagnostics.overlaySummary.mutationRecoveredCount).toBe(30);
  expect(diagnostics.missing).toHaveLength(6);
  expect(diagnostics.missing.map((row) => String(row.benchmarkRow.nodeId)).sort())
    .toEqual(['10280', '10290', '8870', '8890', '8920', '8940']);
  expect(diagnostics.controls.u4Recovered).toHaveLength(4);
  expect(diagnostics.controls.olderRecovered).not.toBeNull();
  for (const row of diagnostics.missing) {
    expect(row.traces.length).toBeGreaterThan(0);
    for (const trace of row.traces) {
      expect(trace.classification?.class).toBeTruthy();
      expect(trace.rawAlignmentRows.length).toBeGreaterThan(0);
      expect(trace.projectedLoopRows.length).toBeGreaterThan(0);
    }
  }
});
