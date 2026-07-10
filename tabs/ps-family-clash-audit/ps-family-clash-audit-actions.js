import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';

function detectSourceFamily(expectedRows, config = {}) {
  const manual = String(config.sourceFamily || '').trim().toUpperCase();
  return manual || expectedRows.find((row) => row.familyRoot)?.familyRoot || '';
}

function severityCount(diagnostics, level) {
  return diagnostics.filter((item) => item.level === level).length;
}

function readinessSummary(xml, expected, details, pos, diagnostics, config) {
  const sourceFamily = detectSourceFamily(expected.rows, config);
  if (!sourceFamily) diagnostics.push({ level: 'ERROR', code: 'UNKNOWN_SOURCE_FAMILY', message: 'Source family could not be detected from expected CSV or manual input.' });
  const parsedPositions = details.rows.filter((row) => row.position).length;
  return {
    sourceFamily,
    xmlClashCount: xml.rows.length,
    expectedCount: expected.rows.length,
    detailCount: details.rows.length,
    positionParsedCount: parsedPositions,
    positionMissingCount: details.rows.length - parsedPositions,
    posFamilyCount: pos.posFamilies.length,
    errorCount: severityCount(diagnostics, 'ERROR'),
    warnCount: severityCount(diagnostics, 'WARN'),
    infoCount: severityCount(diagnostics, 'INFO'),
  };
}

function parseInputs(input) {
  const config = input?.config || {};
  const xml = parsePsFamilyClashXml(input?.clashXmlText || '', config);
  const expected = parsePsFamilyRegisterCsv(input?.expectedCsvText || '', config);
  const details = parsePsFamilyElementDetailCsv(input?.detailCsvText || '', config);
  const pos = buildPsFamilyPosFamilies(details.rows, { toleranceMm: config.posToleranceMm });
  return { config, xml, expected, details, pos };
}

export function createPsFamilyInputReadinessFromTextInputs(input) {
  const parsed = parseInputs(input);
  const diagnostics = [
    ...parsed.xml.diagnostics,
    ...parsed.expected.diagnostics,
    ...parsed.details.diagnostics,
    ...parsed.pos.diagnostics,
  ];
  const summary = readinessSummary(parsed.xml, parsed.expected, parsed.details, parsed.pos, diagnostics, parsed.config);
  return Object.freeze({ summary, diagnostics, blocking: diagnostics.some((item) => item.level === 'ERROR') });
}

export function createPsFamilyClashAuditFromTextInputs(input) {
  const parsed = parseInputs(input);
  return buildPsFamilyClashAudit({
    clashRows: parsed.xml.rows,
    expectedRows: parsed.expected.rows,
    elementDetailRows: parsed.pos.rows,
    posFamilies: parsed.pos.posFamilies,
    config: parsed.config,
    diagnostics: [
      ...parsed.xml.diagnostics,
      ...parsed.expected.diagnostics,
      ...parsed.details.diagnostics,
      ...parsed.pos.diagnostics,
    ],
  });
}
