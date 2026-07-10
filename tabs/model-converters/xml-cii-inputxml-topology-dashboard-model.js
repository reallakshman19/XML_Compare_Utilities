import { frameSolutionRows } from './xml-cii-inputxml-coordinate-frame-solver.js';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function fmt(value, places = 3) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(places)) : 0; }
function count(rows = [], predicate = () => true) { return (rows || []).filter(predicate).length; }
function issueCount(conflictRows = [], issue) { return count(conflictRows, (row) => text(row.issue) === issue); }
function stationShiftRows(alignmentRows = [], toleranceMm = 6) {
  return (alignmentRows || [])
    .filter((row) => row.op === 'MATCH')
    .map((row) => {
      const ref = Number(row.referenceStationMm || 0);
      const target = Number(row.targetStationMm || 0);
      const delta = fmt(target - ref);
      return Object.freeze({
        referencePath: row.referencePath,
        targetPath: row.targetPath,
        referenceElement: row.referenceElement,
        targetElement: row.targetElement,
        referenceStationMm: row.referenceStationMm,
        targetStationMm: row.targetStationMm,
        stationDeltaMm: delta,
        elementScore: row.elementScore,
      });
    })
    .filter((row) => Math.abs(Number(row.stationDeltaMm || 0)) > toleranceMm)
    .slice(0, 50);
}
function payloadDiffRows(elementMappings = []) {
  return (elementMappings || [])
    .filter((row) => text(row.evidenceFlags) || Number(row.lengthDeltaMm || 0) > 0)
    .map((row) => Object.freeze({
      referenceElement: row.referenceElement,
      targetElement: row.targetElement,
      confidence: row.confidence,
      lengthDeltaMm: row.lengthDeltaMm,
      evidenceFlags: row.evidenceFlags,
      transferAction: row.transferAction,
    }))
    .slice(0, 80);
}

export function buildInputXmlTopologyDashboard({ reference = null, target = null, frameSolution = null, nodeRemap = null, pathAlignment = null, elementMappings = [], conflictRows = [], options = {} } = {}) {
  const shiftRows = stationShiftRows(pathAlignment?.alignmentRows || [], Number(options.lengthToleranceMm || 6));
  const payloadRows = payloadDiffRows(elementMappings);
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
    stationShiftRows: shiftRows.length,
    payloadDiffRows: payloadRows.length,
  });
  return Object.freeze({
    schema: 'CiiInputXmlTopologyDashboard.v1',
    summary,
    frameRows: Object.freeze(frameSolutionRows(frameSolution || {})),
    nodeRemapRows: Object.freeze((nodeRemap?.rows || []).slice(0, 120)),
    stationShiftRows: Object.freeze(shiftRows),
    payloadDiffRows: Object.freeze(payloadRows),
    criticalRows: Object.freeze([
      ...(nodeRemap?.rows || []).filter((row) => row.confidence === 'CONFLICT').map((row) => ({ issue: 'NODE_REMAP_CONFLICT', item: `${row.sourceNode} -> ${row.targetNode}`, detail: row.conflicts })),
      ...(conflictRows || []).filter((row) => ['UNMATCHED_REFERENCE_PATH', 'UNMATCHED_REFERENCE_ELEMENT', 'AMBIGUOUS_PATH'].includes(text(row.issue))).slice(0, 50).map((row) => ({ issue: row.issue, item: row.referenceElement || row.referencePath || '', detail: row.detail || row.targetElement || '' })),
    ]),
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
    { label: 'Station shifts', value: s.stationShiftRows || 0 },
    { label: 'Payload review rows', value: s.payloadDiffRows || 0 },
  ]);
}
