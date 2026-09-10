import { parseTableSource } from '../../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { buildCategorizedGraph } from '../../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { exportCategorizedGraphArtifacts } from '../../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { runCategorizerValidation } from '../../xml-compare/table-categorizer/table-categorized-xml-validation.js';
import { SUPPORT_REVISION_CSV_XML_PROFILE } from '../../xml-compare/table-categorizer/presets/support-revision/support-revision-profile.js';
import { inferRevisionValue, validateSupportRevisionSource } from './support-revision-schema.js';

export const SUPPORT_REVISION_PIPELINE_SCHEMA = 'support-revision-pipeline/v1';

export function convertSupportRevisionTable(tableText, options = {}) {
  const revision = String(options.revision || '1');
  const source = parseSupportSource(tableText, revision, options);
  const profile = options.profile || SUPPORT_REVISION_CSV_XML_PROFILE;
  const graph = buildCategorizedGraph(profile, [source]);
  const validationResults = Object.freeze([
    ...validateSupportRevisionSource(source),
    ...runCategorizerValidation({ profile, sources: [source], graph, activeSourceId: source.sourceId }),
  ]);
  const exportResult = exportCategorizedGraphArtifacts({ graph, profile, validationResults, sources: [source] });
  return Object.freeze({
    schema: SUPPORT_REVISION_PIPELINE_SCHEMA,
    revision,
    inferredRevision: inferRevisionValue(source),
    source,
    profile,
    graph,
    validationResults,
    exportResult,
    ok: Boolean(exportResult.ok),
  });
}

export function convertSupportRevisionPair(revision1Text, revision2Text, options = {}) {
  const profile = options.profile || SUPPORT_REVISION_CSV_XML_PROFILE;
  const rev1 = convertSupportRevisionTable(revision1Text, revisionOptions(options.rev1, '1', 'R1', 'Revision 1 / Earlier', profile));
  const rev2 = convertSupportRevisionTable(revision2Text, revisionOptions(options.rev2, '2', 'R2', 'Revision 2 / Later', profile));
  return Object.freeze({
    schema: 'support-revision-pair/v1',
    profileId: profile.profileId,
    rev1,
    rev2,
    ok: rev1.ok && rev2.ok,
    diagnostics: Object.freeze([
      ...revisionDiagnostics('1', rev1),
      ...revisionDiagnostics('2', rev2),
    ]),
  });
}

function parseSupportSource(tableText, revision, options) {
  return parseTableSource(tableText, {
    sourceId: String(options.sourceId || `R${revision}`),
    sourceName: String(options.sourceName || `Revision ${revision}`),
    sourceType: options.sourceType || 'pasteText',
    delimiterMode: options.delimiterMode || 'auto',
    customDelimiter: options.customDelimiter || '',
    firstRowIsHeader: options.firstRowIsHeader !== false,
  });
}

function revisionOptions(input = {}, revision, sourceId, sourceName, profile) {
  return { ...input, revision, sourceId: input?.sourceId || sourceId, sourceName: input?.sourceName || sourceName, profile };
}

function revisionDiagnostics(revision, conversion) {
  return [
    ...(conversion.source?.diagnostics || []),
    ...(conversion.validationResults || []),
    ...(conversion.graph?.diagnostics || []),
  ].map((item) => Object.freeze({ revision, ...item }));
}
