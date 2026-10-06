import { expect, test } from '@playwright/test';

test('C2 isolates whether proximal retained S1 raw physical candidates can form a Method-A base', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostic = await page.evaluate(async () => {
    const [
      converter,
      intakeModule,
      topologyModule,
      bridgeModule,
      physicalModule,
      methodAModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-v11-v14-converter.js'),
      import('/tabs/cii-workspace/cii-workspace-intake.js'),
      import('/tabs/cii-workspace/cii-workspace-topology-adapter.js'),
      import('/tabs/cii-workspace/cii-workspace-writer-version-bridge.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js'),
      import('/tabs/cii-workspace/cii-workspace-anchor-method-a.js'),
    ]);
    const {
      detectCiiNeutralVersion,
      convertCiiNeutralVersionLossless,
    } = converter;
    const { intakeCiiWorkspaceDocument } = intakeModule;
    const { adaptCiiDocumentToTopologyGraph } = topologyModule;
    const { prepareCiiWorkspaceTargetWithVersionBridge } = bridgeModule;
    const {
      uniqueIncidentComponentLengthPairs,
      selectPhysicalCandidatePairs,
    } = physicalModule;
    const { discoverCiiMethodABases } = methodAModule;

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
    function summary(discovery) {
      return {
        status: discovery.status,
        candidatePairCount: discovery.candidatePairCount,
        eligiblePairCount: discovery.eligiblePairCount,
        expansionPairCount: discovery.expansionPairCount,
        seedTripletCount: discovery.seedTripletCount,
        qualifiedBaseCount: discovery.qualifiedBaseCount,
        bases: (discovery.bases || []).map((base) => ({
          baseId: base.baseId,
          confidence: base.confidence,
          anchorCount: base.anchorCount,
          validationAnchorCount: base.validationAnchorCount,
          selectedBasisId: base.selectedBasisId,
          maxResidualMm: base.maxResidualMm,
          maxNormalizedResidual: base.maxNormalizedResidual,
          weight: base.weight?.total ?? 0,
          anchorPairs: (base.anchorPairs || []).map(key),
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
    const raw = uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph);
    const byKey = new Map(raw.map((row) => [key(row), row]));

    const selected11 = selectPhysicalCandidatePairs(sourceGraph, targetGraph, raw, 11);
    const proximalKeys = raw.map(key).filter((value) => {
      const sourceId = Number(value.split('=>')[0]);
      return Number.isFinite(sourceId) && sourceId <= 4250;
    });
    const proximal3Keys = ['3830=>860', '3840=>865', '3870=>870'];
    const unionKeys = [...new Set([...selected11.map(key), '3830=>860', '3870=>870'])];

    function rows(keys) {
      return keys.map((value) => byKey.get(value)).filter(Boolean);
    }
    function run(name, keys) {
      const candidates = rows(keys);
      const started = performance.now();
      const discovery = discoverCiiMethodABases(sourceGraph, targetGraph, candidates, {
        methodASeedPairLimit: Math.max(3, candidates.length),
        methodAExpansionPairLimit: Math.max(3, candidates.length),
        methodABaseSuggestionLimit: 24,
      });
      return {
        name,
        keys: candidates.map(key),
        elapsedMs: Number((performance.now() - started).toFixed(3)),
        discovery: summary(discovery),
      };
    }

    return {
      schema: 'CIIWriter2S1C2MethodALocality.v2',
      rawPhysicalPairCount: raw.length,
      rawPhysicalPairs: raw.map(key),
      selected11: selected11.map(key),
      proximalRawKeys: proximalKeys,
      cases: [
        run('PROXIMAL_3', proximal3Keys),
        run('PROXIMAL_RAW_TO_4250', proximalKeys),
        run('SELECTED_11', selected11.map(key)),
        run('SELECTED_11_PLUS_3830_3870', unionKeys),
      ],
    };
  });

  console.log('S1_C2_METHOD_A_LOCALITY=' + JSON.stringify(diagnostic));
  expect(diagnostic.rawPhysicalPairCount).toBeGreaterThan(0);
  expect(diagnostic.cases).toHaveLength(4);
});
