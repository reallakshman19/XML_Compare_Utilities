import { buildFamilyRootDetectorLabel, normalizeFamilyPrefixes } from './ps-family-token-utils.js';

export const PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA = 'ps-family-clash-audit-config/v4-psclash';

export const PS_FAMILY_CLASH_AUDIT_CONFIG = Object.freeze({
  schema: PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA,
  appTitle: 'PS / SL Family Clash Audit',
  launcher: Object.freeze({ label: 'PS / SL Family Clash Audit', icon: '⚠️↔️', help: 'Audit Navis clash XML against configurable support-family mapping.' }),
  inputRows: 5,
  sourceFamilyPlaceholder: 'Auto from expected CSV, or enter PS-11147 / SL-11147',
  familyPrefixesText: 'PS, SL',
  posToleranceMm: 25,
  toleranceMinMm: 0,
  toleranceStepMm: 0.001,
  inputFiles: Object.freeze([
    Object.freeze({ key: 'xml', label: 'Clash XML', accept: '.xml,text/xml,application/xml', textareaKey: 'xml' }),
    Object.freeze({ key: 'expected', label: 'Expected PS/SL CSV', accept: '.csv,text/csv,text/plain', textareaKey: 'expected' }),
    Object.freeze({ key: 'details', label: 'Element Detail CSV', accept: '.csv,text/csv,text/plain', textareaKey: 'details' }),
    Object.freeze({ key: 'psclash', label: 'PSClash XML', accept: '.xml,text/xml,application/xml', textareaKey: 'psclash' }),
  ]),
  reportTabs: Object.freeze([
    Object.freeze({ key: 'coverage', label: 'Coverage', maturity: 'draft' }),
    Object.freeze({ key: 'clashRows', label: 'Clash Rows', maturity: 'stable' }),
    Object.freeze({ key: 'psClashReport', label: 'PSClash report', maturity: 'stable' }),
    Object.freeze({ key: 'hierarchy', label: 'Hierarchy', maturity: 'draft' }),
    Object.freeze({ key: 'missing', label: 'Missing', maturity: 'draft' }),
    Object.freeze({ key: 'outOfFamily', label: 'Out-of-Family', maturity: 'draft' }),
    Object.freeze({ key: 'duplicates', label: 'Duplicates', maturity: 'draft' }),
    Object.freeze({ key: 'lineFamilies', label: 'Line Families', maturity: 'draft' }),
    Object.freeze({ key: 'posFamilies', label: 'POSFamilies', maturity: 'draft' }),
    Object.freeze({ key: 'sourceVsPosFamily', label: 'Source vs POSFamily', maturity: 'draft' }),
    Object.freeze({ key: 'diagnostics', label: 'Diagnostics', maturity: 'draft' }),
  ]),
  sourceSideOptions: Object.freeze([
    Object.freeze({ value: 'auto', label: 'Auto' }),
    Object.freeze({ value: 'left', label: 'Left clash object' }),
    Object.freeze({ value: 'right', label: 'Right clash object' }),
  ]),
  outputButtons: Object.freeze([
    Object.freeze({ key: 'coverage', label: 'Coverage CSV', exportKey: 'coverageCsv', mime: 'text/csv', suffix: 'coverage' }),
    Object.freeze({ key: 'clash', label: 'Clash Rows CSV', exportKey: 'clashRowsCsv', mime: 'text/csv', suffix: 'clash-rows' }),
    Object.freeze({ key: 'psclash-report', label: 'PSClash report CSV', exportKey: 'psClashReportCsv', mime: 'text/csv', suffix: 'psclash-report' }),
    Object.freeze({ key: 'missing', label: 'Missing CSV', exportKey: 'missingCsv', mime: 'text/csv', suffix: 'missing' }),
    Object.freeze({ key: 'out-of-family', label: 'Out-of-Family CSV', exportKey: 'outOfFamilyCsv', mime: 'text/csv', suffix: 'out-of-family' }),
    Object.freeze({ key: 'duplicates', label: 'Duplicates CSV', exportKey: 'duplicatesCsv', mime: 'text/csv', suffix: 'duplicates' }),
    Object.freeze({ key: 'line-families', label: 'Line Families CSV', exportKey: 'lineFamiliesCsv', mime: 'text/csv', suffix: 'line-families' }),
    Object.freeze({ key: 'pos-families', label: 'POSFamilies CSV', exportKey: 'posFamiliesCsv', mime: 'text/csv', suffix: 'posfamilies' }),
    Object.freeze({ key: 'source-pos', label: 'Source vs POSFamily CSV', exportKey: 'sourceVsPosFamilyCsv', mime: 'text/csv', suffix: 'source-vs-posfamily' }),
    Object.freeze({ key: 'diagnostics', label: 'Diagnostics CSV', exportKey: 'diagnosticsCsv', mime: 'text/csv', suffix: 'diagnostics' }),
    Object.freeze({ key: 'all-json', label: 'Audit JSON', exportKey: 'auditJson', mime: 'application/json', suffix: 'audit' }),
  ]),
  info: Object.freeze([
    'Files can be loaded with the file picker or pasted into the text areas; the parser always uses the visible text area contents.',
    'Family prefixes are configurable; default prefixes are PS and SL.',
    'Clash Rows family status is row-local: source root and against root must match for IN_FAMILY.',
    'PSClash XML is a separate Navis clash export used to build the PSClash report.',
    'Tolerance is configurable in the POS tolerance field; the configured value is applied independently to E, S, and U.',
    'Copy-(n)-of names are preserved as exact member identity and are not collapsed to original support-family names.',
    'Line family, full line tag, branch node, support text, gap, reference, and position are preserved when available.',
    'Source side can be selected explicitly or left as Auto for support-side detection.',
  ]),
});

export function resolvePsFamilyClashAuditConfig(overrides = {}) {
  return Object.freeze({ ...PS_FAMILY_CLASH_AUDIT_CONFIG, ...overrides });
}

export function readPsFamilyUiSettings(getField, config = PS_FAMILY_CLASH_AUDIT_CONFIG) {
  const tolerance = Number(getField('tolerance')?.value);
  const sourceFamily = String(getField('source-family')?.value || '').trim().toUpperCase();
  const familyPrefixesText = String(getField('family-prefixes')?.value || config.familyPrefixesText).trim();
  const familyPrefixes = normalizeFamilyPrefixes({ familyPrefixesText });
  return Object.freeze({
    sourceSide: getField('source-side')?.value || config.sourceSideOptions[0].value,
    sourceFamily,
    familyPrefixesText: familyPrefixes.join(', '),
    familyPrefixes,
    familyDetectorLabel: buildFamilyRootDetectorLabel({ familyPrefixes }),
    posToleranceMm: Number.isFinite(tolerance) ? tolerance : config.posToleranceMm,
  });
}
