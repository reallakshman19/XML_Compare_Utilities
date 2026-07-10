import { frameSolutionRows } from './xml-cii-inputxml-coordinate-frame-solver.js';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function count(rows = [], predicate = () => true) { return (rows || []).filter(predicate).length; }
function issueCount(conflictRows = [], issue) { return count(conflictRows, (row) => text(row.issue) === issue); }

export function buildInputXmlTopologyDashboard({ reference = null, target = null, frameSolution = null, nodeRemap = null, pathAlignment = null, elementMappings = [], conflictRows = [] } = {}) {
  const payloadRows = (elementMappings || [])
    .filter((row) => text(row.evidenceFlags) || Number(row.lengthDeltaMm || 0) > 0)
    .map((row) => Object.freeze({ referenceElement: row.referenceElement, targetElement: row.targetElement, confidence: row.confidence, lengthDeltaMm: row.lengthDeltaMm, evidenceFlags: row.evidenceFlags, transferAction: row.transferAction }))
    .slice(0, 80);
  const summary = Object.freeze({
    referenceRawElements: reference?.normalization?.rawElementCount || 0,
    targetRawElements: target?.normalization?.rawElementCount || 0,
    referenceCanonicalElements: reference?.summary?.elementCount || 0,
    targetCanonicalElements: target?.summary?.elementCount || 0,
    coordinateFrameMode: frameSolution?.mode || 'UNSOLVED',
    coordinateFrameConfidence: frameSolution?.confidence ?? 0,
    mappedNodes: nodeRemap?.summary?.mappedNodeCount || 0,
    highConfidenceNodes: nodeRemap?.summary?.highConfidenceNodeCount || 0,
    nodeConflicts: nodeRemap?.summary?.conflictNodeCount || 0,
    matchedPaths: pathAlignment?.summary?.matchedPathCount || 0,
    ambiguousPaths: pathAlignment?.summary?.ambiguousPathCount || 0,
    matchedElements: elementMappings.length,
    unmatchedReferenceElements: issueCount(conflictRows, 'UNMATCHED_REFERENCE_ELEMENT'),
    supplementalEvidenceConflicts: issueCount(conflictRows, 'SUPPLEMENTAL_EVIDENCE_CONFLICT'),
    payloadDiffRows: payloadRows.length,
  });
  return Object.freeze({
    schema: 'CiiInputXmlTopologyDashboard.v1',
    summary,
    frameRows: Object.freeze(frameSolutionRows(frameSolution || {})),
    nodeRemapRows: Object.freeze((nodeRemap?.rows || []).slice(0, 120)),
    payloadDiffRows: Object.freeze(payloadRows),
    criticalRows: Object.freeze([...(nodeRemap?.rows || []).filter((row) => row.confidence === 'CONFLICT').map((row) => ({ issue: 'NODE_REMAP_CONFLICT', item: `${row.sourceNode} -> ${row.targetNode}`, detail: row.conflicts }))]),
  });
}

export function topologyDashboardCards(dashboard = {}) {
  const s = dashboard.summary || {};
  return Object.freeze([
    { label: 'Frame', value: s.coordinateFrameMode || 'UNSOLVED' },
    { label: 'Frame confidence', value: s.coordinateFrameConfidence ?? 0 },
    { label: 'Mapped nodes', value: s.mappedNodes || 0 },
    { label: 'Node conflicts', value: s.nodeConflicts || 0 },
    { label: 'Matched paths', value: s.matchedPaths || 0 },
    { label: 'Ambiguous paths', value: s.ambiguousPaths || 0 },
    { label: 'Matched elements', value: s.matchedElements || 0 },
    { label: 'Unmatched ref elements', value: s.unmatchedReferenceElements || 0 },
    { label: 'Payload review rows', value: s.payloadDiffRows || 0 },
  ]);
}
