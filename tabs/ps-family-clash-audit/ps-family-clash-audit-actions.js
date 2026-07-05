import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';

export function createPsFamilyClashAuditFromTextInputs(input) {
  const config = input?.config || {};
  const xml = parsePsFamilyClashXml(input?.clashXmlText || '', { sourceSide: config.sourceSide });
  const expected = parsePsFamilyRegisterCsv(input?.expectedCsvText || '');
  const details = parsePsFamilyElementDetailCsv(input?.detailCsvText || '');
  const pos = buildPsFamilyPosFamilies(details.rows, { toleranceMm: config.posToleranceMm });
  return buildPsFamilyClashAudit({
    clashRows: xml.rows,
    expectedRows: expected.rows,
    elementDetailRows: pos.rows,
    posFamilies: pos.posFamilies,
    config,
    diagnostics: [...xml.diagnostics, ...expected.diagnostics, ...details.diagnostics, ...pos.diagnostics],
  });
}
