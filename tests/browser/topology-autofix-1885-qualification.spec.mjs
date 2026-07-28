import { expect, test } from '@playwright/test';

test('TTV-C05 — exact 1885 Steam Auto fix advances authority, checker state, and recovery', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/tests/browser/topology-checker-autofix-1885-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1'
    || Boolean(document.body.dataset.topologyValidatorError), null, { timeout: 180_000 });
  const fixtureError = await page.evaluate(() => document.body.dataset.topologyValidatorError || '');
  expect(fixtureError, 'exact benchmark fixture must build before qualification').toBe('');

  await page.locator('[data-ttv-checker-open]').click();
  const before = await qualificationSnapshot(page);
  expect(before.checker.autoEligibleCount).toBeGreaterThan(0);
  expect.soft(before.benchmark.sourceHash, 'platform document must bind the exact benchmark bytes').toBe(before.benchmark.sourceSha256);
  expect.soft(before.checker.autoEligibleCount, 'pinned benchmark preflight population changed').toBe(60);

  await page.locator('[data-ttv-checker-auto-fix]').click();
  await page.waitForFunction((runCount) => {
    const harness = window.__topologyValidatorHarness;
    const runs = harness?.controller?.checker?.evidence?.().autoFixRuns?.length ?? 0;
    const subtitle = document.querySelector('[data-ttv-checker-subtitle]')?.textContent ?? '';
    return runs > runCount || subtitle.startsWith('Checker error:');
  }, before.checker.autoFixRuns.length, { timeout: 180_000 });

  const after = await qualificationSnapshot(page);
  const run = after.checker.autoFixRuns.at(-1) ?? null;
  const checkerMessage = await page.locator('[data-ttv-checker-subtitle]').textContent();
  await attachEvidence(testInfo, 'topology-autofix-1885-before-after.json', { before, run, after, checkerMessage, pageErrors });

  expect(checkerMessage ?? '', 'autofix must not terminate in the checker error path').not.toMatch(/^Checker error:/);
  expect(run, 'autofix must publish a deterministic run receipt').not.toBeNull();
  expect(run.schema).toBe('TopologyAutoFixRun.v1');
  expect(run.selectedIssueIds).toHaveLength(before.checker.autoEligibleCount);
  expect(run.committed).toBe(true);
  expect(run.commitProof?.schema).toBe('TopologyAutoFixCommitProof.v1');
  expect(run.commitProof?.authorityAdvanced).toBe(true);
  expect(run.commitProof?.journalCommandId).toMatch(/^CJ-\d+$/);
  expect(run.commitProof?.activeCommandIds).toContain(run.commitProof.journalCommandId);
  expect(run.commitProof?.recoveryCommandIds).toContain(run.commitProof.journalCommandId);

  expect(after.edit.commandAuthority.authorityId).toBe(run.commitProof.afterAuthorityId);
  expect(after.edit.commandAuthority.currentDraftHash).toBe(run.commitProof.currentDraftHash);
  expect(after.edit.draft.topologyEditDraftHash).toBe(run.commitProof.currentDraftHash);
  expect(after.edit.commandJournal.activeCommandIds).toContain(run.commitProof.journalCommandId);
  expect(after.edit.editedCanonicalTopologyHash).toBe(run.commitProof.canonicalTopologyHash);
  expect(after.checker.canonicalTopologyHash).toBe(run.commitProof.canonicalTopologyHash);
  expect(after.checker.canonicalTopologyHash).not.toBe(before.checker.canonicalTopologyHash);

  const resolvedCount = run.applied.length + run.related.length;
  expect(resolvedCount).toBeGreaterThan(0);
  expect(after.checker.resolvedIssueIds).toHaveLength(resolvedCount);
  expect(after.checker.autoEligibleCount).toBeLessThan(before.checker.autoEligibleCount);
  const activeIds = new Set(after.checker.activeIssueIds);
  expect(after.checker.resolvedIssueIds.every((issueId) => !activeIds.has(issueId))).toBe(true);

  await page.reload();
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1'
    || Boolean(document.body.dataset.topologyValidatorError), null, { timeout: 180_000 });
  expect(await page.evaluate(() => document.body.dataset.topologyValidatorError || '')).toBe('');
  await page.locator('[data-ttv-checker-open]').click();
  const reloaded = await qualificationSnapshot(page);
  const reloadedRun = reloaded.checker.autoFixRuns.find((row) => row.runId === run.runId);
  await attachEvidence(testInfo, 'topology-autofix-1885-reload.json', { run, after, reloaded, pageErrors });

  expect(reloaded.benchmark.sourceSha256).toBe(before.benchmark.sourceSha256);
  expect(reloaded.benchmark.sourceHash).toBe(before.benchmark.sourceHash);
  expect(reloaded.edit.commandAuthority.authorityId).toBe(run.commitProof.afterAuthorityId);
  expect(reloaded.edit.commandAuthority.currentDraftHash).toBe(run.commitProof.currentDraftHash);
  expect(reloaded.edit.draft.topologyEditDraftHash).toBe(run.commitProof.currentDraftHash);
  expect(reloaded.edit.commandJournal.activeCommandIds).toContain(run.commitProof.journalCommandId);
  expect(reloaded.edit.editedCanonicalTopologyHash).toBe(run.commitProof.canonicalTopologyHash);
  expect(reloaded.checker.canonicalTopologyHash).toBe(run.commitProof.canonicalTopologyHash);
  expect(reloaded.checker.activeIssueIds).toEqual(after.checker.activeIssueIds);
  expect(reloaded.checker.resolvedIssueIds).toEqual(after.checker.resolvedIssueIds);
  expect(reloadedRun?.active).toBe(true);
  expect(reloadedRun?.commitProof).toEqual(run.commitProof);
  expect(pageErrors).toEqual([]);
});

async function qualificationSnapshot(page) {
  return page.evaluate(async () => {
    const harness = window.__topologyValidatorHarness;
    const checker = harness.controller.checker.evidence();
    const edit = harness.controller.evidence().edit;
    const benchmark = window.__topology1885Benchmark;
    const sourceDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(benchmark.sourceText));
    const sourceSha256 = [...new Uint8Array(sourceDigest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    return {
      benchmark: {
        sourceUrl: benchmark.sourceUrl,
        sourceSha256,
        sourceByteLength: benchmark.sourceByteLength,
        branchCount: benchmark.branchCount,
        sourceHash: edit.projectDocument?.sourceHash ?? '',
        documentId: edit.projectDocument?.documentId ?? '',
      },
      checker: {
        canonicalTopologyHash: checker.report?.canonicalTopologyHash ?? '',
        reportHash: checker.report?.topologyCheckReportHash ?? '',
        activeIssueIds: checker.report?.issues?.map((row) => row.id) ?? [],
        autoEligibleCount: checker.autoEligibleCount,
        autoFixRuns: checker.autoFixRuns,
        resolvedIssueIds: checker.resolvedIssues.map((row) => row.issue.id),
      },
      edit: {
        commandAuthority: edit.commandAuthority,
        commandJournal: edit.commandJournal,
        draft: edit.draft,
        editedCanonicalTopologyHash: edit.editedArtifacts?.canonicalTopology?.canonicalTopologyHash ?? '',
      },
    };
  });
}

async function attachEvidence(testInfo, name, evidence) {
  await testInfo.attach(name, {
    body: Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
    contentType: 'application/json',
  });
}
