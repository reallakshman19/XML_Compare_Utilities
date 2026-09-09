export const SUPPORT_REPORT_SCHEMA = 'SupportReportBundle.v1';
export const SUPPORT_REPORT_EVIDENCE_SCHEMA = 'SupportReportClashEvidence.v1';
export const SUPPORT_REPORT_ROW_SCHEMA = 'SupportReportRow.v1';

export const SUPPORT_REPORT_COLUMNS = Object.freeze([
  Object.freeze({ key: 'scope', label: 'SCOPE' }),
  Object.freeze({ key: 'civilSecondarySupport', label: 'CIVILSECONDARYSUPPORT' }),
  Object.freeze({ key: 'pipe', label: 'PIPE' }),
  Object.freeze({ key: 'size', label: 'SIZE' }),
  Object.freeze({ key: 'pipeSchedule', label: 'PIPE SCHEDULE' }),
  Object.freeze({ key: 'pipeInsulationThickness', label: 'PIPE INSULATION THICKNESS' }),
  Object.freeze({ key: 'pipeInsulationType', label: 'PIPE INSULATION TYPE' }),
  Object.freeze({ key: 'pipingPrimarySupport', label: 'PIPING PRIMARY SUPPORT' }),
  Object.freeze({ key: 'supportType', label: 'SUPPORT TYPE' }),
  Object.freeze({ key: 'pipingPrimarySupportReference', label: 'PIPING PRIMARY SUPPORT REFERENCE' }),
  Object.freeze({ key: 'eastWest', label: 'EAST/WEST' }),
  Object.freeze({ key: 'northSouth', label: 'NORTH/SOUTH' }),
  Object.freeze({ key: 'bopElevation', label: 'BOP ELEVATION' }),
  Object.freeze({ key: 'stressSystemNumber', label: 'STRESS SYS.NO' }),
  Object.freeze({ key: 'nodeNumber', label: 'NODE NO' }),
  Object.freeze({ key: 'totalSupportPointsOnSecondary', label: 'TOTAL SUPPORT POINTS ON SECONDARY' }),
  Object.freeze({ key: 'previousName', label: 'PREV NAME' }),
  Object.freeze({ key: 'primarySupportDescription', label: 'PRIMARY SUPPORT DESCRIPTION' }),
  Object.freeze({ key: 'primarySupportZone', label: 'PRIMARY SUPPORT ZONE' }),
  Object.freeze({ key: 'primarySupportSite', label: 'PRIMARY SUPPORT SITE' }),
  Object.freeze({ key: 'remarks', label: 'REMARKS' }),
]);

export const SUPPORT_REPORT_DIAGNOSTICS = Object.freeze({
  EMPTY_XML: 'SUPPORT_REPORT_EMPTY_XML',
  NO_CLASH_RESULTS: 'SUPPORT_REPORT_NO_CLASH_RESULTS',
  AMBIGUOUS_PIPE_SIDE: 'SUPPORT_REPORT_AMBIGUOUS_PIPE_SIDE',
  MISSING_PIPE_SIDE: 'SUPPORT_REPORT_MISSING_PIPE_SIDE',
  MISSING_SECONDARY_FAMILY: 'SUPPORT_REPORT_MISSING_SECONDARY_FAMILY',
  MISSING_PRIMARY_MEMBER: 'SUPPORT_REPORT_MISSING_PRIMARY_MEMBER',
  RELATIONSHIP_BUNDLE_UNAVAILABLE: 'SUPPORT_REPORT_RELATIONSHIP_BUNDLE_UNAVAILABLE',
  FAMILY_NOT_FOUND: 'SUPPORT_REPORT_FAMILY_NOT_FOUND',
  MEMBER_ENRICHMENT_INCOMPLETE: 'SUPPORT_REPORT_MEMBER_ENRICHMENT_INCOMPLETE',
  CARRIER_ENRICHMENT_UNAVAILABLE: 'SUPPORT_REPORT_CARRIER_ENRICHMENT_UNAVAILABLE',
  COORDINATE_FROM_CLASH_FALLBACK: 'SUPPORT_REPORT_COORDINATE_FROM_CLASH_FALLBACK',
});
