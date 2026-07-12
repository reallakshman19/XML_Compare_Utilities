import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parseSupportChangeXml } from './ps-family-psclash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';

function hasText(value) { return Boolean(String(value || '').trim()); }
function emptyParsed() { return { rows: [], diagnostics: [] }; }

function detectSourceFamily(expectedRows, supportRows, config = {}) {
  const manual = String(config.sourceFamily || '').trim().toUpperCase();
  return manual || expectedRows.find((row) => row.familyRoot)?.familyRoot || supportRows.find((row) => row.psRoot)?.psRoot || '';
}

function severityCount(diagnostics, level) { return diagnostics.filter((item) => item.level === level).length; }

function inputPresenceDiagnostics(parsed) {
  const diagnostics = [];
  if (!parsed.structure.rows.length) diagnostics.push({ level: 'ERROR', code: 'MISSING_STRUCTUREGROUP_SUPPORTS_XML', message: 'StructureGroup vs Supports XML is required for SupportChange audit.' });
  if (!parsed.support.rows.length) diagnostics.push({ level: 'ERROR', code: 'MISSING_SUPPORT_CHAIN_XML', message: 'Clash within Supports XML is required for SupportChange audit.' });
  return diagnostics;
}

function readinessSummary(parsed, diagnostics) {
  const sourceFamily = detectSourceFamily(parsed.expected.rows, [...parsed.structure.rows, ...parsed.support.rows], parsed.config);
  if (!sourceFamily) diagnostics.push({ level: 'ERROR', code: 'UNKNOWN_SOURCE_FAMILY', message: 'Source family could not be detected from SupportChangeXML evidence or manual input.' });
  const parsedPositions = parsed.details.rows.filter((row) => row.position).length;
  return {
    sourceFamily,
    structureContactCount: parsed.structure.rows.length,
    supportChainCount: parsed.support.rows.length,
    xmlClashCount: parsed.legacy.rows.length,
    psClashCount: parsed.support.rows.length + parsed.structure.rows.length,
    expectedCount: parsed.expected.rows.length,
    detailCount: parsed.details.rows.length,
    positionParsedCount: parsedPositions,
    positionMissingCount: parsed.details.rows.length - parsedPositions,
    posFamilyCount: parsed.pos.posFamilies.length,
    errorCount: severityCount(diagnostics, 'ERROR'),
    warnCount: severityCount(diagnostics, 'WARN'),
    infoCount: severityCount(diagnostics, 'INFO'),
  };
}

function parseInputs(input) {
  const config = input?.config || {};
  const legacyText = input?.clashXmlText || '';
  const structureText = input?.structureXmlText || '';
  const supportText = input?.supportXmlText || input?.psClashXmlText || '';
  const expectedText = input?.expectedCsvText || '';
  const detailText = input?.detailCsvText || '';
  const legacy = hasText(legacyText) ? parsePsFamilyClashXml(legacyText, config) : emptyParsed();
  const structure = hasText(structureText) ? parseSupportChangeXml(structureText, config, 'StructureGroup vs Supports') : emptyParsed();
  const support = hasText(supportText) ? parseSupportChangeXml(supportText, config, 'Clash within Supports') : emptyParsed();
  const expected = hasText(expectedText) ? parsePsFamilyRegisterCsv(expectedText, config) : emptyParsed();
  const details = hasText(detailText) ? parsePsFamilyElementDetailCsv(detailText, config) : emptyParsed();
  const pos = buildPsFamilyPosFamilies(details.rows, { toleranceMm: config.posToleranceMm });
  return { config, legacy, structure, support, expected, details, pos };
}

export function createPsFamilyInputReadinessFromTextInputs(input) {
  const parsed = parseInputs(input);
  const diagnostics = [...inputPresenceDiagnostics(parsed), ...parsed.legacy.diagnostics, ...parsed.structure.diagnostics, ...parsed.support.diagnostics, ...parsed.expected.diagnostics, ...parsed.details.diagnostics, ...parsed.pos.diagnostics];
  const summary = readinessSummary(parsed, diagnostics);
  return Object.freeze({ summary, diagnostics, blocking: diagnostics.some((item) => item.level === 'ERROR') });
}

export function createPsFamilyClashAuditFromTextInputs(input) {
  const parsed = parseInputs(input);
  return buildPsFamilyClashAudit({
    clashRows: parsed.legacy.rows,
    structureGroupRows: parsed.structure.rows,
    supportChainRows: parsed.support.rows,
    expectedRows: parsed.expected.rows,
    elementDetailRows: parsed.pos.rows,
    posFamilies: parsed.pos.posFamilies,
    config: parsed.config,
    diagnostics: [...parsed.legacy.diagnostics, ...parsed.structure.diagnostics, ...parsed.support.diagnostics, ...parsed.expected.diagnostics, ...parsed.details.diagnostics, ...parsed.pos.diagnostics],
  });
}
