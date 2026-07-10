import { compareInputXmlTopology, parseInputXmlGraph } from './xml-cii-inputxml-compare-core.js';
import { normalizeInputXmlElementGraph } from './xml-cii-inputxml-element-normalizer.js?v=20260709-5d-normalizer-1';
import { solveInputXmlCoordinateFrame } from './xml-cii-inputxml-coordinate-frame-solver.js';
import { solveInputXmlNodeRemap } from './xml-cii-inputxml-node-map-solver.js';
import { buildInputXmlTopologyDashboard } from './xml-cii-inputxml-topology-dashboard-model.js';

const DEFAULT_LENGTH_TOL_MM = 6;

function normalizedGraph(xmlText, options = {}) {
  const normalizationOptions = { ...options, shortElementToleranceMm: Number(options.shortElementToleranceMm || options.lengthToleranceMm || DEFAULT_LENGTH_TOL_MM) };
  return normalizeInputXmlElementGraph(parseInputXmlGraph(xmlText, options), normalizationOptions);
}
function pathSummary(result = {}) {
  return {
    alignmentRows: result.paths?.alignmentRows || [],
    summary: {
      matchedPathCount: result.summary?.matchedPaths || 0,
      ambiguousPathCount: result.summary?.ambiguousPaths || 0,
    },
  };
}

export function compareInputXmlTopologyWithDashboard(referenceXmlText, targetXmlText, options = {}) {
  const base = compareInputXmlTopology(referenceXmlText, targetXmlText, options);
  const reference = normalizedGraph(referenceXmlText, options);
  const target = normalizedGraph(targetXmlText, options);
  const frameSolution = solveInputXmlCoordinateFrame(reference, target, options);
  const nodeRemap = solveInputXmlNodeRemap({ elementMappings: base.elementMappings || [], frameSolution });
  const topologyDashboard = buildInputXmlTopologyDashboard({
    reference,
    target,
    frameSolution,
    nodeRemap,
    pathAlignment: pathSummary(base),
    elementMappings: base.elementMappings || [],
    conflictRows: base.conflictRows || [],
    options,
  });
  return Object.freeze({
    ...base,
    mode: 'element-wise-canonical-path-aligned-configurable-evidence-with-topology-dashboard',
    frameSolution,
    nodeRemap,
    topologyDashboard,
    summary: Object.freeze({
      ...(base.summary || {}),
      frameMode: frameSolution.mode,
      nodeRemapCount: nodeRemap.summary.mappedNodeCount,
    }),
  });
}
