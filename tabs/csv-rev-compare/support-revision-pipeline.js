import { parseTableSource } from '../../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { buildCategorizedGraph } from '../../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { exportCategorizedGraphArtifacts } from '../../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { runCategorizerValidation } from '../../xml-compare/table-categorizer/table-categorized-xml-validation.js';
import { SUPPORT_REVISION_CSV_XML_PROFILE } from '../../xml-compare/table-categorizer/presets/support-revision/support-revision-profile.js';

export const SUPPORT_REVISION_PIPELINE_SCHEMA = 'support-revision-pipeline/v1';

export function convertSupportRevisionTable(tableText, options = {}) {
  const revision = String(options.revision || '1');
  const sourceId = String(options.sourceId || `R${revision}`);
  const sourceName = String(options.sourceName || `Revision ${revision}`);
  const profile = options.profile || SUPPORT_REVISION_CSV_XML_PROFILE;
  const source = parseTableSource(tableText, {
    sourceId,
    sourceName,
    sourceType: options.sourceType || 'pasteText',
    delimiterMode: options.delimiterMode || 'auto',
    customDelimiter: options.customDelimiter || '',
    firstRowIsHeader: options.firstRowIsHeader !== false,
  });
  const graph = buildCategorizedGraph(profile, [source]);
  const validationResults = Object.freeze([
    ...(source.diagnostics || []),
    ...runCategorizerValidation({ profile, sources: [source], graph, activeSourceId: source.sourceId }),
  ]);
  const exportResult = exportCategorizedGraphArtifacts({
    graph,
    profile,
    validationResults,
    sources: [source],
  });
  return Object.freeze({
    schema: SUPPORT_REVISION_PIPELINE_SCHEMA,
    revision,
    source,
    profile,
    graph,
    validationResults,
    exportResult,
    ok: Boolean(exportResult.ok),
  });
}

export function convertSupportRevisionPair(revision1Text, revision2Text, options = {}) {
  const rev1 = convertSupportRevisionTable(revision1Text, {
    ...options.rev1,
    revision: '1',
    sourceId: options.rev1?.sourceId || 'R1',
    sourceName: options.rev1?.sourceName || 'Revision 1 / Earlier',
    profile: options.profile,
  });
  const rev2 = convertSupportRevisionTable(revision2Text, {
    ...options.rev2,
    revision: '2',
    sourceId: options.rev2?.sourceId || 'R2',
    sourceName: options.rev2?.sourceName || 'Revision 2 / Later',
    profile: options.profile,
  });
  return Object.freeze({
    schema: 'support-revision-pair/v1',
    profileId: (options.profile || SUPPORT_REVISION_CSV_XML_PROFILE).profileId,
    rev1,
    rev2,
    ok: rev1.ok && rev2.ok,
    diagnostics: Object.freeze([
      ...(rev1.validationResults || []).map((item) => ({ revision: '1', ...item })),
      ...(rev2.validationResults || []).map((item) => ({ revision: '2', ...item })),
    ]),
  });
}
