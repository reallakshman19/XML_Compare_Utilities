import { expect, test } from '@playwright/test';

test('C4 diagnoses raw S1 physical pairwise coherence thresholds without benchmark oracle', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostic = await page.evaluate(async () => {
    const [converter, intakeModule, topologyModule, bridgeModule, physicalModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-v11-v14-converter.js'),
      import('/tabs/cii-workspace/cii-workspace-intake.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-writer-version-bridge.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js'),
    ]);
    const { detectCiiNeutralVersion, convertCiiNeutralVersionLossless } = converter;
    const { intakeCiiWorkspaceDocument } = intakeModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyModule;
    const { prepareCiiWorkspaceTargetWithVersionBridge } = bridgeModule;
    const { uniqueIncidentComponentLengthPairs } = physicalModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    async function normalizedSource(bytes, fileName) {
      if (detectCiiNeutralVersion(bytes) === 11) return bytes;
      const conversion = await convertCiiNeutralVersionLossless(bytes, 11, { fileName });
      return conversion.outputBytes;
    }
    function key(pair) {
      return `${String(pair?.sourceNodeId || '')}=>${String(pair?.targetNodeId || '')}`;
    }
    function pointMap(graph) {
      return new Map((graph?.nodes || []).map((node) => [String(node.id), node?.position]));
    }
    function distance(left, right) {
      if (!left || !right) return null;
      const values = [left.x, left.y, left.z, right.x, right.y, right.z].map(Number);
      if (!values.every(Number.isFinite)) return null;
      return Math.hypot(values[0] - values[3], values[1] - values[4], values[2] - values[5]);
    }
    function minIncidentOd(graph, nodeId) {
      const values = [...(graph?.adjacency?.get(String(nodeId)) || [])]
        .map((edge) => Number(edge?.diameter ?? edge?.od))
        .filter((value) => Number.isFinite(value) && value > 0);
      return values.length ? Math.min(...values) : null;
    }
    function componentSummary(raw, pairwise, predicate) {
      const neighbours = raw.map(() => new Set());
      for (const row of pairwise) if (predicate(row)) {
        neighbours[row.a].add(row.b);
        neighbours[row.b].add(row.a);
      }
      const unseen = new Set(raw.map((_, index) => index)); const components = [];
      while (unseen.size) {
        const first = unseen.values().next().value; unseen.delete(first);
        const queue = [first]; const indexes = [];
        while (queue.length) {
          const index = queue.shift(); indexes.push(index);
          for (const next of neighbours[index]) if (unseen.delete(next)) queue.push(next);
        }
        components.push({
          indexes,
          keys: indexes.map((index) => key(raw[index])).sort(),
          edgeCount: indexes.reduce((sum, index) =>
            sum + [...neighbours[index]].filter((next) => indexes.includes(next)).length, 0) / 2,
        });
      }
      components.sort((left, right) => right.indexes.length - left.indexes.length
        || right.edgeCount - left.edgeCount
        || left.keys.join('|').localeCompare(right.keys.join('|'), undefined, { numeric: true }));
      return {
        maxSupport: Math.max(...neighbours.map((items) => items.size), 0),
        sizes: components.map((item) => item.indexes.length),
        top: components.slice(0, 5).map((item) => ({
          size: item.indexes.length,
          edgeCount: item.edgeCount,
          density: item.indexes.length < 2 ? 0
            : Number((item.edgeCount / (item.indexes.length * (item.indexes.length - 1) / 2)).toFixed(4)),
          keys: item.keys,
        })),
      };
    }

    const [sourceRaw, targetRaw] = await Promise.all([
      fetchBytes('/Benchmark/S1.CII'),
      fetchBytes('/Benchmark/T.CII'),
    ]);
    const [sourceBytes, preparedTarget] = await Promise.all([
      normalizedSource(sourceRaw, 'S1.CII'),
      prepareCiiWorkspaceTargetWithVersionBridge(targetRaw, 'T.CII', {
        writerVersion: '2',
        cryptoRef: crypto,
      }),
    ]);
    const sourceDoc = await intakeCiiWorkspaceDocument(sourceBytes, 'S1.CII', {
      side: 'SOURCE',
      cryptoRef: crypto,
    });
    const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDoc);
    const targetGraph = preparedTarget.targetGraph;
    const sourcePositions = pointMap(sourceGraph); const targetPositions = pointMap(targetGraph);
    const raw = uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph);

    const candidateRows = raw.map((pair) => ({
      key: key(pair),
      sourceNodeId: String(pair.sourceNodeId),
      targetNodeId: String(pair.targetNodeId),
      sourcePosition: sourcePositions.get(String(pair.sourceNodeId)) || null,
      targetPosition: targetPositions.get(String(pair.targetNodeId)) || null,
      sourceOdMm: minIncidentOd(sourceGraph, pair.sourceNodeId),
    }));

    const pairwise = [];
    for (let a = 0; a < raw.length - 1; a += 1) for (let b = a + 1; b < raw.length; b += 1) {
      const left = raw[a]; const right = raw[b];
      const sourceDistanceMm = distance(sourcePositions.get(String(left.sourceNodeId)), sourcePositions.get(String(right.sourceNodeId)));
      const targetDistanceMm = distance(targetPositions.get(String(left.targetNodeId)), targetPositions.get(String(right.targetNodeId)));
      const deltaMm = sourceDistanceMm == null || targetDistanceMm == null ? null : Math.abs(sourceDistanceMm - targetDistanceMm);
      const ods = [minIncidentOd(sourceGraph, left.sourceNodeId), minIncidentOd(sourceGraph, right.sourceNodeId)]
        .filter((value) => value != null);
      const odRefMm = ods.length ? Math.min(...ods) : null;
      pairwise.push({
        a, b, left: key(left), right: key(right),
        sourceDistanceMm, targetDistanceMm, deltaMm, odRefMm,
        odNormalizedError: deltaMm == null || odRefMm == null ? null : deltaMm / odRefMm,
        relativeError: deltaMm == null ? null : deltaMm / Math.max(sourceDistanceMm, targetDistanceMm, 1e-9),
      });
    }

    const absoluteThresholdsMm = [0.01, 0.1, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const odNormalizedThresholds = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2];
    const relativeThresholds = [0.00001, 0.00005, 0.0001, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02];

    return {
      schema: 'CIIWriter2S1C4PairwiseCoherenceDiagnostic.v1',
      rawPhysicalPairCount: raw.length,
      candidateRows,
      pairwiseCount: pairwise.length,
      pairwise,
      thresholdFamilies: {
        absoluteMm: absoluteThresholdsMm.map((threshold) => ({
          threshold,
          ...componentSummary(raw, pairwise, (row) => row.deltaMm != null && row.deltaMm <= threshold),
        })),
        odNormalized: odNormalizedThresholds.map((threshold) => ({
          threshold,
          ...componentSummary(raw, pairwise, (row) => row.odNormalizedError != null && row.odNormalizedError <= threshold),
        })),
        relative: relativeThresholds.map((threshold) => ({
          threshold,
          ...componentSummary(raw, pairwise, (row) => row.relativeError != null && row.relativeError <= threshold),
        })),
      },
    };
  });

  console.log('S1_C4_PAIRWISE_COHERENCE=' + JSON.stringify(diagnostic));
  expect(diagnostic.rawPhysicalPairCount).toBe(23);
  expect(diagnostic.pairwiseCount).toBe(253);
});
