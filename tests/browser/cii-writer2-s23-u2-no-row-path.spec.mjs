import { expect, test } from '@playwright/test';

test('U2 classifies no-row mandatory targets against selected Method-A path coverage', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [
      sourceSet,
      baseSelection,
      multiPreview,
      auditModule,
      benchmarkModule,
      targetBridge,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-writer-version-bridge.js'),
    ]);

    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreview;
    const { buildCiiSourceTargetAudit } = auditModule;
    const { deriveCiiNodeNameBenchmarkDeltaFromCii, buildCiiSourceTargetBenchmarkOverlay } = benchmarkModule;
    const { prepareCiiWorkspaceTargetWithVersionBridge } = targetBridge;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`U2_HTTP:${path}:${response.status}`);
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
    function targetPathNodes(path) {
      if (!path) return [];
      return [String(path.startNode || ''), ...(path.elements || []).map((edge) => String(edge.routeTo || ''))].filter(Boolean);
    }
    function targetPathElementIds(path) {
      return (path?.elements || []).map((edge) => String(edge.elementId || '')).filter(Boolean);
    }
    function alignmentNeighborhood(correspondence, targetNodeId) {
      const operations = correspondence?.alignment?.operations || [];
      const rows = [];
      for (let index = 0; index < operations.length; index += 1) {
        const op = operations[index];
        const targetEdgeId = String(op?.targetElementId || '');
        const edge = (correspondence?.targetPath?.elements || []).find((item) => String(item.elementId) === targetEdgeId);
        if (!edge) continue;
        if (String(edge.routeFrom) === targetNodeId || String(edge.routeTo) === targetNodeId) {
          rows.push({ index, op: op.op, sourceElementId: op.sourceElementId || null, targetElementId: targetEdgeId,
            routeFrom: String(edge.routeFrom), routeTo: String(edge.routeTo) });
        }
      }
      return rows;
    }
    function pathTrace(loopResult, targetNodeId, targetGraph) {
      const corr = loopResult?.correspondence || {};
      const path = corr.targetPath;
      const pathNodes = targetPathNodes(path);
      const pathElements = new Set(targetPathElementIds(path));
      const targetExists = targetGraph?.adjacency?.has(targetNodeId) || false;
      const incident = [...(targetGraph?.adjacency?.get(targetNodeId) || [])]
        .map((edge) => String(edge.elementId))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const incidentOnPath = incident.filter((id) => pathElements.has(id));
      const rawNodeRows = (corr.nodeRows || []).filter((row) => String(row?.targetNodeId || '') === targetNodeId)
        .map((row) => ({ sourceNodeId: row.sourceNodeId == null ? null : String(row.sourceNodeId),
          status: row.status || null, authority: row.authority || null }));
      return {
        loop: {
          loopId: loopResult?.loop?.loopId || null,
          baseId: loopResult?.loop?.baseId || null,
          method: loopResult?.loop?.method || null,
          status: loopResult?.loop?.status || null,
          confidence: loopResult?.loop?.confidence || null,
          anchorPairs: (loopResult?.loop?.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
        },
        correspondenceStatus: corr.status || null,
        blockers: corr.blockers || [],
        targetPath: path ? {
          startNode: String(path.startNode || ''),
          endNode: String(path.endNode || ''),
          nodeCount: pathNodes.length,
          elementCount: path?.elements?.length || 0,
          containsTargetNode: pathNodes.includes(targetNodeId),
          incidentTargetElementIds: incident,
          incidentOnPath,
          alignmentNeighborhood: alignmentNeighborhood(corr, targetNodeId),
        } : null,
        targetExists,
        rawNodeRows,
      };
    }
    function classifyMemberPath(trace) {
      if (!trace.targetExists) return 'TARGET_NODE_NOT_IN_TARGET_GRAPH';
      if (!trace.targetPath) return 'NO_METHOD_A_TARGET_PATH';
      if (!trace.targetPath.containsTargetNode) return 'TARGET_OUTSIDE_SELECTED_SINGLE_SPAN';
      if (!trace.rawNodeRows.length) {
        const ops = trace.targetPath.alignmentNeighborhood;
        if (ops.length < 2) return 'ON_PATH_NOT_TWO_MATCH_BOUNDARY';
        const matches = ops.filter((row) => row.op === 'MATCH');
        return matches.length >= 2 ? 'ON_PATH_TWO_MATCHES_BUT_NO_NODE_ROW' : 'ON_PATH_ALIGNMENT_NONMATCH_BOUNDARY';
      }
      return 'RAW_NODE_ROW_PRESENT';
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: `S${index + 1}`, fileName, bytes: sourceBytes[index],
    }));

    const preparedTarget = await prepareCiiWorkspaceTargetWithVersionBridge(targetBytes, 'T.CII', {
      writerVersion: '2', cryptoRef: crypto,
    });
    const targetGraph = preparedTarget.targetGraph;

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes, targetFileName: 'T.CII',
    }, {
      cryptoRef: crypto,
      methodAPhysicalCandidateLimit: 10,
      baseAnchorDisplayLimit: 5,
    });
    const automatic = automaticState(inspection);
    const input = (reviewBySourceValue = undefined) => ({
      sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: automatic.loops,
      ...(reviewBySourceValue ? { reviewBySource: reviewBySourceValue } : {}),
    });

    // Derive production state first.
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(input(), { cryptoRef: crypto });
    const reviews = reviewBySource(discovery);
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(input(reviews), { cryptoRef: crypto });
    const audit = buildCiiSourceTargetAudit(reviewed);

    // Oracle joins after production derivation.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII', expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII', cryptoRef: crypto,
    });
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
    const missing = (overlay.rows || []).filter((row) => !row.mutationRecovered && row.status === 'MISSING');

    function targetTrace(row) {
      const targetNodeId = String(row.nodeId);
      const memberTraces = (reviewed.memberPreviews || []).map((member) => ({
        sourceId: member.sourceId,
        loopPaths: (member.preview?.correspondence?.loopResults || []).map((loopResult) => {
          const trace = pathTrace(loopResult, targetNodeId, targetGraph);
          return { ...trace, pathClassification: classifyMemberPath(trace) };
        }),
      }));
      return {
        nodeId: targetNodeId,
        action: row.action,
        status: row.status,
        sourceRowKeys: row.sourceRowKeys || [],
        targetExists: targetGraph.adjacency.has(targetNodeId),
        targetIncidentElementIds: [...(targetGraph.adjacency.get(targetNodeId) || [])]
          .map((edge) => String(edge.elementId)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        members: memberTraces,
      };
    }

    return {
      schema: 'CIIWriter2S23U2NoRowPathTrace.v1',
      oracleJoinedAfterProductionDerivation: true,
      automatic: Object.fromEntries(Object.entries(automatic.choices).map(([sourceId, choice]) => [sourceId, {
        status: choice?.status || null,
        confidence: choice?.confidence || null,
        basisMethod: choice?.basisMethod || null,
        baseLoops: (choice?.baseLoops || []).map((loop) => ({
          method: loop.method, baseId: loop.baseId,
          anchorPairs: (loop.anchorPairs || []).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
        })),
      }])),
      noRowTargets: missing.map(targetTrace),
    };
  });

  console.log('S23_U2_NO_ROW_PATH_TRACE=' + JSON.stringify(diagnostics));

  expect(diagnostics.oracleJoinedAfterProductionDerivation).toBe(true);
  expect(diagnostics.noRowTargets.map((row) => row.nodeId).sort()).toEqual(['10280', '8870', '8920'].sort());
  for (const target of diagnostics.noRowTargets) {
    expect(target.targetExists).toBe(true);
    expect(target.members.length).toBe(3);
  }
});
