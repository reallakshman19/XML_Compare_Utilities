export const PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA = 'ps-family-clash-audit-config/v1';

export const PS_FAMILY_CLASH_AUDIT_CONFIG = Object.freeze({
  schema: PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA,
  appTitle: 'PS Family Clash Audit',
  inputRows: 5,
  posToleranceMm: 25,
  toleranceMinMm: 0,
  toleranceStepMm: 0.001,
  sourceSideOptions: Object.freeze([
    Object.freeze({ value: 'auto', label: 'Auto' }),
    Object.freeze({ value: 'left', label: 'Left clash object' }),
    Object.freeze({ value: 'right', label: 'Right clash object' }),
  ]),
  outputButtons: Object.freeze([
    Object.freeze({ key: 'coverage', label: 'Coverage CSV', exportKey: 'coverageCsv', mime: 'text/csv', suffix: 'coverage' }),
    Object.freeze({ key: 'clash', label: 'Clash Rows CSV', exportKey: 'clashRowsCsv', mime: 'text/csv', suffix: 'clash-rows' }),
    Object.freeze({ key: 'source-pos', label: 'Source vs POSFamily CSV', exportKey: 'sourceVsPosFamilyCsv', mime: 'text/csv', suffix: 'source-vs-posfamily' }),
    Object.freeze({ key: 'all-json', label: 'Audit JSON', exportKey: 'auditJson', mime: 'application/json', suffix: 'audit' }),
  ]),
  info: Object.freeze([
    'Tolerance is configurable in the POS tolerance field; the configured value is applied independently to E, S, and U.',
    'Copy-(n)-of names are preserved as exact member identity and are not collapsed to original PS names.',
    'Line family, full line tag, branch node, support text, gap, reference, and position are preserved when available.',
    'Source side can be selected explicitly or left as Auto for support-side detection.',
  ]),
});

export function resolvePsFamilyClashAuditConfig(overrides = {}) {
  return Object.freeze({ ...PS_FAMILY_CLASH_AUDIT_CONFIG, ...overrides });
}

export function readPsFamilyUiSettings(getField, config = PS_FAMILY_CLASH_AUDIT_CONFIG) {
  const tolerance = Number(getField('tolerance')?.value);
  return Object.freeze({
    sourceSide: getField('source-side')?.value || config.sourceSideOptions[0].value,
    posToleranceMm: Number.isFinite(tolerance) ? tolerance : config.posToleranceMm,
  });
}
