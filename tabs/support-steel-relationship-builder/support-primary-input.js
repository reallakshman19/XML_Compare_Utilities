import { parseSupportMemberRelationshipXml } from '../ps-family-clash-audit/ps-family-psclash-xml-parser.js';
import { buildSupportPrimaryRelationshipBundle } from './support-primary-relationship.js';
import {
  normalizeSupportReportZoneScope,
  scopeSupportRelationshipRows,
} from './support-report-zone-scope.js';

export const SUPPORT_PRIMARY_INPUT_SCHEMA = 'SupportPrimaryInput.v1';

export function buildSupportPrimaryRelationshipInput(xmlText, options = {}) {
  const zoneScope = normalizeSupportReportZoneScope(options.zoneScope || {});
  const parsed = parseSupportMemberRelationshipXml(
    String(xmlText || ''),
    options.parserOptions || {},
    options.sourceInput || 'Clash within Supports',
  );
  const scopedRows = scopeSupportRelationshipRows(parsed.rows || [], zoneScope);
  const bundle = buildSupportPrimaryRelationshipBundle({
    relationshipRows: scopedRows,
    zoneScope,
  });
  return Object.freeze({
    schema: SUPPORT_PRIMARY_INPUT_SCHEMA,
    zoneScope,
    parsedRowCount: parsed.rows?.length || 0,
    scopedRowCount: scopedRows.length,
    excludedByZoneCount: Math.max(0, (parsed.rows?.length || 0) - scopedRows.length),
    parsedDiagnostics: Object.freeze([...(parsed.diagnostics || [])]),
    bundle,
  });
}
