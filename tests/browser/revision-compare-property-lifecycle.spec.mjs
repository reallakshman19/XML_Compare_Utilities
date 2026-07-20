import { expect, test } from '@playwright/test';

function audit(basisId, currentValue) {
  return {
    schema: 'RevisionCompareAudit.v1',
    auditId: 'audit-shared-id',
    basisId,
    revADocumentId: `rev-a-${basisId}`,
    revBDocumentId: `rev-b-${basisId}`,
    engineVersion: 'revision-compare-v1',
    differenceRows: [{
      differenceId: 'difference-probe',
      changedProperties: [{
        propertyKey: 'pressure',
        revAValue: 1,
        revBValue: currentValue,
        revAEvidencePath: `/rev-a/${basisId}/pressure`,
        revBEvidencePath: `/rev-b/${basisId}/pressure`,
        normalizationRule: 'EXACT',
      }],
    }],
  };
}

test('RC-SVG-002-B01 audit identity cache and construction-failure fallback', async ({ page }) => {
  await page.goto('/tests/browser/revision-compare-rc001.html');
  const result = await page.evaluate(async (audits) => {
    const inspectorModule = await import('/tabs/revision-compare/revision-compare-property-inspector.js');
    const evidenceModule = await import('/tabs/revision-compare/revision-compare-property-evidence.js');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const calls = [];
    const controller = inspectorModule.createRevisionComparePropertyInspector({
      evidenceFactory(currentAudit) {
        calls.push(currentAudit.basisId);
        if (currentAudit.basisId === 'basis-fail') throw new Error('forced adapter construction failure');
        return evidenceModule.createRevisionComparePropertyEvidence(currentAudit);
      },
    });

    await controller.render(host, audits.first, 'difference-probe');
    const firstCurrent = host.querySelector('[data-engineering-svg-property-current="pressure"] output')?.textContent;
    await controller.render(host, audits.second, 'difference-probe');
    const secondCurrent = host.querySelector('[data-engineering-svg-property-current="pressure"] output')?.textContent;
    await controller.render(host, audits.failure, 'difference-probe');
    const failureText = host.querySelector('[data-revc-property-status="failed"]')?.textContent;
    const fallbackRows = host.querySelectorAll('[data-revc-property-fallback="failure"] tbody tr').length;
    const fallbackText = host.querySelector('[data-revc-property-fallback="failure"]')?.textContent;
    const beforeDispose = controller.evidence();
    controller.dispose();
    const afterDispose = controller.evidence();
    const remainingChildren = host.childElementCount;
    host.remove();
    return {
      calls,
      firstCurrent,
      secondCurrent,
      failureText,
      fallbackRows,
      fallbackText,
      beforeDispose,
      afterDispose,
      remainingChildren,
    };
  }, {
    first: audit('basis-1', 2),
    second: audit('basis-2', 3),
    failure: audit('basis-fail', 4),
  });

  expect(result.calls).toEqual(['basis-1', 'basis-2', 'basis-fail']);
  expect(result.firstCurrent).toBe('2');
  expect(result.secondCurrent).toBe('3');
  expect(result.failureText).toContain('forced adapter construction failure');
  expect(result.fallbackRows).toBe(1);
  expect(result.fallbackText).toContain('pressure');
  expect(result.fallbackText).toContain('4');
  expect(result.beforeDispose.mountedViews).toBe(0);
  expect(result.afterDispose.disposed).toBe(true);
  expect(result.afterDispose.mountedViews).toBe(0);
  expect(result.remainingChildren).toBe(0);
});
