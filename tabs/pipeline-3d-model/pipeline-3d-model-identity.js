export const PIPELINE_IDENTITY_SCHEMA = 'PipelineIdentityContext.v1';
export const DEFAULT_PIPELINE_BRANCH_NAME = 'B1';

function text(value) {
  return String(value ?? '').trim();
}

function sourceObject(input) {
  return typeof input === 'string' ? { branchName: input } : (input || {});
}

function nodeSources(point) {
  const values = [
    ...(Array.isArray(point?.sources) ? point.sources : []),
    point?.source,
  ].map(text).filter(Boolean);
  return [...new Set(values)];
}

export function resolvePipelineIdentityContext(input = {}) {
  const source = sourceObject(input);
  const requestedBranchName = text(source.branchName);
  const branchName = requestedBranchName || DEFAULT_PIPELINE_BRANCH_NAME;
  const lineNo = text(source.lineNo);
  return Object.freeze({
    schema: PIPELINE_IDENTITY_SCHEMA,
    branchName,
    lineNo,
    requestedBranchName,
    branchFallbackApplied: !requestedBranchName,
    branchResolutionReason: requestedBranchName ? 'EXPLICIT_BRANCH' : 'DEFAULT_BRANCH',
    nodeNamePolicy: 'SOURCE_LABEL_PRESERVED',
  });
}

export function resolvePipelineNodeIdentity(point = {}) {
  const nodeName = text(point.nodeName ?? point.label);
  const sources = nodeSources(point);
  return Object.freeze({
    nodeName,
    nodeNameSource: nodeName ? (sources.join('+') || 'POINT_LABEL') : 'MISSING',
  });
}

function rowValues(identity, row) {
  return [
    PIPELINE_IDENTITY_SCHEMA,
    identity.branchName,
    identity.lineNo,
    identity.branchFallbackApplied ? 'YES' : 'NO',
    row.nodeNumber,
    row.nodeName,
    row.nodeNameSource,
    row.x,
    row.y,
    row.z,
  ];
}

export function buildPipelineIdentityLedgerText(identityInput, rows = []) {
  const identity = resolvePipelineIdentityContext(identityInput);
  const header = [
    'Schema', 'BranchName', 'LineNo', 'BranchFallbackApplied', 'NodeNumber',
    'NodeName', 'NodeNameSource', 'X(mm)', 'Y(mm)', 'Z(mm)',
  ];
  return [header, ...rows.map((row) => rowValues(identity, row))]
    .map((row) => row.join('\t'))
    .join('\n');
}
