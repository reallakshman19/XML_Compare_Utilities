import {methodCEvidence, methodCCsvExport, methodCSvgExport} from '../../tabs/cii-workspace/cii-workspace-method-c-exports.js';
import {escapeMethodCXml} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import {assertGeometrySceneCurrent} from './geo-scene.js';

export function graphEvidence(graph) {
  return {member: graph.member, xmlSha256: graph.sha256, xmlBytes: graph.byteLength,
    byteAuthority: graph.byteAuthority, profile: graph.profile, claimedCii: graph.claimedCii,
    units: graph.units, coordinateFrames: graph.coordinateFrames, components: graph.components,
    nodes: graph.nodes, edges: graph.edges, writerEligible: false, physicalIdentityQualified: false};
}
export function previewEvidence(context) {
  return {...methodCEvidence(context), schema: 'CIIFR.XmlGeometryPreview.v1',
    nextConsumer: 'WBS3.2/G2/M14_GRAPH_AND_CORRESPONDENCE_LEDGER', epoch: context.epoch,
    inputAuthority: 'XML_BYTES_MEASURED; ORIGINAL_CII_NOT_REVERIFIED',
    integration: 'ISOLATED_PREVIEW_NOT_INTEGRATED_VNEXT', evidenceMode: context.evidenceMode,
    graphs: {source: graphEvidence(context.source), target: graphEvidence(context.target)},
    viewerScene: assertGeometrySceneCurrent(context)};
}
export function exportPreview(session, kind) {
  const context = session.current(), evidence = previewEvidence(context);
  if (kind === 'json') return JSON.stringify(evidence, null, 2) + '\n';
  if (kind === 'svg') {
    const metadata = escapeMethodCXml(JSON.stringify({schema: evidence.schema, epoch: context.epoch,
      sourceXmlSha256: context.source.sha256, targetXmlSha256: context.target.sha256,
      sourceProfile: context.source.profile, targetProfile: context.target.profile,
      sourceCiiClaim: context.source.claimedCii, targetCiiClaim: context.target.claimedCii,
      anchors: context.transform.anchors, tolerance: context.candidates.tolerance,
      projection: context.projection, snapshot: context.candidates.snapshot, writerEligible: false}));
    return methodCSvgExport(context).replace('<style>', '<metadata>' + metadata + '</metadata><style>');
  }
  if (kind === 'csv') {
    const extra = ['previewEpoch','sourceXmlProfile','targetXmlProfile','sourceCiiClaimStatus','targetCiiClaimStatus'];
    const values = [context.epoch, context.source.profile, context.target.profile,
      context.source.claimedCii.status, context.target.claimedCii.status];
    const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
    return methodCCsvExport(context).trimEnd().split('\r\n').map((line, i) =>
      line + ',' + (i ? values : extra).map(quote).join(',')).join('\r\n') + '\r\n';
  }
  throw new Error('PREVIEW_EXPORT_FORMAT_INVALID');
}
