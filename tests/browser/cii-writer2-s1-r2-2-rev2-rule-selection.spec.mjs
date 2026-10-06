import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('R2.2 rev2 selects one unique bridge-pruned complete candidate component', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const result = await page.evaluate(async () => {
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
      if (!response.ok) throw new Error(`R2_2_REV2_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function pointMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node.position])); }
    function distance(left, right) {
      if (!left || !right) return null;
      const values = [left.x, left.y, left.z, right.x, right.y, right.z].map(Number);
      if (!values.every(Number.isFinite)) return null;
      return Math.hypot(values[0] - values[3], values[1] - values[4], values[2] - values[5]);
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
    function strictCompatible(sourceGraph, sourcePositions, targetPositions, left, right) {
      if (String(left.sourceNodeId) === String(right.sourceNodeId) || String(left.targetNodeId) === String(right.targetNodeId)) return false;
      const sourceDistance = distance(sourcePositions.get(String(left.sourceNodeId)), sourcePositions.get(String(right.sourceNodeId)));
      const targetDistance = distance(targetPositions.get(String(left.targetNodeId)), targetPositions.get(String(right.targetNodeId)));
      const ods = [incidentOd(sourceGraph, left.sourceNodeId), incidentOd(sourceGraph, right.sourceNodeId)]
        .filter((value) => value != null);
      if (sourceDistance == null || targetDistance == null || !ods.length) return false;
      const delta = Math.abs(sourceDistance - targetDistance);
      const relativeError = delta / Math.max(sourceDistance, targetDistance, 1e-9);
      const odNormalized = delta / Math.min(...ods);
      return relativeError <= 0.001 && odNormalized <= 0.1;
    }
    function compatibilityGraph(sourceGraph, targetGraph, pairs) {
      const sourcePositions = pointMap(sourceGraph); const targetPositions = pointMap(targetGraph);
      const adjacency = pairs.map(() => new Set());
      for (let i = 0; i < pairs.length - 1; i += 1) for (let j = i + 1; j < pairs.length; j += 1) {
        if (!strictCompatible(sourceGraph, sourcePositions, targetPositions, pairs[i], pairs[j])) continue;
        adjacency[i].add(j); adjacency[j].add(i);
      }
      return adjacency;
    }
    function bridgeSet(adjacency) {
      const discovered = Array(adjacency.length).fill(-1); const low = Array(adjacency.length).fill(-1);
      const bridges = new Set(); let time = 0;
      function key(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
      function visit(node, parent) {
        discovered[node] = low[node] = time++;
        for (const next of [...adjacency[node]].sort((a, b) => a - b)) {
          if (discovered[next] < 0) {
            visit(next, node); low[node] = Math.min(low[node], low[next]);
            if (low[next] > discovered[node]) bridges.add(key(node, next));
          } else if (next !== parent) low[node] = Math.min(low[node], discovered[next]);
        }
      }
      for (let node = 0; node < adjacency.length; node += 1) if (discovered[node] < 0) visit(node, -1);
      return bridges;
    }
    function removeBridges(adjacency) {
      const bridges = bridgeSet(adjacency);
      return adjacency.map((items, node) => new Set([...items].filter((next) => !bridges.has(node < next ? `${node}:${next}` : `${next}:${node}`))));
    }
    function components(adjacency) {
      const unseen = new Set(Array.from({ length: adjacency.length }, (_, index) => index)); const result = [];
      while (unseen.size) {
        const root = unseen.values().next().value; unseen.delete(root);
        const queue = [root]; const rows = [];
        while (queue.length) {
          const node = queue.shift(); rows.push(node);
          for (const next of adjacency[node]) if (unseen.delete(next)) queue.push(next);
        }
        result.push(rows.sort((a, b) => a - b));
      }
      return result;
    }
    function internalEdgeCount(component, adjacency) {
      const members = new Set(component); let edges = 0;
      for (const node of component) for (const next of adjacency[node]) if (next > node && members.has(next)) edges += 1;
      return edges;
    }
    function completeComponents(adjacency) {
      return components(adjacency).filter((component) => {
        if (component.length < 3) return false;
        return internalEdgeCount(component, adjacency) === component.length * (component.length - 1) / 2;
      }).map((component) => ({ indexes: component, edges: internalEdgeCount(component, adjacency) }))
        .sort((a, b) => b.indexes.length - a.indexes.length || b.edges - a.edges);
    }
    function strongest(adjacency) {
      const candidates = completeComponents(removeBridges(adjacency));
      if (!candidates.length) return { status: 'NONE', component: null, candidates };
      const first = candidates[0]; const second = candidates[1];
      if (second && second.indexes.length === first.indexes.length && second.edges === first.edges) {
        return { status: 'AMBIGUOUS', component: null, candidates };
      }
      return { status: 'READY', component: first, candidates };
    }
    function selectRetained(sourceGraph, targetGraph, pairs, limit) {
      const selectedComponent = strongest(compatibilityGraph(sourceGraph, targetGraph, pairs));
      if (selectedComponent.status !== 'READY') return { ...selectedComponent, selected: [] };
      const rows = selectedComponent.component.indexes.map((index) => pairs[index]);
      return {
        ...selectedComponent,
        selected: physicalTest.fillBySpread(sourceGraph, targetGraph, rows, Math.min(limit, rows.length), []),
      };
    }
    function baseSummary(discovery) {
      const base = discovery?.bases?.[0];
      return base ? {
        status: discovery.status, confidence: base.confidence, anchorCount: base.anchorCount,
        maxResidualMm: base.maxResidualMm, maxNormalizedResidual: base.maxNormalizedResidual,
        weight: base.weight?.total ?? null,
        anchorPairs: base.anchorPairs.map((pair) => `${pair.sourceNodeId}=>${pair.targetNodeId}`),
      } : { status: discovery?.status || 'UNAVAILABLE', confidence: null, anchorCount: 0 };
    }
    function reviewSummary(preview) {
      const rows = (preview?.compareReview?.rows || []).filter((row) => row.kind !== 'COMPONENT');
      return {
        correspondenceStatus: preview?.correspondence?.status || 'UNKNOWN',
        total: rows.length,
        identityBound: rows.filter((row) => row.identityBound).length,
        highMediumBound: rows.filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).length,
        qualifiedChanges: rows.filter((row) => row.identityBound && row.changeCount > 0).length,
      };
    }
    function graphFromPoints(points, od = 100) {
      const nodes = Object.entries(points).map(([id, position]) => ({ id: String(id), position }));
      const adjacency = new Map(nodes.map((node) => [node.id, [{
        from: node.id, to: `stub-${node.id}`, componentKind: 'PIPE', diameter: od, lengthMm: 100,
      }]]));
      return { nodes, adjacency, edges: [] };
    }
    function pairRows(count) {
      return Array.from({ length: count }, (_, index) => ({
        sourceNodeId: String(index + 1), targetNodeId: String(index + 101),
        score: 100, winnerGap: 0, sourceRank: 1, targetRank: 1, mutualBest: true,
      }));
    }
    function adjacency(size, edges) {
      const rows = Array.from({ length: size }, () => new Set());
      for (const [a, b] of edges) { rows[a].add(b); rows[b].add(a); }
      return rows;
    }
    function clique(start, count) {
      const rows = [];
      for (let a = start; a < start + count - 1; a += 1) for (let b = a + 1; b < start + count; b += 1) rows.push([a, b]);
      return rows;
    }
    function statusFor(size, edges) {
      const picked = strongest(adjacency(size, edges));
      return { status: picked.status, sizes: picked.candidates.map((row) => row.indexes.length) };
    }

    const sourceBytes = await fetchBytes('/Benchmark/S1.CII'); const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sourceV11 = await convertCiiNeutralVersionLossless(sourceBytes, 11, { fileName: 'S1.CII', cryptoRef: crypto });
    const sourceDocument = await intakeCiiWorkspaceDocument(sourceV11.outputBytes, 'S1.CII', { side: 'SOURCE', cryptoRef: crypto });
    const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);
    const preparedTarget = await prepareCiiWorkspaceTargetWithVersionBridge(targetBytes, 'T.CII', { writerVersion: '2', cryptoRef: crypto });
    const targetGraph = preparedTarget.targetGraph;
    const rawPairs = [...uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph)];

    const selectionStarted = performance.now();
    const retained = selectRetained(sourceGraph, targetGraph, rawPairs, 10);
    const selectionElapsedMs = performance.now() - selectionStarted;
    const discoveryStarted = performance.now();
    const discovery = discoverCiiMethodABases(sourceGraph, targetGraph, retained.selected, {
      methodASeedPairLimit: retained.selected.length, methodAExpansionPairLimit: retained.selected.length,
    });
    const methodAElapsedMs = performance.now() - discoveryStarted;
    const base = discovery?.bases?.[0];
    let downstream = null;
    if (base) {
      const baseLoops = [{
        baseId: 'R2_2_REV2_PRIMARY',
        method: 'METHOD_A_SPATIAL',
        anchorPairs: base.anchorPairs.map((row) => ({ sourceNodeId: row.sourceNodeId, targetNodeId: row.targetNodeId })),
      }];
      const preview = await createCiiWorkspacePreviewWithVersionBridge({
        sourceBytes, targetBytes, sourceFileName: 'S1.CII', targetFileName: 'T.CII', baseLoops,
      }, { writerVersion: '2', cryptoRef: crypto });
      downstream = reviewSummary(preview);
    }

    const collinearSource = graphFromPoints({ 1:{x:0,y:0,z:0},2:{x:100,y:0,z:0},3:{x:200,y:0,z:0},4:{x:300,y:0,z:0} });
    const collinearTarget = graphFromPoints({ 101:{x:500,y:0,z:0},102:{x:600,y:0,z:0},103:{x:700,y:0,z:0},104:{x:800,y:0,z:0} });
    const collinearDiscovery = discoverCiiMethodABases(collinearSource, collinearTarget, pairRows(4), { methodASeedPairLimit:4, methodAExpansionPairLimit:4 });

    const mirrorSource = graphFromPoints({ 1:{x:0,y:0,z:0},2:{x:100,y:0,z:0},3:{x:0,y:100,z:0},4:{x:0,y:0,z:100} });
    const mirrorTarget = graphFromPoints({ 101:{x:500,y:0,z:0},102:{x:400,y:0,z:0},103:{x:500,y:100,z:0},104:{x:500,y:0,z:100} });
    const mirrorDiscovery = discoverCiiMethodABases(mirrorSource, mirrorTarget, pairRows(4), { methodASeedPairLimit:4, methodAExpansionPairLimit:4 });

    const equalCliques = statusFor(8, [...clique(0,4), ...clique(4,4)]);
    const bridgeCliques = statusFor(11, [...clique(0,6), ...clique(6,5), [5,6]]);
    const sparseChain = statusFor(6, [[0,1],[1,2],[2,3],[3,4],[4,5]]);
    const cycle = statusFor(4, [[0,1],[1,2],[2,3],[3,0]]);
    const triangle = statusFor(3, [[0,1],[1,2],[0,2]]);

    const missingOdSource = graphFromPoints({ 1:{x:0,y:0,z:0},2:{x:100,y:0,z:0} }, 0);
    const missingOdTarget = graphFromPoints({ 101:{x:500,y:0,z:0},102:{x:600,y:0,z:0} }, 0);
    const missingOdCompatible = strictCompatible(
      missingOdSource, pointMap(missingOdSource), pointMap(missingOdTarget), pairRows(2)[0], pairRows(2)[1]);

    return {
      schema: 'CIIWriter2S1R22Rev2RuleSelection.v1',
      authority: 'VALIDATION_ONLY_NO_TEXPECTED_NO_MANUAL_LABELS',
      rule: {
        relativeErrorMax: 0.001, sourceOdNormalizedMax: 0.1,
        graph: 'REMOVE_BRIDGES_THEN_COMPLETE_COMPONENTS_SIZE_GTE_3',
        winner: 'UNIQUE_MAX_CARDINALITY_THEN_EDGE_COUNT',
        pool: 'ONLY_WINNING_COMPONENT_NO_CROSS_COMPONENT_FILL',
      },
      retained: {
        rawCount: rawPairs.length,
        status: retained.status,
        componentSizes: retained.candidates.map((row) => row.indexes.length),
        selectedKeys: retained.selected.map((pair) => `${pair.sourceNodeId}=>${pair.targetNodeId}`),
        selectionElapsedMs: Number(selectionElapsedMs.toFixed(3)),
        methodAElapsedMs: Number(methodAElapsedMs.toFixed(3)),
        methodA: baseSummary(discovery),
        downstream,
      },
      synthetic: {
        equalCliques, bridgeCliques, sparseChain, cycle, triangle,
        collinear: baseSummary(collinearDiscovery),
        mirror: baseSummary(mirrorDiscovery),
        missingOdCompatible,
      },
    };
  });

  await writeFile('s1-r2-2-rev2-rule-selection.json', JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log('S1_R2_2_REV2_RULE=' + JSON.stringify(result));

  expect(result.retained.status).toBe('READY');
  expect(result.retained.componentSizes).toEqual([16, 5]);
  expect(result.retained.selectedKeys).toHaveLength(10);
  expect(result.retained.methodA.status).toBe('READY');
  expect(['HIGH', 'MEDIUM']).toContain(result.retained.methodA.confidence);
  expect(result.retained.downstream.identityBound).toBeGreaterThanOrEqual(30);

  expect(result.synthetic.bridgeCliques).toEqual({ status: 'READY', sizes: [6, 5] });
  expect(result.synthetic.sparseChain).toEqual({ status: 'NONE', sizes: [] });
  expect(result.synthetic.cycle).toEqual({ status: 'NONE', sizes: [] });
  expect(result.synthetic.triangle).toEqual({ status: 'READY', sizes: [3] });
  expect(result.synthetic.equalCliques).toEqual({ status: 'AMBIGUOUS', sizes: [4, 4] });
  expect(result.synthetic.missingOdCompatible).toBe(false);
  expect(['UNAVAILABLE', 'REVIEW']).toContain(result.synthetic.collinear.status === 'READY' ? result.synthetic.collinear.confidence : result.synthetic.collinear.status);
  expect(result.synthetic.mirror.confidence).not.toBe('HIGH');
});
