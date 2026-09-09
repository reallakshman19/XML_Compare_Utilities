import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSupportReportEvidenceReady,
  supportReportBlockingDiagnostic,
} from '../tabs/support-steel-relationship-builder/support-report-build-gate.js';

test('Support Report build gate blocks ERROR diagnostics', () => {
  const error = { severity: 'ERROR', code: 'BROKEN', message: 'unsafe clash evidence' };
  const warn = { severity: 'WARN', code: 'REVIEW', message: 'review only' };
  assert.equal(supportReportBlockingDiagnostic([warn, error]), error);
  assert.throws(() => assertSupportReportEvidenceReady({ diagnostics: [warn, error] }), /unsafe clash evidence/);
});

test('Support Report build gate permits WARN and INFO diagnostics', () => {
  const evidence = { diagnostics: [
    { severity: 'WARN', code: 'REVIEW' },
    { level: 'INFO', code: 'TRACE' },
  ] };
  assert.equal(supportReportBlockingDiagnostic(evidence.diagnostics), null);
  assert.equal(assertSupportReportEvidenceReady(evidence), evidence);
});

test('Support Report build gate accepts level-style ERROR diagnostics', () => {
  assert.throws(() => assertSupportReportEvidenceReady({
    diagnostics: [{ level: 'error', code: 'LEGACY_ERROR' }],
  }), /LEGACY_ERROR/);
});
