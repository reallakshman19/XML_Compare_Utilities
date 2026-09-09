export function supportReportBlockingDiagnostic(diagnostics = []) {
  return (diagnostics || []).find((item) => diagnosticLevel(item) === 'ERROR') || null;
}

export function assertSupportReportEvidenceReady(evidence = {}) {
  const blocker = supportReportBlockingDiagnostic(evidence?.diagnostics || []);
  if (!blocker) return evidence;
  const message = blocker.message || blocker.code || 'Support Report clash evidence contains a blocking error.';
  throw new Error(message);
}

function diagnosticLevel(item) {
  return String(item?.severity || item?.level || '').trim().toUpperCase();
}

export const _test = Object.freeze({ diagnosticLevel });
