export const SUPPORT_REVISION_RELOCATION_SCHEMA = 'support-revision-relocation-evidence/v1';

/**
 * Relocation is state on an already accepted lineage edge, never an identity
 * signal. Raw coordinate text/sign changes are insufficient: the comparison
 * frame must be supported by enough independent anchors and validated axes.
 */
export function assessRelocationEvidence(source, target, edge, coordinateFrame) {
  const coordinate = edge?.coordinateEvidence?.find((item) =>
    item.sourceNodeId === source?.nodeId && item.targetNodeId === target?.nodeId) || null;
  const validatedAxes = Object.entries(coordinateFrame?.axes || {})
    .filter(([, axis]) => axis?.status === 'VALIDATED')
    .map(([axis]) => axis);
  const minimumAnchors = Number(coordinateFrame?.scoreMinimumAnchors || 3);
  const anchorCount = Number(coordinateFrame?.anchorCount || 0);
  const frameTrusted = Boolean(coordinateFrame?.scoreFrameUsable)
    && anchorCount >= minimumAnchors
    && validatedAxes.length >= 2;
  const relocated = frameTrusted && coordinate?.classification === 'ACTUAL_POSITION_CHANGED';
  return Object.freeze({
    schema: SUPPORT_REVISION_RELOCATION_SCHEMA,
    relocated,
    coordinate,
    frameTrusted,
    frameStatus: coordinateFrame?.status || 'UNPROVEN_DEFAULT',
    anchorCount,
    minimumAnchors,
    validatedAxes: Object.freeze(validatedAxes),
    reasonCodes: Object.freeze(relocated
      ? ['TRUSTED_COORDINATE_FRAME', 'NORMALIZED_POSITION_CHANGED']
      : frameTrusted
        ? ['TRUSTED_COORDINATE_FRAME', coordinate?.classification || 'NO_COORDINATE_EVIDENCE']
        : ['UNTRUSTED_COORDINATE_FRAME']),
  });
}
