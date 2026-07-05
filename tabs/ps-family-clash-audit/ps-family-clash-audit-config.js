export const PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA = 'ps-family-clash-audit-config/v1';

export const PS_FAMILY_CLASH_AUDIT_CONFIG = Object.freeze({
  schema: PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA,
  appTitle: 'PS Family Clash Audit',
  inputRows: 5,
  posToleranceMm: 25,
  toleranceMinMm: 0,
  toleranceStepMm: 0.001,
  inputFiles: Object.freeze([
    Object.freeze({ key: 'xml', label: 'Clash XML', accept: '.xml,text/xml,application/xml', textareaKey: 'xml' }),
    Object.freeze({ key: 'expected', label: 'Expected PS CSV', accept: '.csv,text/csv,text/plain', textareaKey: 'expected' }),
    Object.freeze({ key: 'details', label: 'Element Detail CSV', accept: '.csv,text/csv,text/plain', textareaKey: 'details' }),
  ]),
  reportTabs: Object.freeze([
    Object.freeze({ key: 'coverage', label: 'Coverage' }),
    Object.freeze({ key: 'clashRows', label: 'Clash Rows' }),
    Object.freeze({ key: 'missing', label: 'Missing' }),
    Object.freeze({ key: 'outOfFamily', label: 'Out-of-Family' }),
    Object.freeze({ key: 'duplicates', label: 'Duplicates' }),
    Object.freeze({ key: 'lineFamilies', label: 'Line Families' }),
    Object.freeze({ key: 'posFamilies', label: 'POSFamilies' }),
    Object.freeze({ key: 'sourceVsPosFamily', label: 'Source vs POSFamily' }),
    Object.freeze({ key: 'diagnostics', label: 'Diagnostics' }),
  ]),
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
    'Files can be loaded with the file picker or pasted into the text areas; the parser always uses the visible text area contents.',
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
