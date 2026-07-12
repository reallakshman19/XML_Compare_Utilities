import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parseSupportChangeXml } from './ps-family-psclash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';

function detectSourceFamily(expectedRows, supportRows, config = {}) {
  const manual = String(config.sourceFamily || '').trim().toUpperCase();
  return manual || expectedRows.find((row) => row.familyRoot)?.familyRoot || supportRows.find((row) => row.psRoot)?.psRoot || '';
}

function severityCount(diagnostics, level) { return diagnostics.filter((item) => item.level === level).length; }

function readinessSummary(parsed, diagnostics) {
  const sourceFamily = detectSourceFamily(parsed.expected.rows, [...parsed.structure.rows, ...parsed.support.rows], parsed.config);
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
  const structureText = input?.structureXmlText || '';
  const supportText = input?.supportXmlText || input?.psClashXmlText || '';
  const legacy = parsePsFamilyClashXml(input?.clashXmlText || '', config);
  const structure = parseSupportChangeXml(structureText, config, 'StructureGroup vs Supports');
  const support = parseSupportChangeXml(supportText, config, 'Clash within Supports');
  const expected = parsePsFamilyRegisterCsv(input?.expectedCsvText || '', config);
  const details = parsePsFamilyElementDetailCsv(input?.detailCsvText || '', config);
  const pos = buildPsFamilyPosFamilies(details.rows, { toleranceMm: config.posToleranceMm });
  return { config, legacy, structure, support, expected, details, pos };
}

export function createPsFamilyInputReadinessFromTextInputs(input) {
  const parsed = parseInputs(input);
  const diagnostics = [...parsed.legacy.diagnostics, ...parsed.structure.diagnostics, ...parsed.support.diagnostics, ...parsed.expected.diagnostics, ...parsed.details.diagnostics, ...parsed.pos.diagnostics];
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
