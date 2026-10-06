import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const RELATIVE_THRESHOLDS = [0.001, 0.0025, 0.005, 0.01, 0.02, 0.05];
const OD_THRESHOLDS = [0.1, 0.25, 0.5, 1, 2];

test('R2.1 records unlabeled retained S1 pairwise physical coherence census', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async ({ relativeThresholds, odThresholds }) => {
    const [converter, intakeModule, topologyModule, bridgeModule, physicalModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-v11-v14-converter.js'),
      import('/tabs/cii-workspace/cii-workspace-intake.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-writer-version-bridge.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js'),
    ]);
    const { convertCiiNeutralVersionLossless } = converter;
    const { intakeCiiWorkspaceDocument } = intakeModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyModule;
    const { prepareCiiWorkspaceTargetWithVersionBridge } = bridgeModule;
    const { uniqueIncidentComponentLengthPairs } = physicalModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`R2_1_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function pointMap(graph) {
      return new Map((graph?.nodes || []).map((node) => [String(node.id), node.position]));
    }
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
    function components(pairCount, relations, predicate) {
      const adjacency = Array.from({ length: pairCount }, () => new Set());
      let edgeCount = 0;
      for (const relation of relations) {
        if (!predicate(relation)) continue;
        adjacency[relation.i].add(relation.j);
        adjacency[relation.j].add(relation.i);
        edgeCount += 1;
      }
      const unseen = new Set(Array.from({ length: pairCount }, (_, index) => index));
      const rows = [];
      while (unseen.size) {
        const root = unseen.values().next().value;
        unseen.delete(root);
        const stack = [root];
        const component = [];
        while (stack.length) {
          const current = stack.pop();
          component.push(current);
          for (const next of adjacency[current]) if (unseen.delete(next)) stack.push(next);
        }
        rows.push(component.sort((a, b) => a - b));
      }
      rows.sort((a, b) => b.length - a.length || a[0] - b[0]);
      const largest = rows[0] || [];
      const largestSet = new Set(largest);
      let largestEdges = 0;
      for (const relation of relations) {
        if (predicate(relation) && largestSet.has(relation.i) && largestSet.has(relation.j)) largestEdges += 1;
      }
      const possible = largest.length * (largest.length - 1) / 2;
      return {
        edgeCount,
        componentIndexes: rows,
        componentSizes: rows.map((row) => row.length),
        largestDensity: possible ? largestEdges / possible : 0,
        degrees: adjacency.map((items) => items.size).sort((a, b) => b - a),
      };
    }
    function quantiles(values) {
      const rows = [...values].sort((a, b) => a - b);
      function q(p) {
        const x = (rows.length - 1) * p;
        const lo = Math.floor(x); const hi = Math.ceil(x);
        return lo === hi ? rows[lo] : rows[lo] * (hi - x) + rows[hi] * (x - lo);
      }
      return { min: rows[0], q1: q(0.25), median: q(0.5), q3: q(0.75), p90: q(0.9), p95: q(0.95), max: rows.at(-1) };
    }

    const sourceBytes = await fetchBytes('/Benchmark/S1.CII');
    const targetBytes = await fetchBytes('/Benchmark/T.CII');

    const sourceV11 = await convertCiiNeutralVersionLossless(sourceBytes, 11, {
      fileName: 'S1.CII', cryptoRef: crypto,
    });
    const sourceDocument = await intakeCiiWorkspaceDocument(sourceV11.outputBytes, 'S1.CII', {
      side: 'SOURCE', cryptoRef: crypto,
    });
    const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);

    const preparedTarget = await prepareCiiWorkspaceTargetWithVersionBridge(targetBytes, 'T.CII', {
      writerVersion: '2', cryptoRef: crypto,
    });
    const targetGraph = preparedTarget.targetGraph;

    const rawPairs = [...uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph)];
    const sourcePositions = pointMap(sourceGraph);
    const targetPositions = pointMap(targetGraph);
    const pairs = rawPairs.map((pair, index) => ({
      index,
      key: `${pair.sourceNodeId}=>${pair.targetNodeId}`,
      sourceNodeId: String(pair.sourceNodeId),
      targetNodeId: String(pair.targetNodeId),
      sourcePosition: sourcePositions.get(String(pair.sourceNodeId)),
      targetPosition: targetPositions.get(String(pair.targetNodeId)),
      sourceOdMm: incidentOd(sourceGraph, pair.sourceNodeId),
      fingerprint: pair?.physicalFingerprint?.fingerprint || null,
    }));

    const relations = [];
    for (let i = 0; i < pairs.length - 1; i += 1) for (let j = i + 1; j < pairs.length; j += 1) {
      const left = pairs[i]; const right = pairs[j];
      const sourceDistanceMm = distance(left.sourcePosition, right.sourcePosition);
      const targetDistanceMm = distance(left.targetPosition, right.targetPosition);
      const absoluteDeltaMm = Math.abs(sourceDistanceMm - targetDistanceMm);
      const relativeError = absoluteDeltaMm / Math.max(sourceDistanceMm, targetDistanceMm, 1e-9);
      const odValues = [left.sourceOdMm, right.sourceOdMm].filter((value) => value != null);
      const sourceOdRefMm = odValues.length ? Math.min(...odValues) : null;
      const odNormalizedDelta = sourceOdRefMm == null ? null : absoluteDeltaMm / sourceOdRefMm;
      relations.push({
        i, j, left: left.key, right: right.key,
        sourceDistanceMm, targetDistanceMm, absoluteDeltaMm, relativeError,
        sourceOdRefMm, odNormalizedDelta,
        rev1Compatible: sourceOdRefMm != null && absoluteDeltaMm <= 2 * sourceOdRefMm,
      });
    }

    function describe(predicate) {
      const graph = components(pairs.length, relations, predicate);
      return {
        ...graph,
        components: graph.componentIndexes.map((component) => component.map((index) => pairs[index].key)),
      };
    }

    const relative = Object.fromEntries(relativeThresholds.map((threshold) => [
      String(threshold), describe((row) => row.relativeError <= threshold),
    ]));
    const od = Object.fromEntries(odThresholds.map((threshold) => [
      String(threshold), describe((row) => row.odNormalizedDelta != null && row.odNormalizedDelta <= threshold),
    ]));
    const conjunction = {};
    for (const rel of relativeThresholds) for (const odLimit of odThresholds) {
      conjunction[`rel<=${rel}&od<=${odLimit}`] = describe((row) =>
        row.relativeError <= rel && row.odNormalizedDelta != null && row.odNormalizedDelta <= odLimit);
    }

    return {
      schema: 'CIIWriter2S1PairwiseCoherenceCensus.v1',
      authority: 'VALIDATION_ONLY_NO_TEXPECTED_NO_MANUAL_LABELS',
      rawPhysicalPairCount: pairs.length,
      pairwiseRelationCount: relations.length,
      sourceOdValues: [...new Set(pairs.map((pair) => pair.sourceOdMm))].sort((a, b) => a - b),
      pairs,
      distributions: {
        absoluteDeltaMm: quantiles(relations.map((row) => row.absoluteDeltaMm)),
        relativeError: quantiles(relations.map((row) => row.relativeError)),
        odNormalizedDelta: quantiles(relations.map((row) => row.odNormalizedDelta).filter((value) => value != null)),
      },
      rev1: describe((row) => row.rev1Compatible),
      relative,
      od,
      conjunction,
      thresholds: { relative: relativeThresholds, odNormalized: odThresholds },
    };
  }, { relativeThresholds: RELATIVE_THRESHOLDS, odThresholds: OD_THRESHOLDS });

  await writeFile('s1-r2-1-pairwise-census.json', JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
  console.log('S1_R2_1_PAIRWISE_CENSUS=' + JSON.stringify(diagnostics));

  expect(diagnostics.rawPhysicalPairCount).toBe(23);
  expect(diagnostics.pairwiseRelationCount).toBe(253);
  expect(diagnostics.sourceOdValues).toEqual([273]);
  expect(diagnostics.rev1.componentSizes).toEqual([21, 2]);
  expect(diagnostics.relative['0.001'].componentSizes).toEqual([16, 5, 2]);
  expect(diagnostics.od['0.5'].componentSizes).toEqual([16, 5, 2]);
});
