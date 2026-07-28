import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const BENCHMARK_SHA256 = '38c6080c73f84e55581ad75dcbfb6b580ea587fc287ecf1861d9dc8e793b5cd3';
const REPRESENTABLE_OPERATIONS = new Set(['MOVE_NODE', 'MERGE_NODES', 'TRIM_EDGE']);

test('TTV-C06 — exact 1885 staged export serializes all committed moves and rebuilds the edited topology', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/tests/browser/topology-checker-autofix-1885-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1'
    || Boolean(document.body.dataset.topologyValidatorError), null, { timeout: 180_000 });
  expect(await page.evaluate(() => document.body.dataset.topologyValidatorError || '')).toBe('');

  await page.locator('[data-ttv-checker-open]').click();
  const beforeRunCount = await page.evaluate(() => window.__topologyValidatorHarness.controller.checker.evidence().autoFixRuns.length);
  await page.locator('[data-ttv-checker-auto-fix]').click();
  await page.waitForFunction((count) => window.__topologyValidatorHarness.controller.checker.evidence().autoFixRuns.length > count,
    beforeRunCount, { timeout: 180_000 });

  const committed = await page.evaluate(() => {
    const harness = window.__topologyValidatorHarness;
    const checker = harness.controller.checker.evidence();
    const edit = harness.controller.evidence().edit;
    return {
      run: checker.autoFixRuns.at(-1),
      editedCanonicalTopologyHash: edit.editedArtifacts.canonicalTopology.canonicalTopologyHash,
      sourceHash: edit.projectDocument.sourceHash,
      draftHash: edit.draft.topologyEditDraftHash,
      activeCommandIds: edit.commandJournal.activeCommandIds,
    };
  });
  expect(committed.run.committed).toBe(true);
  expect(committed.run.applied).toHaveLength(60);
  expect(committed.run.rejected).toHaveLength(0);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-ttv-edit-export-staged]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/_edited_stage\.json$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString('utf8');
  const exported = JSON.parse(text);
  const exportSha256 = createHash('sha256').update(bytes).digest('hex');

  expect(exported.schema).toBe('inputxml-managed-stage/v1');
  expect(exported.objects).toHaveLength(23);
  expect(exported.provenance.schema).toBe('StagedEditProvenance.v1');
  expect(exported.provenance.baseCanonicalTopologyHash).toBe(committed.run.beforeTopologyHash);
  expect(exported.provenance.topologyEditDraftHash).toBe(committed.draftHash);
  expect(exported.provenance.editedCanonicalTopologyHash).toBe(committed.editedCanonicalTopologyHash);
  expect(exported.provenance.commandJournal.activeCommandIds).toEqual(committed.activeCommandIds);
  expect(exported.provenance.positionIdentityToleranceMm).toBe(1e-6);
  expect(exported.provenance.positionRemaps).toHaveLength(60);
  expect(exported.provenance.ledger).toHaveLength(60);

  const operations = flattenOperations(exported.provenance.commands);
  expect(operations).toHaveLength(60);
  expect(new Set(operations.map((row) => row.type))).toEqual(new Set(['MOVE_NODE']));
  expect(operations.every((row) => REPRESENTABLE_OPERATIONS.has(row.type))).toBe(true);
  const remapsByNode = new Map(exported.provenance.positionRemaps.map((row) => [row.nodeId, row]));
  expect(remapsByNode.size).toBe(60);
  for (const operation of operations) {
    const remap = remapsByNode.get(operation.payload.nodeId);
    expect(remap, `missing staged remap for ${operation.payload.nodeId}`).toBeTruthy();
    expect(remap.to).toEqual([operation.payload.position.x, operation.payload.position.y, operation.payload.position.z]);
  }

  const roundTrip = await page.evaluate(async (stagedText) => {
    const core = await import('/vendor/3d-converters/topology-browser-core.mjs');
    const staged = await import('/workbench3d/core/staged-json-core.js');
    const parsed = JSON.parse(stagedText);
    const root = staged.readStagedBranches(parsed);
    const producerText = JSON.stringify(root.branches);
    const options = {
      sourceName: 'ATTRIBUTE_managed_stage_1885_Steam_edited_stage.json',
      jobName: '1885 Steam Staged Export Round Trip',
      toleranceMm: 0.1,
      supportProjectionToleranceMm: 50,
      enrichmentConfig: {},
    };
    const rawEnvelopeBuilt = await core.buildComponentTopologyArtifacts(stagedText, options);
    const built = await core.buildComponentTopologyArtifacts(producerText, options);
    const report = core.runTopologyChecks(built.canonicalTopology, {
      shortElementMm: 6, toleranceMm: 0.1, snapToleranceMm: 25,
      angleToleranceDeg: 5, originToleranceMm: 0.1, clearanceMm: 0,
    });
    const harness = window.__topologyValidatorHarness;
    const edit = harness.controller.evidence().edit;
    const checker = harness.controller.checker.evidence();
    const editedCanonical = edit.editedArtifacts.canonicalTopology;
    return {
      rootKey: root.rootKey,
      branchCount: root.branches.length,
      rawEnvelopeCanonicalTopologyHash: rawEnvelopeBuilt.canonicalTopology.canonicalTopologyHash,
      normalizedCanonicalTopologyHash: built.canonicalTopology.canonicalTopologyHash,
      editedCanonicalTopologyHash: editedCanonical.canonicalTopologyHash,
      normalizedEngineeringSignature: await engineeringSignature(built.canonicalTopology),
      editedEngineeringSignature: await engineeringSignature(editedCanonical),
      normalizedFindingSignature: await findingSignature(report),
      editedFindingSignature: await findingSignature(checker.report),
      activeFindingCount: report.issues.length,
      expectedShortCount: report.issues.filter((row) => row.code === 'EXPECTED_SHORT_INLINE_COMPONENT').length,
      nodeCount: built.canonicalTopology.nodes.length,
      edgeCount: built.canonicalTopology.edges.length,
      editedNodeCount: editedCanonical.nodes.length,
      editedEdgeCount: editedCanonical.edges.length,
    };

    async function engineeringSignature(canonical) {
      const material = {};
      for (const key of ['nodes', 'edges', 'pointFeatures', 'junctions', 'boundaries', 'supports', 'rigids', 'bends']) {
        material[key] = normalize(canonical?.[key] ?? []);
      }
      return sha256(stableStringify(material));
    }

    async function findingSignature(value) {
      const issues = (value?.issues ?? []).map((issue) => normalize({
        code: issue.code,
        category: issue.category,
        severity: issue.severity,
        blocking: issue.blocking,
        message: issue.message,
        objectIds: issue.objectIds,
        details: issue.details,
        location: issue.location,
      }));
      return sha256(stableStringify(issues));
    }

    function normalize(value) {
      if (Array.isArray(value)) return value.map(normalize);
      if (!value || typeof value !== 'object') return value;
      const excluded = new Set([
        'canonicalTopologyHash', 'sourceIdentity', 'sourcePath', 'sourcePaths', 'sourceRef',
        'sourceEntityId', 'sourceEntityIds', 'sourcePortId', 'sourcePortIds',
        'viewKey', 'recordId', 'inputHash', 'contentHash', 'createdAt', 'updatedAt',
        'generatedAt', 'sourceName', 'jobName',
      ]);
      return Object.fromEntries(Object.keys(value).sort().filter((key) => !excluded.has(key))
        .map((key) => [key, normalize(value[key])]));
    }

    function stableStringify(value) { return JSON.stringify(value); }
    async function sha256(value) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  }, text);

  await testInfo.attach('ATTRIBUTE_managed_stage_1885_Steam_edited_stage.json', {
    body: bytes,
    contentType: 'application/json',
  });
  await testInfo.attach('topology-staged-export-1885-evidence.json', {
    body: Buffer.from(`${JSON.stringify({
      benchmarkSha256: BENCHMARK_SHA256,
      exportSha256,
      exportByteLength: bytes.length,
      committed,
      export: {
        schema: exported.schema,
        branchCount: exported.objects.length,
        positionIdentityToleranceMm: exported.provenance.positionIdentityToleranceMm,
        remapCount: exported.provenance.positionRemaps.length,
        operationCount: operations.length,
        operationTypes: [...new Set(operations.map((row) => row.type))],
        ledgerCount: exported.provenance.ledger.length,
      },
      roundTrip,
    }, null, 2)}\n`),
    contentType: 'application/json',
  });

  expect(roundTrip.rootKey).toBe('objects');
  expect(roundTrip.branchCount).toBe(23);
  expect(roundTrip.rawEnvelopeCanonicalTopologyHash).not.toBe(roundTrip.editedCanonicalTopologyHash);
  expect(roundTrip.normalizedCanonicalTopologyHash).not.toBe(roundTrip.editedCanonicalTopologyHash);
  expect(roundTrip.normalizedEngineeringSignature).toBe(roundTrip.editedEngineeringSignature);
  expect(roundTrip.normalizedFindingSignature).toBe(roundTrip.editedFindingSignature);
  expect(roundTrip.nodeCount).toBe(roundTrip.editedNodeCount);
  expect(roundTrip.edgeCount).toBe(roundTrip.editedEdgeCount);
  expect(roundTrip.expectedShortCount).toBe(0);
  expect(roundTrip.activeFindingCount).toBe(8);
  expect(pageErrors).toEqual([]);
});

function flattenOperations(commands) {
  const result = [];
  const visit = (command) => {
    if (command?.type === 'TRANSACTION') {
      for (const operation of command.payload?.operations ?? []) visit(operation);
      return;
    }
    result.push(command);
  };
  for (const command of commands ?? []) visit(command);
  return result;
}
