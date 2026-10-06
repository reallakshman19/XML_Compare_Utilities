import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('D2 compares authority-safe Method-A local-span strategies', async ({ page }) => {
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
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
      import('/tabs/cii-workspace/cii-workspace-source-target-audit.js'),
      import('/tabs/cii-workspace/cii-workspace-benchmark-overlay.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-topology.js'),
      import('/tabs/cii-workspace/cii-workspace-correspondence-arbitration.js'),
    ]);
    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSetModule;
    const { ciiAutomaticBaseSelection } = baseSelectionModule;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = multiPreviewModule;
    const { buildCiiSourceTargetAudit } = censusModule;
    const { deriveCiiNodeNameBenchmarkDeltaFromCii, buildCiiSourceTargetBenchmarkOverlay } = benchmarkModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyAdapterModule;
    const { compareLockedCiiAnchorSpan } = topologyModule;
    const { arbitrateCiiLoopCorrespondences } = arbitrationModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('D2_HTTP:' + path + ':' + response.status);
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
    function normalizedClaims(correspondence) {
      return (correspondence?.nodeRows || []).flatMap((row) => {
        if (row?.sourceNodeId == null || row?.targetNodeId == null) return [];
        if (['UNRESOLVED', 'CONFLICT'].includes(row.status)) return [];
        return [{ sourceNodeId: String(row.sourceNodeId), targetNodeId: String(row.targetNodeId), status: row.status }];
      });
    }
    function point(graph, id) {
      return (graph?.nodes || []).find((node) => String(node.id) === String(id))?.position || null;
    }
    function distance(left, right) {
      if (!left || !right) return Number.POSITIVE_INFINITY;
      return Math.hypot(Number(left.x) - Number(right.x), Number(left.y) - Number(right.y), Number(left.z) - Number(right.z));
    }
    function pairKey(pair) {
      return pair[0] < pair[1] ? pair[0] + ':' + pair[1] : pair[1] + ':' + pair[0];
    }
    function allPairs(count) {
      const rows = [];
      for (let a = 0; a < count - 1; a += 1) for (let b = a + 1; b < count; b += 1) rows.push([a, b]);
      return rows;
    }
    function mstPairs(anchors, sourceGraph) {
      const candidates = allPairs(anchors.length).map(([a, b]) => ({
        a, b,
        weight: distance(point(sourceGraph, anchors[a].sourceNodeId), point(sourceGraph, anchors[b].sourceNodeId)),
      })).sort((left, right) => left.weight - right.weight || pairKey([left.a, left.b]).localeCompare(pairKey([right.a, right.b]), undefined, { numeric: true }));
      const parent = anchors.map((_, index) => index);
      const root = (index) => {
        let current = index;
        while (parent[current] !== current) current = parent[current];
        while (parent[index] !== index) { const next = parent[index]; parent[index] = current; index = next; }
        return current;
      };
      const rows = [];
      for (const edge of candidates) {
        const left = root(edge.a); const right = root(edge.b);
        if (left === right) continue;
        parent[right] = left; rows.push([edge.a, edge.b]);
        if (rows.length === anchors.length - 1) break;
      }
      return rows;
    }
    function buildStrategy(name, pairs, anchors, sourceGraph, targetGraph, geometry, confidence) {
      const spanResults = pairs.map(([left, right], index) => {
        const anchorPairs = [anchors[left], anchors[right]];
        const correspondence = compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchorPairs, { geometryTransform: geometry });
        return {
          loop: {
            loopId: 'D2_' + name + '_' + index,
            method: 'METHOD_A_SPATIAL',
            status: 'READY',
            confidence,
            anchorPairs,
          },
          correspondence,
        };
      });
      const union = arbitrateCiiLoopCorrespondences(spanResults);
      return {
        name,
        pairIndexes: pairs,
        spanCount: spanResults.length,
        readySpanCount: spanResults.filter((row) => row.correspondence.status === 'READY').length,
        unresolvedSpanCount: spanResults.filter((row) => row.correspondence.status === 'UNRESOLVED').length,
        blockedSpanCount: spanResults.filter((row) => row.correspondence.status === 'BLOCKED').length,
        unionStatus: union.status,
        conflicts: union.conflicts || [],
        claims: normalizedClaims(union),
      };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes('/Benchmark/' + name)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({ sourceId: 'S' + (index + 1), fileName, bytes: sourceBytes[index] }));

    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({ sources, targetBytes, targetFileName: 'T.CII' }, {
      cryptoRef: crypto, methodAPhysicalCandidateLimit: 10, baseAnchorDisplayLimit: 5,
    });
    const automatic = automaticState(inspection);
    if (automatic.choices.S1?.status !== 'READY') throw new Error('D2_S1_NOT_READY');

    const previewInput = (reviews = undefined) => ({
      sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: automatic.loops,
      ...(reviews ? { reviewBySource: reviews } : {}),
    });
    const discovery = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef: crypto });
    const reviewed = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviewBySource(discovery)), { cryptoRef: crypto });
    const audit = buildCiiSourceTargetAudit(reviewed);

    const s1Member = (reviewed.memberPreviews || []).find((row) => row.sourceId === 'S1')?.preview;
    const sourceGraph = adaptCiiDocumentToTopologyGraph(s1Member.sourceDocument);
    const targetGraph = adaptCiiDocumentToTopologyGraph(s1Member.targetDocument);
    const methodALoop = (s1Member.multiBaseAuthority?.loops || []).find((loop) => loop.method === 'METHOD_A_SPATIAL' && loop.status === 'READY');
    const anchors = (automatic.choices.S1.baseLoops?.[0]?.anchorPairs || []).map((row) => ({
      sourceNodeId: String(row.sourceNodeId), targetNodeId: String(row.targetNodeId),
    }));
    const n = anchors.length;
    const strategies = [
      buildStrategy('CURRENT_FIRST_LAST', [[0, n - 1]], anchors, sourceGraph, targetGraph, methodALoop.geometry, automatic.choices.S1.confidence),
      buildStrategy('ANCHOR_ORDER_CHAIN', Array.from({ length: n - 1 }, (_, index) => [index, index + 1]), anchors, sourceGraph, targetGraph, methodALoop.geometry, automatic.choices.S1.confidence),
      buildStrategy('WINNER_STAR', Array.from({ length: n - 1 }, (_, index) => [0, index + 1]), anchors, sourceGraph, targetGraph, methodALoop.geometry, automatic.choices.S1.confidence),
      buildStrategy('SOURCE_DISTANCE_MST', mstPairs(anchors, sourceGraph), anchors, sourceGraph, targetGraph, methodALoop.geometry, automatic.choices.S1.confidence),
      buildStrategy('ALL_PAIRS', allPairs(n), anchors, sourceGraph, targetGraph, methodALoop.geometry, automatic.choices.S1.confidence),
    ];

    // Benchmark joins only after all candidate strategy correspondences exist.
    const expectedBytes = await fetchBytes('/Benchmark/TEXPECTED-PARTIALLLYDONE.CII');
    const benchmark = await deriveCiiNodeNameBenchmarkDeltaFromCii(targetBytes, expectedBytes, {
      beforeFileName: 'T.CII', expectedFileName: 'TEXPECTED-PARTIALLLYDONE.CII', cryptoRef: crypto,
    });
    const overlay = buildCiiSourceTargetBenchmarkOverlay(audit, benchmark);
    const s1Expected = (overlay?.rows || []).filter((row) => (row.sourceRowKeys || []).some((key) => String(key).startsWith('S1:')))
      .map((row) => ({
        targetNodeId: String(row.nodeId),
        sourceNodeIds: (row.sourceRowKeys || []).filter((key) => String(key).startsWith('S1:')).map((key) => String(key).split(':')[1]),
      }));

    const results = strategies.map((strategy) => {
      const supports = s1Expected.filter((expected) => expected.sourceNodeIds.some((sourceNodeId) =>
        strategy.claims.some((claim) => claim.sourceNodeId === sourceNodeId && claim.targetNodeId === expected.targetNodeId)));
      return {
        name: strategy.name,
        pairIndexes: strategy.pairIndexes,
        spanCount: strategy.spanCount,
        readySpanCount: strategy.readySpanCount,
        unresolvedSpanCount: strategy.unresolvedSpanCount,
        blockedSpanCount: strategy.blockedSpanCount,
        unionStatus: strategy.unionStatus,
        conflictCount: strategy.conflicts.length,
        nodeClaimCount: strategy.claims.length,
        s1AttributedIdentityRecovery: supports.length,
        recoveredTargets: supports.map((row) => row.targetNodeId),
      };
    });

    return {
      schema: 'CIIWriter2S1MethodALocalSpanStrategyComparison.v1',
      authority: 'VALIDATION_ONLY_STRATEGY_DESIGN',
      anchorCount: anchors.length,
      anchorPairs: anchors.map((row) => row.sourceNodeId + '=>' + row.targetNodeId),
      results,
    };
  });

  await writeFile('s1-d2-local-span-strategies.json', JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
  console.log('S1_D2_LOCAL_SPAN_STRATEGIES=' + JSON.stringify(diagnostics));

  expect(diagnostics.anchorCount).toBe(10);
  expect(diagnostics.results.find((row) => row.name === 'ALL_PAIRS').s1AttributedIdentityRecovery).toBe(12);
});
