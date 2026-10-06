import { expect, test } from '@playwright/test';

test('U1 traces current 10 retained lower-bound misses through already-derived production evidence', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      multiPreview,
      auditModule,
      benchmarkModule,
      engineeringModule,
      arbitrationModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-engineering-delta.js'),
      import('/tabs/cii-workspace/cii-workspace-correspondence-arbitration.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = auditModule;
    const {
      deriveCiiNodeNameBenchmarkDeltaFromCii,
      buildCiiSourceTargetBenchmarkOverlay,
    } = benchmarkModule;
    const { ciiIdentityBound, ciiIdentityConfidence } = engineeringModule;
    const { arbitrateCiiLoopCorrespondences } = arbitrationModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`U1_HTTP:${path}:${response.status}`);
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
          lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
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
        leftElement: edgeEvidence(evidence.leftElement),
        rightElement: edgeEvidence(evidence.rightElement),
        multiBaseProvenance: (evidence.multiBaseProvenance || []).map((row) => ({
          loopId: row.loopId || null,
          method: row.method || null,
          baseConfidence: row.baseConfidence || null,
          rowStatus: row.rowStatus || null,
          rowAuthority: row.rowAuthority || null,
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
            winnerGap: item.candidates?.winnerGap ?? null,
            requiredWinnerGap: item.candidates?.requiredWinnerGap ?? null,
            reasons: item.candidates?.reasons || [],
            methodWinners: item.candidates?.methodWinners || null,
          })),
        } : null,
      };
    }
    function nodeSummary(row) {
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
        identityBound: bound,
        identityConfidence: confidence,
        evidence: evidenceSummary(row.evidence),
      };
    }
    function reviewSummary(row) {
      return {
        correspondenceId: row.correspondenceId || null,
        source: row.source == null ? null : String(row.source),
        target: row.target == null ? null : String(row.target),
        workflowStatus: row.workflowStatus || null,
        confidence: row.confidence || null,
        identityBound: row.identityBound === true,
        identityEvidenceBasis: row.identityEvidenceBasis || null,
        authority: row.authority || null,
        decision: row.decision || null,
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
        changed: row.changed === true,
        identityConfidence: row.identityConfidence || null,
        evidenceStatus: row.evidenceStatus || null,
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
        sourceId: operation.sourceId || null,
        action: operation.action || null,
        status: operation.status || null,
        targetIdentity: operationTarget(operation) || null,
        correspondenceId: operation?.matchAuthority?.correspondenceId || null,
        engineeringDeltaId: operation?.engineeringDeltaId || null,
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
        anchorPairs: (loop?.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
      };
    }
    function classify(targetTrace) {
      const members = targetTrace.members || [];
      const raw = members.flatMap((row) => row.rawRows);
      const arbitration = members.flatMap((row) => row.arbitrationRows);
      const canonical = members.flatMap((row) => row.canonicalRows);
      const review = members.flatMap((row) => row.reviewRows);
      const deltas = members.flatMap((row) => row.nodeNameDeltas);
      const transfers = members.flatMap((row) => row.combinedTransferOperations);
      if (!raw.length) return { class: 'CANDIDATE_OR_PROPAGATION_NO_NODE_ROW', mechanism: 'NO_RAW_LOOP_ROW_TARGETS_MANDATORY_NODE' };
      if (!arbitration.length) return { class: 'ARBITRATION', mechanism: 'RAW_ROW_NOT_CANONICALIZED' };
      if (!canonical.length) return { class: 'POST_ARBITRATION', mechanism: 'CANONICAL_ROW_DROPPED_BEFORE_REVIEW' };
      if (!canonical.some((row) => row.identityBound)) {
        const gate = canonical.find((row) => row.evidence?.nodeCustodyGate);
        return gate
          ? { class: 'NODE_CUSTODY', mechanism: gate.evidence.nodeCustodyGate.blocker }
          : { class: 'IDENTITY_CONFIDENCE', mechanism: 'CANONICAL_NODE_NOT_IDENTITY_BOUND' };
      }
      if (!review.some((row) => row.identityBound)) return { class: 'REVIEW_PROJECTION', mechanism: 'BOUND_CANONICAL_ROW_NOT_REVIEW_BOUND' };
      if (!deltas.some((row) => row.changed)) return { class: 'NODE_NAME_DELTA_QUALIFICATION', mechanism: 'NO_CHANGED_NODE_NAME_DELTA' };
      if (!transfers.length) return { class: 'TRANSFER_SELECTION', mechanism: 'NO_COMBINED_TRANSFER_OPERATION' };
      return { class: 'SOURCE_TARGET_AUDIT_JOIN', mechanism: 'DOWNSTREAM_SURFACES_PRESENT_BUT_LOWER_BOUND_INCOMPLETE' };
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

    const input = (reviewBySourceValue = undefined) => ({
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });

    // Production derivation is complete before any lower-bound oracle join.
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(input(), { cryptoRef: crypto });
    const reviews = reviewBySource(discovery);
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(input(reviews), { cryptoRef: crypto });
    const audit = buildCiiSourceTargetAudit(reviewed);

    // Only now join the lower-bound oracle.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII',
      expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII',
      cryptoRef: crypto,
    });
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);

    const auditByKey = new Map((audit.rows || []).map((row) => [row.rowKey, row]));
    const members = reviewed.memberPreviews || [];

    function memberTrace(member, targetNodeId) {
      const preview = member.preview;
      const direct = arbitrateCiiLoopCorrespondences(preview?.correspondence?.loopResults || []);
      const rawRows = (preview?.correspondence?.loopResults || []).flatMap((item) =>
        (item?.correspondence?.nodeRows || [])
          .filter((row) => String(row?.targetNodeId || '') === targetNodeId)
          .map((row) => ({ loop: loopSummary(item.loop), row: nodeSummary(row) })));
      const arbitrationRows = (direct?.nodeRows || [])
        .filter((row) => String(row?.targetNodeId || '') === targetNodeId)
        .map(nodeSummary);
      const canonicalRows = (preview?.correspondence?.nodeRows || [])
        .filter((row) => String(row?.targetNodeId || '') === targetNodeId)
        .map(nodeSummary);
      const reviewRows = (preview?.compareReview?.rows || [])
        .filter((row) => String(row?.target || '') === targetNodeId)
        .map(reviewSummary);
      const nodeNameDeltas = (preview?.engineeringDeltas?.rows || [])
        .filter((row) => row?.category === 'NODE_NAME' && String(row?.targetIdentity || '') === targetNodeId)
        .map(deltaSummary);
      const memberOps = [
        ...(preview?.transferPlan?.operations || []),
        ...(preview?.transferPlan?.excludedOperations || []),
      ].filter((operation) => operationTarget(operation) === targetNodeId).map(operationSummary);
      const replacementOps = [
        ...(member?.replacementPreview?.transferPlan?.operations || []),
        ...(member?.replacementPreview?.transferPlan?.excludedOperations || []),
      ].filter((operation) => operationTarget(operation) === targetNodeId).map(operationSummary);
      const combinedTransferOperations = [
        ...(reviewed?.transferPlan?.operations || []),
        ...(reviewed?.transferPlan?.excludedOperations || []),
      ].filter((operation) => String(operation?.sourceId || '') === member.sourceId
        && operationTarget(operation) === targetNodeId).map(operationSummary);
      return {
        sourceId: member.sourceId,
        rawRows,
        arbitrationRows,
        canonicalRows,
        reviewRows,
        nodeNameDeltas,
        memberOps,
        replacementOps,
        combinedTransferOperations,
      };
    }

    function auditRowsForOverlay(row) {
      const keyed = (row.sourceRowKeys || []).map((key) => auditByKey.get(key)).filter(Boolean);
      const byTarget = (audit.rows || []).filter((item) =>
        String(item.targetNodeId || '') === String(row.nodeId)
        || (item.targetNodeIds || []).map(String).includes(String(row.nodeId)));
      const seen = new Map();
      for (const item of [...keyed, ...byTarget]) seen.set(item.rowKey, item);
      return [...seen.values()].map((item) => ({
        rowKey: item.rowKey,
        sourceId: item.sourceId,
        sourceNodeId: item.sourceNodeId,
        sourceNodeName: item.sourceNodeName,
        state: item.state,
        emitted: item.emitted,
        identityBound: item.identityBound,
        confidence: item.confidence,
        targetNodeIds: item.targetNodeIds || [],
        targetNodeId: item.targetNodeId || null,
        qualifiedNodeNameChange: item.qualifiedNodeNameChange,
        correspondenceIds: item.correspondenceIds || [],
        workflowStatuses: item.workflowStatuses || [],
        authorities: item.authorities || [],
        evidenceBases: item.evidenceBases || [],
        reasons: item.reasons || [],
      }));
    }

    function traceOverlayRow(row) {
      const targetNodeId = String(row.nodeId);
      const trace = {
        lowerBound: {
          nodeId: targetNodeId,
          action: row.action,
          writerAction: row.writerAction,
          status: row.status,
          correspondenceRecovered: row.correspondenceRecovered,
          mutationRecovered: row.mutationRecovered,
          sourceRowKeys: row.sourceRowKeys || [],
          boundSourceRowKeys: row.boundSourceRowKeys || [],
          mutationSourceRowKeys: row.mutationSourceRowKeys || [],
        },
        auditRows: auditRowsForOverlay(row),
        members: members.map((member) => memberTrace(member, targetNodeId)),
      };
      return { ...trace, classification: classify(trace) };
    }

    const missing = (overlay?.rows || []).filter((row) => !row.mutationRecovered);
    const recoveredS2 = (overlay?.rows || []).find((row) => row.mutationRecovered
      && (row.sourceRowKeys || []).some((key) => String(key).startsWith('S2:')));
    const recoveredS3 = (overlay?.rows || []).find((row) => row.mutationRecovered
      && (row.sourceRowKeys || []).some((key) => String(key).startsWith('S3:')));

    return {
      schema: 'CIIWriter2S23U1Trace.v1',
      oracleJoinedAfterProductionDerivation: true,
      automatic: Object.fromEntries(Object.entries(automatic.choices).map(([sourceId, choice]) => [sourceId, {
        status: choice?.status || null,
        reason: choice?.reason || null,
        confidence: choice?.confidence || null,
        basisMethod: choice?.basisMethod || null,
        baseLoops: (choice?.baseLoops || []).map(loopSummary),
      }])),
      reviewCounts: Object.fromEntries(Object.entries(reviews).map(([sourceId, review]) => [sourceId, {
        reviewed: review.reviewedCorrespondenceIds?.length || 0,
        locked: review.lockedCorrespondenceIds?.length || 0,
      }])),
      overlaySummary: overlay?.summary || null,
      missing: missing.map(traceOverlayRow),
      controls: {
        S2: recoveredS2 ? traceOverlayRow(recoveredS2) : null,
        S3: recoveredS3 ? traceOverlayRow(recoveredS3) : null,
      },
    };
  });

  console.log('S23_U1_TRACE=' + JSON.stringify(diagnostics));

  expect(diagnostics.oracleJoinedAfterProductionDerivation).toBe(true);
  expect(diagnostics.automatic.S1.status).toBe('READY');
  expect(diagnostics.automatic.S2.status).toBe('READY');
  expect(diagnostics.automatic.S3.status).toBe('READY');
  expect(diagnostics.reviewCounts.S1.locked).toBe(0);
  expect(diagnostics.reviewCounts.S2.locked).toBe(0);
  expect(diagnostics.reviewCounts.S3.locked).toBe(0);
  expect(diagnostics.overlaySummary.expectedCount).toBe(36);
  expect(diagnostics.overlaySummary.mutationRecoveredCount).toBe(26);
  expect(diagnostics.missing).toHaveLength(10);
  expect(diagnostics.missing.map((row) => row.lowerBound.nodeId).sort()).toEqual(
    ['10280','10290','8870','8890','8920','8940','8970','8980','9030','9040'].sort(),
  );
  expect(diagnostics.controls.S2).not.toBeNull();
  expect(diagnostics.controls.S3).not.toBeNull();
  for (const row of diagnostics.missing) expect(row.classification?.class).toBeTruthy();
});
