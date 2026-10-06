import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('R2.2 prototypes bridge-resistant coherent components without product mutation', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [converter, intakeModule, topologyModule, bridgeModule, physicalModule, methodAModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-v11-v14-converter.js'),
      import('/tabs/cii-workspace/cii-workspace-intake.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-writer-version-bridge.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-method-a.js'),
    ]);
    const { convertCiiNeutralVersionLossless } = converter;
    const { intakeCiiWorkspaceDocument } = intakeModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyModule;
    const { prepareCiiWorkspaceTargetWithVersionBridge, createCiiWorkspacePreviewWithVersionBridge } = bridgeModule;
    const { uniqueIncidentComponentLengthPairs, _test: physicalTest } = physicalModule;
    const { discoverCiiMethodABases } = methodAModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`R2_2_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function points(graph) {
      return new Map((graph?.nodes || []).map((node) => [String(node.id), node.position]));
    }
    function distance(a, b) {
      if (!a || !b) return null;
      return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y), Number(a.z) - Number(b.z));
    }
    function positive(value) {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? number : null;
    }
    function incidentOd(graph, nodeId) {
      const values = [...(graph?.adjacency?.get(String(nodeId)) || [])]
        .map((edge) => positive(edge?.diameter ?? edge?.od)).filter((value) => value != null);
      return values.length ? Math.min(...values) : null;
    }
    function compatibilityGraph(sourceGraph, targetGraph, pairs) {
      const sourcePositions = points(sourceGraph); const targetPositions = points(targetGraph);
      const adjacency = pairs.map(() => new Set()); let edgeCount = 0;
      for (let i = 0; i < pairs.length - 1; i += 1) for (let j = i + 1; j < pairs.length; j += 1) {
        const left = pairs[i]; const right = pairs[j];
        const sourceDistance = distance(sourcePositions.get(String(left.sourceNodeId)), sourcePositions.get(String(right.sourceNodeId)));
        const targetDistance = distance(targetPositions.get(String(left.targetNodeId)), targetPositions.get(String(right.targetNodeId)));
        const absoluteDelta = Math.abs(sourceDistance - targetDistance);
        const relativeError = absoluteDelta / Math.max(sourceDistance, targetDistance, 1e-9);
        const odValues = [incidentOd(sourceGraph, left.sourceNodeId), incidentOd(sourceGraph, right.sourceNodeId)]
          .filter((value) => value != null);
        const odRef = odValues.length ? Math.min(...odValues) : null;
        const odNormalized = odRef == null ? null : absoluteDelta / odRef;
        const compatible = relativeError <= 0.001 && (odNormalized == null || odNormalized <= 0.1);
        if (!compatible) continue;
        adjacency[i].add(j); adjacency[j].add(i); edgeCount += 1;
      }
      return { adjacency, edgeCount };
    }
    function triangleSupported(adjacency) {
      const result = adjacency.map(() => new Set()); let retainedEdges = 0;
      for (let i = 0; i < adjacency.length - 1; i += 1) for (const j of adjacency[i]) {
        if (j <= i) continue;
        const supported = [...adjacency[i]].some((k) => k !== j && adjacency[j].has(k));
        if (!supported) continue;
        result[i].add(j); result[j].add(i); retainedEdges += 1;
      }
      return { adjacency: result, retainedEdges };
    }
    function components(adjacency, pairs) {
      const active = new Set(adjacency.flatMap((set, index) => set.size ? [index] : []));
      const rows = [];
      while (active.size) {
        const root = active.values().next().value; active.delete(root);
        const stack = [root]; const component = [];
        while (stack.length) {
          const current = stack.pop(); component.push(current);
          for (const next of adjacency[current]) if (active.delete(next)) stack.push(next);
        }
        if (component.length >= 3) rows.push(component.sort((a, b) => a - b));
      }
      function edgeCount(component) {
        const set = new Set(component); let count = 0;
        for (const i of component) for (const j of adjacency[i]) if (j > i && set.has(j)) count += 1;
        return count;
      }
      rows.sort((left, right) => right.length - left.length
        || edgeCount(right) - edgeCount(left)
        || left.map((index) => `${pairs[index].sourceNodeId}=>${pairs[index].targetNodeId}`).join('|')
          .localeCompare(right.map((index) => `${pairs[index].sourceNodeId}=>${pairs[index].targetNodeId}`).join('|'), undefined, { numeric: true }));
      return rows;
    }
    function choose(component, count, seed, sourceGraph, targetGraph, pairs) {
      return physicalTest.fillBySpread(sourceGraph, targetGraph, component.map((index) => pairs[index]), count, seed);
    }
    function allocation(label, primaryCount, secondaryCount, componentsValue, sourceGraph, targetGraph, pairs) {
      const primary = choose(componentsValue[0], Math.min(primaryCount, componentsValue[0].length), [], sourceGraph, targetGraph, pairs);
      const secondary = componentsValue[1] && secondaryCount
        ? choose(componentsValue[1], Math.min(secondaryCount, componentsValue[1].length), primary, sourceGraph, targetGraph, pairs)
        : [];
      const selected = [...primary, ...secondary];
      return { label, selected, keys: selected.map((pair) => `${pair.sourceNodeId}=>${pair.targetNodeId}`) };
    }
    function baseSummary(discovery) {
      return {
        status: discovery.status,
        candidatePairCount: discovery.candidatePairCount,
        qualifiedBaseCount: discovery.qualifiedBaseCount,
        bases: (discovery.bases || []).map((base) => ({
          baseId: base.baseId,
          confidence: base.confidence,
          anchorCount: base.anchorCount,
          validationAnchorCount: base.validationAnchorCount,
          maxResidualMm: base.maxResidualMm,
          maxNormalizedResidual: base.maxNormalizedResidual,
          weight: base.weight?.total ?? null,
          anchorPairs: base.anchorPairs.map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
        })),
      };
    }
    function syntheticAdjacency(size, edges) {
      const adjacency = Array.from({ length: size }, () => new Set());
      for (const [a, b] of edges) { adjacency[a].add(b); adjacency[b].add(a); }
      return adjacency;
    }
    function clique(start, count) {
      const edges = [];
      for (let i = start; i < start + count - 1; i += 1) for (let j = i + 1; j < start + count; j += 1) edges.push([i, j]);
      return edges;
    }
    function syntheticComponentSizes(adjacency) {
      const fakePairs = adjacency.map((_, index) => ({ sourceNodeId: String(index), targetNodeId: String(index) }));
      return components(adjacency, fakePairs).map((row) => row.length);
    }

    const sourceBytes = await fetchBytes('/Benchmark/S1.CII');
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sourceV11 = await convertCiiNeutralVersionLossless(sourceBytes, 11, { fileName: 'S1.CII', cryptoRef: crypto });
    const sourceDocument = await intakeCiiWorkspaceDocument(sourceV11.outputBytes, 'S1.CII', { side: 'SOURCE', cryptoRef: crypto });
    const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);
    const preparedTarget = await prepareCiiWorkspaceTargetWithVersionBridge(targetBytes, 'T.CII', { writerVersion: '2', cryptoRef: crypto });
    const targetGraph = preparedTarget.targetGraph;
    const rawPairs = [...uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph)];

    const graphStarted = performance.now();
    const compatible = compatibilityGraph(sourceGraph, targetGraph, rawPairs);
    const triangle = triangleSupported(compatible.adjacency);
    const coherentComponents = components(triangle.adjacency, rawPairs);
    const graphElapsedMs = performance.now() - graphStarted;

    const allocations = [
      allocation('PRIMARY_10', 10, 0, coherentComponents, sourceGraph, targetGraph, rawPairs),
      allocation('PRIMARY_7_SECONDARY_3', 7, 3, coherentComponents, sourceGraph, targetGraph, rawPairs),
      allocation('PRIMARY_6_SECONDARY_4', 6, 4, coherentComponents, sourceGraph, targetGraph, rawPairs),
      allocation('PRIMARY_5_SECONDARY_5', 5, 5, coherentComponents, sourceGraph, targetGraph, rawPairs),
    ];
    const methodA = {}; const discoveries = {};
    for (const item of allocations) {
      const started = performance.now();
      const discovery = discoverCiiMethodABases(sourceGraph, targetGraph, item.selected, {
        methodASeedPairLimit: item.selected.length,
        methodAExpansionPairLimit: item.selected.length,
      });
      discoveries[item.label] = discovery;
      methodA[item.label] = { elapsedMs: Number((performance.now() - started).toFixed(3)), ...baseSummary(discovery) };
    }

    function reviewSummary(preview) {
      const rows = preview?.compareReview?.rows || [];
      return {
        correspondenceStatus: preview?.correspondence?.status || 'UNKNOWN',
        primaryRows: rows.filter((row) => row.kind !== 'COMPONENT').length,
        identityBound: rows.filter((row) => row.kind !== 'COMPONENT' && row.identityBound).length,
        highMediumBound: rows.filter((row) => row.kind !== 'COMPONENT' && row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).length,
        unresolved: rows.filter((row) => row.kind !== 'COMPONENT' && !row.identityBound).length,
        qualifiedChanges: rows.filter((row) => row.kind !== 'COMPONENT' && row.identityBound && row.changeCount > 0).length,
        confidence: preview?.compareReview?.summary?.correspondence?.confidence || null,
      };
    }
    async function downstreamFor(label) {
      const base = discoveries[label]?.bases?.[0];
      if (!base) return { available: false };
      const baseLoops = [{
        baseId: `R2_2_${label}`,
        method: 'METHOD_A_SPATIAL',
        anchorPairs: base.anchorPairs.map((row) => ({ sourceNodeId: row.sourceNodeId, targetNodeId: row.targetNodeId })),
      }];
      const input = { sourceBytes, targetBytes, sourceFileName: 'S1.CII', targetFileName: 'T.CII', baseLoops };
      const discoveryPreview = await createCiiWorkspacePreviewWithVersionBridge(input, { writerVersion: '2', cryptoRef: crypto });
      const accepted = (discoveryPreview?.compareReview?.rows || [])
        .filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence))
        .map((row) => row.correspondenceId);
      const reviewedPreview = await createCiiWorkspacePreviewWithVersionBridge({
        ...input,
        review: {
          reviewedCorrespondenceIds: accepted,
          lockedCorrespondenceIds: [],
          rejectedCorrespondenceIds: [],
        },
      }, { writerVersion: '2', cryptoRef: crypto });
      return {
        available: true,
        base: baseSummary({ status: 'READY', candidatePairCount: base.anchorPairs.length, qualifiedBaseCount: 1, bases: [base] }).bases[0],
        discovery: reviewSummary(discoveryPreview),
        reviewed: reviewSummary(reviewedPreview),
        reviewedOperationCount: reviewedPreview?.transferPlan?.operations?.length || 0,
        reviewedTransferStatus: reviewedPreview?.transferPlan?.status || 'UNKNOWN',
      };
    }
    const downstream = {
      PRIMARY_10: await downstreamFor('PRIMARY_10'),
      PRIMARY_7_SECONDARY_3: await downstreamFor('PRIMARY_7_SECONDARY_3'),
    };

    const bridgeEdges = [...clique(0, 6), ...clique(6, 5), [5, 6]];
    const bridgeBase = syntheticAdjacency(11, bridgeEdges);
    const bridgeTri = triangleSupported(bridgeBase).adjacency;
    const chainBase = syntheticAdjacency(6, [[0,1],[1,2],[2,3],[3,4],[4,5]]);
    const triangleBase = syntheticAdjacency(3, [[0,1],[1,2],[0,2]]);

    return {
      schema: 'CIIWriter2S1R22DesignPrototype.v1',
      authority: 'VALIDATION_ONLY_CANDIDATE_PRESELECTION_DESIGN',
      thresholds: { relativeErrorMax: 0.001, sourceOdNormalizedMaxWhenAvailable: 0.1 },
      rawPhysicalPairCount: rawPairs.length,
      compatibilityEdgeCount: compatible.edgeCount,
      triangleSupportedEdgeCount: triangle.retainedEdges,
      coherentComponents: coherentComponents.map((component) => component.map((index) => `${rawPairs[index].sourceNodeId}=>${rawPairs[index].targetNodeId}`)),
      graphElapsedMs: Number(graphElapsedMs.toFixed(3)),
      allocations: Object.fromEntries(allocations.map((item) => [item.label, item.keys])),
      methodA,
      downstream,
      synthetic: {
        bridgeCliqueComponentSizes: syntheticComponentSizes(bridgeTri),
        sparseChainComponentSizes: syntheticComponentSizes(triangleSupported(chainBase).adjacency),
        minimumTriangleComponentSizes: syntheticComponentSizes(triangleSupported(triangleBase).adjacency),
      },
      limitations: [
        'PAIRWISE_DISTANCE_COHERENCE_CANNOT_DISTINGUISH_PROPER_ROTATION_FROM_MIRROR_REFLECTION',
        'COLLINEAR_DISTANCE_COHERENCE_REMAINS_CANDIDATE_ONLY_AND_MUST_BE_REJECTED_OR_CAPPED_BY_METHOD_A',
      ],
    };
  });

  await writeFile('s1-r2-2-design-prototype.json', JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
  console.log('S1_R2_2_DESIGN=' + JSON.stringify(diagnostics));

  expect(diagnostics.rawPhysicalPairCount).toBe(23);
  expect(diagnostics.coherentComponents.map((row) => row.length)).toEqual([16, 5]);
  expect(diagnostics.synthetic.bridgeCliqueComponentSizes).toEqual([6, 5]);
  expect(diagnostics.synthetic.sparseChainComponentSizes).toEqual([]);
  expect(diagnostics.synthetic.minimumTriangleComponentSizes).toEqual([3]);
  expect(diagnostics.methodA.PRIMARY_7_SECONDARY_3.status).toBe('READY');
  expect(diagnostics.downstream.PRIMARY_10.available).toBe(true);
  expect(diagnostics.downstream.PRIMARY_10.reviewed.identityBound)
    .toBeGreaterThan(diagnostics.downstream.PRIMARY_7_SECONDARY_3.reviewed.identityBound);
});
