import { expect, test } from '@playwright/test';

test('Slice 7 blocker causality remains causal and scope custody stays fail-closed', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  const result = await page.evaluate(async () => {
    const [
      causalityModule,
      readinessModule,
      authorityModule,
    ] = await Promise.all([
      import('/tabs/cii-workspace/cii-workspace-multisource-blocker-causality.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js'),
      import('/tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js'),
    ]);

    const { ciiMultiSourceBlockerCausality } = causalityModule;
    const readinessTest = readinessModule._test;
    const {
      CII_MS_SOURCE_SET_SHA256,
      CII_MS_TARGET_SHA256,
    } = authorityModule;

    const targetDocument = { contentSha256: 'normalized-target' };
    const unboundPlan = {
      status: 'PREVIEW_READY',
      sourceAuthorityKind: 'SOURCE_SET',
      sourceSetSha256: CII_MS_SOURCE_SET_SHA256,
      targetAuthority: {
        originalSha256: CII_MS_TARGET_SHA256,
        normalizedSha256: targetDocument.contentSha256,
      },
      operations: [{ operationId: 'op-1', action: 'COPY' }],
      excludedOperations: [],
    };

    const noScopeBlockers = readinessTest.custodyBlockers(unboundPlan, targetDocument);

    const cascade = ciiMultiSourceBlockerCausality({
      status: 'BLOCKED',
      blockers: [
        'S1:CORRESPONDENCE_NOT_READY',
        'MULTISOURCE_CORRESPONDENCE_NOT_READY',
      ],
    }, [
      'S1:CORRESPONDENCE_NOT_READY',
      'MULTISOURCE_CORRESPONDENCE_NOT_READY',
      'CII_MS_WRITER2_BOUND_SCOPE_REQUIRED',
      'CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY',
    ]);

    const scopeOnly = ciiMultiSourceBlockerCausality(
      unboundPlan,
      ['CII_MS_WRITER2_BOUND_SCOPE_REQUIRED'],
    );

    const mutationConflict = ciiMultiSourceBlockerCausality({
      status: 'BLOCKED',
      blockers: ['MULTISOURCE_TARGET_MUTATION_CONFLICT'],
    }, [
      'MULTISOURCE_TARGET_MUTATION_CONFLICT',
      'CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY',
    ]);

    const boundWrongScope = {
      ...unboundPlan,
      operations: [{ operationId: 'op-1', action: 'COPY', scopeDecision: 'APPLY' }],
      transferScope: {
        status: 'BOUND',
        mode: 'EXPLICIT_APPLY_EXCLUDE',
        authority: 'USER_EXPLICIT_OPERATION_SCOPE',
        sourceAuthorityKind: 'SOURCE_SET',
        sourceSetSha256: 'wrong-source-set',
        targetSha256: 'wrong-target',
        candidateOperationIds: ['op-1'],
        appliedOperationIds: ['op-1'],
        excludedOperationIds: [],
      },
    };
    const wrongScopeBlockers = readinessTest.custodyBlockers(boundWrongScope, targetDocument);

    const validBoundPlan = {
      ...unboundPlan,
      operations: [{ operationId: 'op-1', action: 'COPY', scopeDecision: 'APPLY' }],
      transferScope: {
        status: 'BOUND',
        mode: 'EXPLICIT_APPLY_EXCLUDE',
        authority: 'USER_EXPLICIT_OPERATION_SCOPE',
        sourceAuthorityKind: 'SOURCE_SET',
        sourceSetSha256: CII_MS_SOURCE_SET_SHA256,
        targetSha256: CII_MS_TARGET_SHA256,
        candidateOperationIds: ['op-1'],
        appliedOperationIds: ['op-1'],
        excludedOperationIds: [],
      },
    };
    const validScopeBlockers = readinessTest.custodyBlockers(validBoundPlan, targetDocument);
    const readyCausality = ciiMultiSourceBlockerCausality(validBoundPlan, validScopeBlockers);

    return {
      noScopeBlockers,
      cascade: {
        status: cascade.status,
        primary: cascade.primary.map((row) => row.code),
        derived: cascade.derived.map((row) => row.code),
      },
      scopeOnly: {
        primary: scopeOnly.primary.map((row) => row.code),
        derived: scopeOnly.derived.map((row) => row.code),
      },
      mutationConflict: {
        primary: mutationConflict.primary.map((row) => row.code),
        derived: mutationConflict.derived.map((row) => row.code),
      },
      wrongScopeBlockers,
      validScopeBlockers,
      readyCausality: {
        status: readyCausality.status,
        primary: readyCausality.primary.map((row) => row.code),
        derived: readyCausality.derived.map((row) => row.code),
      },
    };
  });

  expect(result.noScopeBlockers).toEqual(['CII_MS_WRITER2_BOUND_SCOPE_REQUIRED']);
  expect(result.cascade.primary).toEqual(['S1:CORRESPONDENCE_NOT_READY']);
  expect(result.cascade.derived).toEqual([
    'MULTISOURCE_CORRESPONDENCE_NOT_READY',
    'CII_MS_CAUSAL_TRANSFER_UNAVAILABLE',
    'CII_MS_CAUSAL_SCOPE_NOT_BINDABLE',
    'CII_MS_CAUSAL_WRITER_UNAVAILABLE',
  ]);
  expect(result.scopeOnly.primary).toEqual(['CII_MS_WRITER2_BOUND_SCOPE_REQUIRED']);
  expect(result.scopeOnly.derived).toEqual(['CII_MS_CAUSAL_WRITER_UNAVAILABLE']);
  expect(result.mutationConflict.primary).toEqual(['MULTISOURCE_TARGET_MUTATION_CONFLICT']);
  expect(result.mutationConflict.derived).toContain('CII_MS_CAUSAL_SCOPE_NOT_BINDABLE');
  expect(result.mutationConflict.derived).toContain('CII_MS_CAUSAL_WRITER_UNAVAILABLE');
  expect(result.wrongScopeBlockers).toContain('CII_MS_WRITER2_SCOPE_SOURCE_SET_HASH_MISMATCH');
  expect(result.wrongScopeBlockers).toContain('CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH');
  expect(result.wrongScopeBlockers).not.toContain('CII_MS_WRITER2_BOUND_SCOPE_REQUIRED');
  expect(result.validScopeBlockers).toEqual([]);
  expect(result.readyCausality.status).toBe('READY');
  expect(result.readyCausality.primary).toEqual([]);
  expect(result.readyCausality.derived).toEqual([]);

  console.log('SLICE7_BROWSER_CAUSALITY ' + JSON.stringify(result));
});
