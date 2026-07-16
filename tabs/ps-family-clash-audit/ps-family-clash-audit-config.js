import { buildFamilyRootDetectorLabel, normalizeFamilyPrefixes } from './ps-family-token-utils.js';

export const PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA = 'ps-family-clash-audit-config/v10-report-hub';

const REPORT_TABS = Object.freeze([
  Object.freeze({ key: 'supportSummary', label: 'SupportGroup Summary', maturity: 'stable' }),
  Object.freeze({ key: 'supportChain', label: 'Support Chain Report', maturity: 'draft' }),
  Object.freeze({ key: 'supportMembers', label: 'Support Members', maturity: 'draft' }),
  Object.freeze({ key: 'structureLineProximity', label: 'StructureGroup Line Support Proximity Basis', maturity: 'stable' }),
  Object.freeze({ key: 'structureContacts', label: 'Structure Contacts', maturity: 'draft' }),
  Object.freeze({ key: 'lineSupportTree', label: 'Line Tree', maturity: 'stable' }),
  Object.freeze({ key: 'structureTree', label: 'Structure Tree', maturity: 'stable' }),
  Object.freeze({ key: 'inputEvidence', label: 'Input Evidence', maturity: 'stable' }),
  Object.freeze({ key: 'connectivityMatrix', label: 'Connectivity Matrix', maturity: 'draft' }),
  Object.freeze({ key: 'clashRows', label: 'Clash Detail Rows', maturity: 'draft' }),
  Object.freeze({ key: 'supportExceptions', label: 'SupportChange Exceptions', maturity: 'stable' }),
  Object.freeze({ key: 'diagnostics', label: 'Diagnostics', maturity: 'stable' }),
]);

const REPORT_GROUPS = Object.freeze([
  Object.freeze({
    key: 'supportGroup',
    label: 'Support Group',
    description: 'SupportGroup Summary, support-chain continuity and member evidence.',
    reportKeys: Object.freeze(['supportSummary', 'supportChain', 'supportMembers']),
  }),
  Object.freeze({
    key: 'structureBasis',
    label: 'Structure Group Basis',
    description: 'StructureGroup line-support proximity basis and structure-contact evidence.',
    reportKeys: Object.freeze(['structureLineProximity', 'structureContacts']),
  }),
  Object.freeze({
    key: 'lineTree',
    label: 'Line Tree',
    description: 'Line, branch, SupportGroup and support hierarchy.',
    reportKeys: Object.freeze(['lineSupportTree']),
  }),
  Object.freeze({
    key: 'structureTree',
    label: 'Structure Tree',
    description: 'Structure-root hierarchy with the input evidence used to construct it.',
    reportKeys: Object.freeze(['structureTree', 'inputEvidence']),
  }),
  Object.freeze({
    key: 'clashSummary',
    label: 'Clash Summary',
    description: 'SupportGroup Summary, connectivity matrix and detailed clash evidence.',
    reportKeys: Object.freeze(['supportSummary', 'connectivityMatrix', 'clashRows']),
  }),
  Object.freeze({
    key: 'clashOutcome',
    label: 'Clash Audit Outcome',
    description: 'SupportChange exceptions and diagnostics requiring engineering action.',
    reportKeys: Object.freeze(['supportExceptions', 'diagnostics']),
  }),
]);

export const PS_FAMILY_CLASH_AUDIT_CONFIG = Object.freeze({
  schema: PS_FAMILY_CLASH_AUDIT_CONFIG_SCHEMA,
  appTitle: 'PS / SL Family Clash Audit',
  launcher: Object.freeze({ label: 'PS / SL Family Clash Audit', icon: '⚠️↔️', help: 'Build SupportChangeXML line/support-group reports from two Navis clash XML inputs.' }),
  inputRows: 7,
  sourceFamilyPlaceholder: 'Optional filter, e.g. PS-14396 / SL-14396',
  familyPrefixesText: 'PS, SL',
  structuralZonesText: 'CU-SU, STRUCTURE, FRMWORK, GENSEC, PANEL, FACET GROUP',
  supportZonesText: 'PS-, SL-',
  posToleranceMm: 25,
  toleranceMinMm: 0,
  toleranceStepMm: 0.001,
  inputFiles: Object.freeze([
    Object.freeze({ key: 'structure', label: 'StructureGroup vs Supports XML', accept: '.xml,text/xml,application/xml', textareaKey: 'structure' }),
    Object.freeze({ key: 'support', label: 'Clash within Supports XML', accept: '.xml,text/xml,application/xml', textareaKey: 'support' }),
  ]),
  reportTabs: REPORT_TABS,
  reportGroups: REPORT_GROUPS,
  sourceSideOptions: Object.freeze([
    Object.freeze({ value: 'auto', label: 'Auto' }),
    Object.freeze({ value: 'left', label: 'Left clash object' }),
    Object.freeze({ value: 'right', label: 'Right clash object' }),
  ]),
  outputButtons: Object.freeze([
    Object.freeze({ key: 'support-summary', label: 'Support Group Summary CSV', exportKey: 'supportSummaryCsv', mime: 'text/csv', suffix: 'supportgroup-summary' }),
    Object.freeze({ key: 'line-support-tree', label: 'Line Tree TXT', exportKey: 'lineSupportTreeText', mime: 'text/plain', suffix: 'line-support-tree' }),
    Object.freeze({ key: 'structure-line-proximity', label: 'Structure Group Basis CSV', exportKey: 'structureLineProximityCsv', mime: 'text/csv', suffix: 'structure-line-proximity' }),
    Object.freeze({ key: 'support-exceptions', label: 'Clash Audit Outcome CSV', exportKey: 'supportExceptionsCsv', mime: 'text/csv', suffix: 'supportchange-exceptions' }),
    Object.freeze({ key: 'input-evidence', label: 'Input Evidence CSV', exportKey: 'inputEvidenceCsv', mime: 'text/csv', suffix: 'input-evidence' }),
    Object.freeze({ key: 'all-json', label: 'Audit JSON', exportKey: 'auditJson', mime: 'application/json', suffix: 'audit' }),
  ]),
  info: Object.freeze([
    'SupportChange workflow uses two Navis clash XML inputs: StructureGroup vs Supports and Clash within Supports.',
    'SupportGroup identity is LineFamily_PSRoot, for example S8810011_PS-14396.',
    'Reports are organized into six task-oriented groups in a two-row report catalog.',
    'Every visible report can be exported directly as CSV from the Reports workspace.',
    'Structure Group Basis groups PS-14311-BAR-3 / PS-14311-BAR / PS-14311 by the same structural PS root.',
    'StructuralGroup is a child group inside SupportGroup; it must not replace the support representative.',
    'Supports are connected with support-support edges; StructureGroup contacts attach to the same SupportGroup.',
    'Zone classification is editable: structural and support zone tokens can contain multiple comma/newline separated entries.',
    'The Export Package workspace retains stable deliverables, previews, Audit JSON and ZIP packaging.',
    'Stranger PS roots and orphan StructureGroup/support evidence are reported in Clash Audit Outcome.',
    'Family prefixes are configurable; default prefixes are PS and SL.',
  ]),
});

function parseListText(value, fallbackText = '') {
  const text = String(value || fallbackText || '');
  return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

export function resolvePsFamilyClashAuditConfig(overrides = {}) {
  return Object.freeze({ ...PS_FAMILY_CLASH_AUDIT_CONFIG, ...overrides });
}

export function readPsFamilyUiSettings(getField, config = PS_FAMILY_CLASH_AUDIT_CONFIG) {
  const tolerance = Number(getField('tolerance')?.value);
  const sourceFamily = String(getField('source-family')?.value || '').trim().toUpperCase();
  const familyPrefixesText = String(getField('family-prefixes')?.value || config.familyPrefixesText).trim();
  const structuralZonesText = String(getField('structural-zones')?.value || config.structuralZonesText).trim();
  const supportZonesText = String(getField('support-zones')?.value || config.supportZonesText).trim();
  const familyPrefixes = normalizeFamilyPrefixes({ familyPrefixesText });
  const structuralZones = parseListText(structuralZonesText, config.structuralZonesText);
  const supportZones = parseListText(supportZonesText, config.supportZonesText);
  return Object.freeze({
    sourceSide: getField('source-side')?.value || config.sourceSideOptions[0].value,
    sourceFamily,
    familyPrefixesText: familyPrefixes.join(', '),
    familyPrefixes,
    familyDetectorLabel: buildFamilyRootDetectorLabel({ familyPrefixes }),
    structuralZonesText: structuralZones.join(', '),
    supportZonesText: supportZones.join(', '),
    structuralZones,
    supportZones,
    posToleranceMm: Number.isFinite(tolerance) ? tolerance : config.posToleranceMm,
  });
}
