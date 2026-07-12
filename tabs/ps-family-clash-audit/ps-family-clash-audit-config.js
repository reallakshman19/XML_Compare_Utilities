import { buildFamilyRootDetectorLabel, normalizeFamilyPrefixes } from './ps-family-token-utils.js';

export const PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA = 'ps-family-clash-audit-config/v5-support-change';

export const PS_FAMILY_CLASH_AUDIT_CONFIG = Object.freeze({
  schema: PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA,
  appTitle: 'PS / SL Family Clash Audit',
  launcher: Object.freeze({ label: 'PS / SL Family Clash Audit', icon: '⚠️↔️', help: 'Build SupportChangeXML line/support-group reports from two Navis clash XML inputs.' }),
  inputRows: 7,
  sourceFamilyPlaceholder: 'Optional filter, e.g. PS-14396 / SL-14396',
  familyPrefixesText: 'PS, SL',
  posToleranceMm: 25,
  toleranceMinMm: 0,
  toleranceStepMm: 0.001,
  inputFiles: Object.freeze([
    Object.freeze({ key: 'structure', label: 'StructureGroup vs Supports XML', accept: '.xml,text/xml,application/xml', textareaKey: 'structure' }),
    Object.freeze({ key: 'support', label: 'Clash within Supports XML', accept: '.xml,text/xml,application/xml', textareaKey: 'support' }),
  ]),
  reportTabs: Object.freeze([
    Object.freeze({ key: 'supportSummary', label: 'SupportGroup Summary', maturity: 'stable' }),
    Object.freeze({ key: 'lineSupportTree', label: 'Line Support Tree', maturity: 'stable' }),
    Object.freeze({ key: 'supportExceptions', label: 'SupportChange Exceptions', maturity: 'stable' }),
    Object.freeze({ key: 'inputEvidence', label: 'Input Evidence Ledger', maturity: 'stable' }),
    Object.freeze({ key: 'structureContacts', label: 'StructureGroup Contact Report', maturity: 'draft' }),
    Object.freeze({ key: 'supportChain', label: 'Support Chain Report', maturity: 'draft' }),
    Object.freeze({ key: 'supportMembers', label: 'SupportGroup Members Report', maturity: 'draft' }),
    Object.freeze({ key: 'connectivityMatrix', label: 'Connectivity Matrix', maturity: 'draft' }),
    Object.freeze({ key: 'clashRows', label: 'Clash Rows', maturity: 'stable' }),
    Object.freeze({ key: 'diagnostics', label: 'Diagnostics', maturity: 'draft' }),
  ]),
  sourceSideOptions: Object.freeze([
    Object.freeze({ value: 'auto', label: 'Auto' }),
    Object.freeze({ value: 'left', label: 'Left clash object' }),
    Object.freeze({ value: 'right', label: 'Right clash object' }),
  ]),
  outputButtons: Object.freeze([
    Object.freeze({ key: 'support-summary', label: 'SupportGroup Summary CSV', exportKey: 'supportSummaryCsv', mime: 'text/csv', suffix: 'supportgroup-summary' }),
    Object.freeze({ key: 'line-support-tree', label: 'Line Support Tree TXT', exportKey: 'lineSupportTreeText', mime: 'text/plain', suffix: 'line-support-tree' }),
    Object.freeze({ key: 'support-exceptions', label: 'SupportChange Exceptions CSV', exportKey: 'supportExceptionsCsv', mime: 'text/csv', suffix: 'supportchange-exceptions' }),
    Object.freeze({ key: 'input-evidence', label: 'Input Evidence Ledger CSV', exportKey: 'inputEvidenceCsv', mime: 'text/csv', suffix: 'input-evidence' }),
    Object.freeze({ key: 'structure-contacts', label: 'StructureGroup Contacts CSV', exportKey: 'structureContactsCsv', mime: 'text/csv', suffix: 'structure-contacts' }),
    Object.freeze({ key: 'support-chain', label: 'Support Chain CSV', exportKey: 'supportChainCsv', mime: 'text/csv', suffix: 'support-chain' }),
    Object.freeze({ key: 'support-members', label: 'SupportGroup Members CSV', exportKey: 'supportMembersCsv', mime: 'text/csv', suffix: 'supportgroup-members' }),
    Object.freeze({ key: 'connectivity-matrix', label: 'Connectivity Matrix CSV', exportKey: 'connectivityMatrixCsv', mime: 'text/csv', suffix: 'connectivity-matrix' }),
    Object.freeze({ key: 'clash', label: 'Clash Rows CSV', exportKey: 'clashRowsCsv', mime: 'text/csv', suffix: 'clash-rows' }),
    Object.freeze({ key: 'all-json', label: 'Audit JSON', exportKey: 'auditJson', mime: 'application/json', suffix: 'audit' }),
  ]),
  info: Object.freeze([
    'SupportChange workflow uses two Navis clash XML inputs: StructureGroup vs Supports and Clash within Supports.',
    'SupportGroup identity is LineFamily_PSRoot, for example S8810011_PS-14396.',
    'StructuralGroup is a child group inside SupportGroup; it must not replace the support representative.',
    'Supports are connected with support-support edges; StructureGroup contacts attach to the same SupportGroup.',
    'Stranger PS roots and orphan StructureGroup/support evidence are reported in SupportChange Exceptions.',
    'Family prefixes are configurable; default prefixes are PS and SL.',
    'Legacy Clash Rows family status remains row-local: source root and against root must match for IN_FAMILY.',
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
