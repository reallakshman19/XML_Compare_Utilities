import { expect, test } from '@playwright/test';

test('P1 landed-main retained Inspect and Compare construction-count + heartbeat baseline', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const diagnostics = await page.evaluate(async () => {
    const [sourceSet, baseSelection, previewModule] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-source-set.js'),
      import('/tabs/cii-workspace/cii-workspace-base-loop-selection.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-preview.js'),
    ]);
    const { inspectCiiWorkspaceSourceSetWithVersionBridge } = sourceSet;
    const { ciiAutomaticBaseSelection } = baseSelection;
    const { createCiiWriter2SourceSetPreviewWithVersionBridge } = previewModule;

    async function fetchBytes(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`P1_HTTP:${path}:${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    function recorder() {
      const records = [];
      return {
        records,
        instrumentation: {
          record(event, value) {
            records.push({
              event: String(event),
              value: Number.isFinite(Number(value)) ? Number(value) : null,
              atMs: performance.now(),
            });
          },
        },
      };
    }
    function count(records, event) {
      return records.filter((row) => row.event === event).length;
    }
    function values(records, event) {
      return records.filter((row) => row.event === event && row.value != null).map((row) => row.value);
    }
    function summarize(records) {
      return {
        construction: {
          targetNormalize: count(records, 'TARGET_NORMALIZE'),
          targetIntake: count(records, 'TARGET_INTAKE'),
          targetTopology: count(records, 'TARGET_TOPOLOGY'),
          sourceNormalize: count(records, 'SOURCE_NORMALIZE'),
          sourceIntake: count(records, 'SOURCE_INTAKE'),
          sourceTopology: count(records, 'SOURCE_TOPOLOGY'),
        },
        physical: {
          rawCounts: values(records, 'ANCHOR_PHYSICAL_CANDIDATE_COUNT'),
          searchLimits: values(records, 'ANCHOR_PHYSICAL_SEARCH_LIMIT'),
          selectedCounts: values(records, 'ANCHOR_PHYSICAL_SELECTED_COUNT'),
          coherentComponents: values(records, 'ANCHOR_PHYSICAL_COHERENT_COMPONENT_COUNT'),
          coherentClusterSizes: values(records, 'ANCHOR_PHYSICAL_COHERENT_CLUSTER_SIZE'),
          preselectionAmbiguous: values(records, 'ANCHOR_PHYSICAL_PRESELECTION_AMBIGUOUS'),
          phaseMs: values(records, 'ANCHOR_WRAPPER_PHYSICAL_CANDIDATES_MS'),
        },
      };
    }
    async function measured(label, fn) {
      const gaps = [];
      let heartbeatCount = 0;
      let lastHeartbeatAt = performance.now();
      const timer = setInterval(() => {
        const now = performance.now();
        gaps.push(now - lastHeartbeatAt);
        lastHeartbeatAt = now;
        heartbeatCount += 1;
      }, 25);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const startedAt = performance.now();
      try {
        const value = await fn();
        const finishedAt = performance.now();
        await new Promise((resolve) => setTimeout(resolve, 75));
        return {
          label,
          value,
          wallMs: finishedAt - startedAt,
          heartbeatCount,
          maxHeartbeatGapMs: gaps.length ? Math.max(...gaps) : null,
          gapsOver250Ms: gaps.filter((gap) => gap > 250).length,
          gapsOver1000Ms: gaps.filter((gap) => gap > 1000).length,
        };
      } finally {
        clearInterval(timer);
      }
    }
    function autoBaseLoops(inspection) {
      const choices = [];
      const loops = {};
      for (const member of inspection.memberInspections || []) {
        const choice = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
        choices.push({
          sourceId: member.sourceId,
          status: choice.status,
          reason: choice.reason,
          confidence: choice.confidence,
          basisMethod: choice.basisMethod,
          sourceNodeId: choice.sourceNodeId,
          targetNodeId: choice.targetNodeId,
        });
        if (choice.status === 'READY') loops[member.sourceId] = choice.baseLoops;
      }
      return { choices, loops };
    }

    const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
    const sourceBytes = await Promise.all(sourceNames.map((name) => fetchBytes(`/Benchmark/${name}`)));
    const targetBytes = await fetchBytes('/Benchmark/T.CII');
    const sources = sourceNames.map((fileName, index) => ({
      sourceId: `S${index + 1}`,
      fileName,
      bytes: sourceBytes[index],
    }));

    const inspectTrace = recorder();
    const inspectMeasured = await measured('retained-inspect', () =>
      inspectCiiWorkspaceSourceSetWithVersionBridge({
        sources,
        targetBytes,
        targetFileName: 'T.CII',
      }, {
        cryptoRef: crypto,
        instrumentation: inspectTrace.instrumentation,
      }));
    const inspection = inspectMeasured.value;
    const automatic = autoBaseLoops(inspection);
    if (automatic.choices.some((row) => row.status !== 'READY')) {
      throw new Error(`P1_AUTO_BASE_NOT_READY:${JSON.stringify(automatic.choices)}`);
    }

    const previewInput = {
      sources,
      targetBytes,
      targetFileName: 'T.CII',
      baseLoopsBySource: automatic.loops,
    };
    async function runCompare(label) {
      const trace = recorder();
      const run = await measured(label, () =>
        createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput, {
          cryptoRef: crypto,
          instrumentation: trace.instrumentation,
        }));
      return {
        label,
        wallMs: run.wallMs,
        heartbeatCount: run.heartbeatCount,
        maxHeartbeatGapMs: run.maxHeartbeatGapMs,
        gapsOver250Ms: run.gapsOver250Ms,
        gapsOver1000Ms: run.gapsOver1000Ms,
        summary: summarize(trace.records),
        correspondenceStatus: run.value?.correspondence?.status || null,
        memberCount: run.value?.memberPreviews?.length || 0,
      };
    }

    const compare1 = await runCompare('retained-compare-1');
    const compare2 = await runCompare('retained-compare-2-same-input');

    const duplicateA = recorder();
    const duplicateB = recorder();
    const duplicateMeasured = await measured('retained-duplicate-compare-pair', async () => {
      const first = createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput, {
        cryptoRef: crypto,
        instrumentation: duplicateA.instrumentation,
      });
      const second = createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput, {
        cryptoRef: crypto,
        instrumentation: duplicateB.instrumentation,
      });
      const [a, b] = await Promise.all([first, second]);
      return [a?.correspondence?.status || null, b?.correspondence?.status || null];
    });

    const uiSource = await (await fetch('/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js', { cache: 'no-store' })).text();
    const analyzeStart = uiSource.indexOf('const analyzeMultiSource = async');
    const analyzeEnd = uiSource.indexOf('const applyMultiSourceReview = async', analyzeStart);
    const analyzeBody = analyzeStart >= 0 && analyzeEnd > analyzeStart ? uiSource.slice(analyzeStart, analyzeEnd) : '';
    const inspectStart = uiSource.indexOf('const inspectMultiSource = async');
    const inspectEnd = uiSource.indexOf('const previewInput =', inspectStart);
    const inspectBody = inspectStart >= 0 && inspectEnd > inspectStart ? uiSource.slice(inspectStart, inspectEnd) : '';

    return {
      mainExpectation: 'c1998df47e4183e6d54c30555cbc022742ffebc5',
      inspect: {
        wallMs: inspectMeasured.wallMs,
        heartbeatCount: inspectMeasured.heartbeatCount,
        maxHeartbeatGapMs: inspectMeasured.maxHeartbeatGapMs,
        gapsOver250Ms: inspectMeasured.gapsOver250Ms,
        gapsOver1000Ms: inspectMeasured.gapsOver1000Ms,
        summary: summarize(inspectTrace.records),
        memberCount: inspection.memberInspections?.length || 0,
      },
      automatic: automatic.choices,
      compare1,
      compare2,
      duplicateCompare: {
        wallMs: duplicateMeasured.wallMs,
        heartbeatCount: duplicateMeasured.heartbeatCount,
        maxHeartbeatGapMs: duplicateMeasured.maxHeartbeatGapMs,
        gapsOver250Ms: duplicateMeasured.gapsOver250Ms,
        gapsOver1000Ms: duplicateMeasured.gapsOver1000Ms,
        statuses: duplicateMeasured.value,
        first: summarize(duplicateA.records),
        second: summarize(duplicateB.records),
        launchedBothBeforeAwait: true,
      },
      uiOwnershipTrace: {
        analyzeHandlerFound: analyzeBody.length > 0,
        inspectHandlerFound: inspectBody.length > 0,
        analyzeHasGenerationGuard: /generation|epoch/i.test(analyzeBody),
        analyzeHasInFlightGuard: /inFlight|in_flight|busyPromise|activePromise/i.test(analyzeBody),
        analyzeHasAbortController: /AbortController|AbortSignal|signal\s*:/i.test(analyzeBody),
        inspectHasGenerationGuard: /generation|epoch/i.test(inspectBody),
        inspectHasInFlightGuard: /inFlight|in_flight|busyPromise|activePromise/i.test(inspectBody),
        inspectHasAbortController: /AbortController|AbortSignal|signal\s*:/i.test(inspectBody),
        disposedOnlyAfterAwait: analyzeBody.includes('await createCiiWriter2SourceSetPreviewWithVersionBridge')
          && analyzeBody.includes('if (disposed) return'),
      },
    };
  });

  console.log('P1_RUNTIME_BASELINE=' + JSON.stringify(diagnostics, null, 2));

  expect(diagnostics.inspect.memberCount).toBe(3);
  expect(diagnostics.inspect.summary.construction).toEqual({
    targetNormalize: 1,
    targetIntake: 1,
    targetTopology: 1,
    sourceNormalize: 3,
    sourceIntake: 3,
    sourceTopology: 3,
  });

  for (const row of diagnostics.automatic) expect(row.status).toBe('READY');

  for (const compare of [diagnostics.compare1, diagnostics.compare2]) {
    expect(compare.memberCount).toBe(3);
    expect(compare.summary.construction).toEqual({
      targetNormalize: 6,
      targetIntake: 6,
      targetTopology: 6,
      sourceNormalize: 6,
      sourceIntake: 6,
      sourceTopology: 6,
    });
    expect(compare.heartbeatCount).toBeGreaterThan(0);
  }

  for (const duplicate of [diagnostics.duplicateCompare.first, diagnostics.duplicateCompare.second]) {
    expect(duplicate.construction).toEqual({
      targetNormalize: 6,
      targetIntake: 6,
      targetTopology: 6,
      sourceNormalize: 6,
      sourceIntake: 6,
      sourceTopology: 6,
    });
  }
  expect(diagnostics.duplicateCompare.statuses).toHaveLength(2);
  expect(diagnostics.duplicateCompare.heartbeatCount).toBeGreaterThan(0);

  expect(diagnostics.uiOwnershipTrace.analyzeHandlerFound).toBe(true);
  expect(diagnostics.uiOwnershipTrace.inspectHandlerFound).toBe(true);
  expect(diagnostics.uiOwnershipTrace.analyzeHasGenerationGuard).toBe(false);
  expect(diagnostics.uiOwnershipTrace.analyzeHasInFlightGuard).toBe(false);
  expect(diagnostics.uiOwnershipTrace.analyzeHasAbortController).toBe(false);
  expect(diagnostics.uiOwnershipTrace.inspectHasGenerationGuard).toBe(false);
  expect(diagnostics.uiOwnershipTrace.inspectHasInFlightGuard).toBe(false);
  expect(diagnostics.uiOwnershipTrace.inspectHasAbortController).toBe(false);
  expect(diagnostics.uiOwnershipTrace.disposedOnlyAfterAwait).toBe(true);
});
