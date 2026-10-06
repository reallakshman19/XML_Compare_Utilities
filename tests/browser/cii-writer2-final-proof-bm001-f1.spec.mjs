import { expect, test } from '@playwright/test';

test('F1 diagnoses canonical selected BM-001 raw identity conflicts after semantic 36/36', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      previewModule,
      bmModule,
      authorityModule,
      partialOracle,
      expectedOracle,
      converter,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js'),
      import('/tests/cii-workspace-multisource-partial-texpected-oracle.js'),
      import('/tests/cii-workspace-multisource-texpected-oracle.js'),
      import('/tabs/cii-workspace/cii-workspace-v11-v14-converter.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = previewModule;
    const { ciiCanonicalWriter2MutationSelection } = bmModule;
    const { parseCiiMsBm001 } = authorityModule;
    const { validateRawMutationIdentity, partialExpectedNameMatch } = partialOracle;
    const { parseIndependentNodeNameState, deriveExpectedNodeNameDelta } = expectedOracle;
    const { ciiBytesToByteString } = converter;

    function text(value) { return String(value ?? '').trim(); }
    function unslash(value) { return text(value).replace(/^\//, ''); }
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
          lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
          rejectedCorrespondenceIds: [],
        }];
      }));
    }
    function candidateOperations(plan) {
      const byId = new Map();
      for (const operation of [...(plan?.operations || []), ...(plan?.excludedOperations || [])]) {
        const id = text(operation?.operationId);
        if (id && !byId.has(id)) byId.set(id, operation);
      }
      return byId;
    }
    function opTarget(op) { return text(op?.targetEvidence?.identity || op?.targetEvidence?.nodeId); }
    function opValue(op) { return text(op?.proposed ?? op?.sourceEvidence?.value); }
    function opBefore(op) { return text(op?.before ?? op?.targetEvidence?.value); }
    function bmRowsForAlias(alias, rows) {
      const wanted = unslash(alias);
      return (rows || []).filter((row) => (row.sourceNames || []).some((name) => unslash(name) === wanted));
    }
    function nodesForName(targetState, wanted) {
      const name = text(wanted);
      return [...targetState.names.entries()].filter(([, value]) => text(value) === name).map(([id]) => String(id)).sort((a,b)=>Number(a)-Number(b));
    }
    function rowSummary(row) {
      if (!row) return null;
      return {
        correspondenceId: row.correspondenceId || null,
        sourceId: row.sourceId || null,
        sourceNodeId: row.sourceNodeId == null ? null : String(row.sourceNodeId),
        targetNodeId: row.targetNodeId == null ? null : String(row.targetNodeId),
        status: row.status || null,
        authority: row.authority || null,
        basisMethod: row.basisMethod || null,
        evidenceBasis: row.evidence?.identityEvidenceBasis || null,
        identitySupported: row.evidence?.identitySupported ?? null,
        identityConfidence: row.evidence?.identityConfidence || null,
        boundaryIdentity: row.evidence?.boundaryIdentity || null,
        provenance: row.evidence?.multiBaseProvenance || [],
      };
    }
    function reviewSummary(row) {
      if (!row) return null;
      return {
        correspondenceId: row.correspondenceId,
        sourceId: row.sourceId || null,
        workflowStatus: row.workflowStatus || null,
        confidence: row.confidence || null,
        identityBound: row.identityBound === true,
        evidenceBasis: row.identityEvidenceBasis || null,
        decision: row.decision || null,
        authority: row.authority || null,
        changeFamilies: row.changeFamilies || [],
      };
    }
    function deltaSummary(row) {
      if (!row) return null;
      return {
        deltaId: row.deltaId || null,
        correspondenceId: row.correspondenceId || null,
        sourceId: row.sourceId || null,
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
      };
    }
    function operationSummary(op) {
      return {
        operationId: op.operationId || null,
        sourceId: op.sourceId || null,
        action: op.action || null,
        status: op.status || null,
        targetId: opTarget(op),
        sourceValue: opValue(op),
        targetBefore: opBefore(op),
        engineeringDeltaId: op.engineeringDeltaId || null,
        matchAuthority: op.matchAuthority || null,
        bm001Acceptance: op.bm001Acceptance || null,
        evidenceStatus: op.evidenceStatus || null,
        evidenceAuthority: op.evidenceAuthority || null,
        policyAuthority: op.policyAuthority || null,
        blockers: op.blockers || [],
      };
    }

    // Complete production derivation first.
    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({ sourceId: `S${index + 1}`, fileName, bytes: sourceBytes[index] }));
    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({ sources, targetBytes, targetFileName: 'T.CII' }, {
      cryptoRef: crypto, methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5,
    });
    const automatic = automaticState(inspection);
    const previewInput = (reviewBySourceValue) => ({
      sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef: crypto });
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviewBySource(discovery)), { cryptoRef: crypto });

    const candidates = candidateOperations(reviewed.transferPlan);
    const canonical = ciiCanonicalWriter2MutationSelection([...candidates.values()]);
    const physical = canonical.appliedOperationIds.map((id) => candidates.get(id)).filter(Boolean);
    const sourceTextsById = Object.fromEntries(sources.map((s) => [s.sourceId, ciiBytesToByteString(s.bytes)]));
    const targetText = ciiBytesToByteString(targetBytes);
    const bmRows = parseCiiMsBm001();
    const rawIdentity = validateRawMutationIdentity(physical, sourceTextsById, targetText, bmRows);
    const bmErrors = rawIdentity.errors.filter((error) => error.code === 'COPY_VALUE_NOT_EXACT_BM_ALIAS_FOR_TARGET');
    const errorIds = new Set(bmErrors.map((error) => text(error.operationId)));

    // Oracle joins only after physical selection and BM safety diagnosis exist.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const expectedText = ciiBytesToByteString(expectedBytes);
    const expectedDelta = deriveExpectedNodeNameDelta(targetText, expectedText);
    const expectedByTarget = new Map(expectedDelta.rows.map((row) => [String(row.nodeId), row]));
    const targetState = parseIndependentNodeNameState(targetText);

    const correlationById = new Map((reviewed.correspondence?.nodeRows || []).map((row) => [text(row.correspondenceId), row]));
    const reviewById = new Map((reviewed.compareReview?.rows || []).map((row) => [text(row.correspondenceId), row]));
    const deltaById = new Map((reviewed.engineeringDeltas?.rows || []).map((row) => [text(row.deltaId), row]));
    const groupByApplied = new Map((canonical.corroborationGroups || []).map((group) => [text(group.appliedOperationId), group]));

    function diagnose(op) {
      const alias = opValue(op); const targetId = opTarget(op); const before = opBefore(op);
      const aliasRows = bmRowsForAlias(alias, bmRows);
      const authorityTargets = aliasRows.map((row) => ({
        rowNumber: row.rowNumber,
        sourceNames: row.sourceNames,
        targetName: row.targetName,
        targetNodesInT: nodesForName(targetState, row.targetName),
      }));
      const expected = expectedByTarget.get(targetId) || null;
      const expectedNameMatch = expected ? partialExpectedNameMatch(alias, expected.newValue) : null;
      const correspondenceId = text(op?.matchAuthority?.correspondenceId);
      const corr = correlationById.get(correspondenceId);
      const review = reviewById.get(correspondenceId);
      const delta = deltaById.get(text(op.engineeringDeltaId));
      const group = groupByApplied.get(text(op.operationId)) || null;

      return {
        operation: operationSummary(op),
        rawIdentityError: bmErrors.find((error) => text(error.operationId) === text(op.operationId)) || null,
        correspondence: rowSummary(corr),
        review: reviewSummary(review),
        engineeringDelta: deltaSummary(delta),
        canonical: group ? {
          physicalMutationKey: group.physicalMutationKey,
          appliedOperationId: group.appliedOperationId,
          corroboratingOperationIds: group.corroboratingOperationIds,
          sourceIds: group.sourceIds,
        } : null,
        bmAuthority: {
          sourceAlias: alias,
          aliasRows: authorityTargets,
          selectedTargetCurrentName: before,
          selectedTargetId: targetId,
          selectedTargetMatchesAnyBmTargetName: aliasRows.some((row) => text(row.targetName) === before),
          bmTargetNodesIncludeSelectedTarget: authorityTargets.some((row) => row.targetNodesInT.includes(targetId)),
        },
        lowerBound: expected ? {
          mandatory: true,
          action: expected.action,
          targetId: String(expected.nodeId),
          oldValue: expected.oldValue,
          newValue: expected.newValue,
          selectedSourceMatchesExpectedPostimage: expectedNameMatch,
        } : { mandatory: false },
      };
    }

    const failing = physical.filter((op) => errorIds.has(text(op.operationId))).map(diagnose);

    const passingBmBound = physical.filter((op) => {
      if (errorIds.has(text(op.operationId))) return false;
      const aliasRows = bmRowsForAlias(opValue(op), bmRows);
      return aliasRows.length > 0;
    });
    const mandatoryControl = passingBmBound.find((op) => expectedByTarget.has(opTarget(op))) || null;
    const additionalControl = passingBmBound.find((op) => !expectedByTarget.has(opTarget(op))) || null;

    return {
      schema: 'CIIWriter2FinalProofBm001F1.v1',
      productionDerivedBeforeTExpected: true,
      automatic: Object.fromEntries(Object.entries(automatic.choices).map(([sourceId, choice]) => [sourceId, {
        status: choice.status, confidence: choice.confidence, basisMethod: choice.basisMethod,
        sourceNodeId: choice.sourceNodeId, targetNodeId: choice.targetNodeId, outcomeSignature: choice.outcomeSignature,
      }])),
      canonical: {
        appliedCount: physical.length,
        conflicts: canonical.conflicts,
        duplicateOperationIds: canonical.duplicateOperationIds,
      },
      rawIdentityStatus: rawIdentity.status,
      bmConflictCount: bmErrors.length,
      failing,
      controls: {
        mandatoryBmBoundPass: mandatoryControl ? diagnose(mandatoryControl) : null,
        additionalBmBoundPass: additionalControl ? diagnose(additionalControl) : null,
      },
    };
  });

  console.log('F1_BM001_RAW_IDENTITY_DIAGNOSTIC=' + JSON.stringify(diagnostics));

  expect(diagnostics.productionDerivedBeforeTExpected).toBe(true);
  expect(diagnostics.rawIdentityStatus).toBe('BLOCKED');
  expect(diagnostics.bmConflictCount).toBe(5);
  expect(diagnostics.failing).toHaveLength(5);
  expect(diagnostics.canonical.conflicts).toEqual([]);
  expect(diagnostics.controls.mandatoryBmBoundPass).not.toBeNull();
});
