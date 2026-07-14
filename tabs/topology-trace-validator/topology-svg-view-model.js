/**
 * Functionality: projects normalized artifacts and validation findings into
 * immutable TopologySvgViewModel.v1. Input includes explicit view/filter state.
 * Output contains no raw artifacts. Fallback: producer-missing IDs retain only
 * their already-reported view keys and cannot become engineering authority.
 */

import {
  TOPOLOGY_VIEW_MODEL_SCHEMA,
  asArray,
  cleanText,
  deepFreeze,
  objectRecord,
  uniqueText,
} from './topology-validator-values.js';
import { calculateTopologyBounds, projectTopologyPoint } from './topology-svg-projections.js';
import { buildTopologySelectionLookup } from './topology-selection-view-model.js';

/** @param {Record<string, unknown>} component @param {Record<string, unknown>} state @param {Map<string,string>} dispositions @returns {boolean} */
function componentVisible(component, state, dispositions) {
  const branch = cleanText(state.branch), types = asArray(state.types).map(cleanText);
  if (branch && cleanText(component.sourceBranch) !== branch) return false;
  if (types.length && !types.includes(cleanText(component.componentCategory))) return false;
  const disposition = dispositions.get(cleanText(component.sourceEntityId) || cleanText(component.sourcePath)) ?? '';
  if (cleanText(state.disposition) && cleanText(state.disposition) !== disposition) return false;
  const searches = [
    [state.searchName, component.name],
    [state.searchRef, component.ref],
    [state.searchPath, component.sourcePath],
  ];
  return searches.every(([needle, value]) => !cleanText(needle) || cleanText(value).toLowerCase().includes(cleanText(needle).toLowerCase()));
}

/** @param {Record<string, unknown>} component @param {Map<string,string>} dispositions @returns {Readonly<Record<string, unknown>>} */
function componentView(component, dispositions) {
  return deepFreeze({
    objectKey: cleanText(component.viewKey), sourceEntityId: cleanText(component.sourceEntityId), sourcePath: cleanText(component.sourcePath),
    branch: cleanText(component.sourceBranch), sourceIndex: component.sourceIndex, type: cleanText(component.type), componentCategory: cleanText(component.componentCategory),
    geometryClassification: cleanText(component.geometryClassification), name: cleanText(component.name), ref: cleanText(component.ref),
    positions: deepFreeze(objectRecord(component.positions)), references: deepFreeze(objectRecord(component.references)), attributes: deepFreeze(objectRecord(component.attributes)),
    disposition: dispositions.get(cleanText(component.sourceEntityId) || cleanText(component.sourcePath)) ?? '',
  });
}

/** @param {Record<string, unknown>} branch @param {Map<string,string>} dispositions @returns {Readonly<Record<string, unknown>>} */
function branchView(branch, dispositions) {
  return deepFreeze({
    objectKey: cleanText(branch.viewKey), sourceEntityId: cleanText(branch.sourceEntityId), sourcePath: cleanText(branch.sourcePath),
    branch: cleanText(branch.name), sourceIndex: branch.branchIndex, type: 'BRANCH', componentCategory: 'BRANCH', geometryClassification: 'BRANCH',
    name: cleanText(branch.name), ref: cleanText(branch.ref), positions: deepFreeze(objectRecord(branch.positions)), references: deepFreeze(objectRecord(branch.references)),
    disposition: dispositions.get(cleanText(branch.sourceEntityId) || cleanText(branch.sourcePath)) ?? '',
  });
}

/** @param {Record<string, unknown>} record @returns {Readonly<Record<string, unknown>>} */
function traceLinkView(record) {
  const list = (field) => Object.freeze(asArray(record[field]).map(cleanText));
  return deepFreeze({
    objectKey: cleanText(record.viewKey), recordId: cleanText(record.recordId), sourceEntityId: cleanText(record.sourceEntityId), sourcePath: cleanText(record.sourcePath),
    sourceType: cleanText(record.sourceType), sourceRef: cleanText(record.sourceRef), disposition: cleanText(record.disposition), primaryDisposition: cleanText(record.primaryDisposition),
    operation: cleanText(record.operation), status: cleanText(record.status), classification: cleanText(record.classification), projectionCardinality: cleanText(record.projectionCardinality),
    canonicalNodeIds: list('canonicalNodeIds'), canonicalEdgeIds: list('canonicalEdgeIds'), affectedEdgeIds: list('affectedEdgeIds'), branchEdgeIds: list('branchEdgeIds'),
    pointFeatureIds: list('pointFeatureIds'), junctionIds: list('junctionIds'), boundaryIds: list('boundaryIds'), affectedSourceEntityIds: list('affectedSourceEntityIds'),
    inputXmlElementIds: list('inputXmlElementIds'), inputXmlChildIds: list('inputXmlChildIds'), deferredProperties: list('deferredProperties'), evidence: deepFreeze(objectRecord(record.evidence)),
  });
}

/** @param {Record<string, unknown>} input @returns {Readonly<Record<string, unknown>>} */
export function buildTopologySvgViewModel(input) {
  const source = objectRecord(input.source), canonical = objectRecord(input.canonical), ledger = objectRecord(input.ledger);
  const validation = objectRecord(input.validation), state = objectRecord(input.state), inputXml = input.inputXml ? objectRecord(input.inputXml) : null;
  const dispositionMap = new Map(asArray(ledger.records).map((row) => {
    const record = objectRecord(row);
    return [cleanText(record.sourceEntityId) || cleanText(record.sourcePath), cleanText(record.disposition)];
  }));
  const allComponents = asArray(source.components).map(objectRecord), componentViews = allComponents.map((component) => componentView(component, dispositionMap));
  const sourceComponents = componentViews.filter((_view, index) => componentVisible(allComponents[index], state, dispositionMap));
  const branchViews = asArray(source.branches).map(objectRecord).map((branch) => branchView(branch, dispositionMap));
  const sourceEntities = [...branchViews, ...componentViews];
  const traceSources = [...branchViews.filter((branch) => !cleanText(state.branch) || branch.branch === cleanText(state.branch)), ...sourceComponents];
  const visibleSourceKeys = new Set(traceSources.flatMap((component) => [component.sourceEntityId, component.sourcePath]).filter(Boolean));
  const fullTraceLinks = asArray(ledger.records).map(objectRecord).map(traceLinkView);
  const traceLinks = fullTraceLinks.filter((record) => visibleSourceKeys.has(cleanText(record.sourceEntityId)) || visibleSourceKeys.has(cleanText(record.sourcePath)));
  const projection = cleanText(state.projection);
  const projectCanonical = (row, kind) => {
    const record = objectRecord(row);
    return deepFreeze({
      ...record,
      objectKey: `canonical:${kind}:${cleanText(record.id) || cleanText(record.viewKey)}`,
      projectedPosition: projectTopologyPoint(record.position, projection),
    });
  };
  const nodes = asArray(canonical.nodes).map((row) => projectCanonical(row, 'node'));
  const nodeMap = new Map(nodes.map((node) => [cleanText(node.id), node]));
  const edges = asArray(canonical.edges).map((row) => {
    const edge = objectRecord(row), from = nodeMap.get(cleanText(edge.fromNodeId)), to = nodeMap.get(cleanText(edge.toNodeId));
    const edgeLinks = fullTraceLinks.filter((link) => asArray(link.canonicalEdgeIds).map(cleanText).includes(cleanText(edge.id)));
    const directInputIds = uniqueText(asArray(edge.inputXmlElementIds)), ledgerInputIds = uniqueText(edgeLinks.flatMap((link) => asArray(link.inputXmlElementIds)));
    return deepFreeze({
      ...edge,
      objectKey: `canonical:edge:${cleanText(edge.id) || cleanText(edge.viewKey)}`,
      sourceEntityIds: uniqueText([...asArray(edge.sourceEntityIds), ...edgeLinks.map((link) => link.sourceEntityId)]),
      sourceTypes: uniqueText([...asArray(edge.sourceTypes), ...edgeLinks.map((link) => link.sourceType)]),
      inputXmlElementIds: directInputIds.length ? directInputIds : ledgerInputIds.length === 1 ? ledgerInputIds : [],
      projectedStart: from?.projectedPosition ?? null,
      projectedEnd: to?.projectedPosition ?? null,
    });
  });
  const pointFeatures = asArray(canonical.pointFeatures).map((row) => projectCanonical(row, 'pointFeature'));
  const junctions = asArray(canonical.junctions).map((row) => projectCanonical(row, 'junction'));
  const boundaries = asArray(canonical.boundaries).map((row) => projectCanonical(row, 'boundary'));
  const sourceGeometry = sourceComponents.map((component) => deepFreeze({
    ...component,
    projectedStart: projectTopologyPoint(objectRecord(component.positions).APOS, projection),
    projectedEnd: projectTopologyPoint(objectRecord(component.positions).LPOS, projection),
    projectedPoint: projectTopologyPoint(objectRecord(component.positions).POS, projection),
  }));
  const projectedPoints = [
    ...sourceGeometry.flatMap((row) => [row.projectedStart, row.projectedEnd, row.projectedPoint]),
    ...nodes.map((row) => row.projectedPosition),
    ...pointFeatures.map((row) => row.projectedPosition),
    ...junctions.map((row) => row.projectedPosition),
    ...boundaries.map((row) => row.projectedPosition),
  ];
  const inputXmlElements = inputXml ? asArray(inputXml.elements).map((row) => {
    const element = objectRecord(row);
    return deepFreeze({ objectKey: cleanText(element.viewKey), id: cleanText(element.id), fromNode: cleanText(element.fromNode), toNode: cleanText(element.toNode), sourceType: cleanText(element.sourceType), delta: deepFreeze(objectRecord(element.delta)), children: deepFreeze(asArray(element.children)) });
  }) : [];
  const sourcePorts = asArray(source.ports).map(objectRecord).filter((port) => sourceGeometry.some((component) => cleanText(port.viewKey).startsWith(`${component.objectKey}:port:`))).map((port) => deepFreeze({
    objectKey: cleanText(port.viewKey),
    sourcePortId: cleanText(port.sourcePortId),
    role: cleanText(port.role),
    projectedPosition: projectTopologyPoint(port.position, projection),
  }));
  const issues = asArray(validation.issues).map((row) => {
    const finding = objectRecord(row);
    const keys = uniqueText([
      ...asArray(finding.sourceEntityIds).flatMap((id) => sourceEntities.filter((item) => item.sourceEntityId === cleanText(id)).map((item) => item.objectKey)),
      ...asArray(finding.canonicalIds).flatMap((id) => [
        `canonical:node:${cleanText(id)}`, `canonical:edge:${cleanText(id)}`, `canonical:pointFeature:${cleanText(id)}`, `canonical:junction:${cleanText(id)}`, `canonical:boundary:${cleanText(id)}`,
      ]),
      ...asArray(finding.inputXmlElementIds).flatMap((id) => inputXmlElements.filter((item) => item.id === cleanText(id)).map((item) => item.objectKey)),
    ]);
    return deepFreeze({ ...finding, objectKeys: keys });
  });
  const byObjectKey = buildTopologySelectionLookup({
    sources: sourceEntities, nodes, edges, points: pointFeatures, junctions, boundaries,
    links: fullTraceLinks, inputElements: inputXmlElements, issues,
  });
  return deepFreeze({
    schema: TOPOLOGY_VIEW_MODEL_SCHEMA,
    mode: cleanText(state.mode),
    projection,
    bounds: calculateTopologyBounds(projectedPoints),
    visibility: deepFreeze(objectRecord(state.visibility)),
    labels: state.labels === true,
    showComponentSymbols: state.showComponentSymbols === true,
    branches: Object.freeze(asArray(source.branches).map(objectRecord).filter((row) => !cleanText(state.branch) || cleanText(row.name) === cleanText(state.branch)).map((row) => ({ name: cleanText(row.name), sourcePath: cleanText(row.sourcePath), references: deepFreeze(objectRecord(row.references)) }))),
    branchReferences: filterBranchReferences(objectRecord(source.references), cleanText(state.branch)),
    sourceComponents: Object.freeze(sourceGeometry),
    sourceEntities: Object.freeze(sourceEntities),
    traceSources: Object.freeze(traceSources),
    sourcePorts: Object.freeze(sourcePorts),
    canonicalNodes: Object.freeze(nodes),
    canonicalEdges: Object.freeze(edges),
    pointFeatures: Object.freeze(pointFeatures),
    junctions: Object.freeze(junctions),
    boundaries: Object.freeze(boundaries),
    traceLinks: Object.freeze(traceLinks),
    fullTraceLinks: Object.freeze(fullTraceLinks),
    inputXmlElements: Object.freeze(inputXmlElements),
    issues: Object.freeze(issues),
    metrics: deepFreeze(objectRecord(validation.metrics)),
    gates: deepFreeze(objectRecord(validation.gates)),
    inputXmlStatus: cleanText(validation.inputXmlStatus),
    componentInputXmlStatus: cleanText(validation.componentInputXmlStatus),
    selectionLookup: deepFreeze({ byObjectKey }),
  });
}

export const _test = Object.freeze({ componentVisible, componentView, branchView, traceLinkView });

/** @param {Record<string, unknown>} references @param {string} branch @returns {Readonly<Record<string, unknown>>} */
function filterBranchReferences(references, branch) {
  const filter = (rows) => Object.freeze(asArray(rows).map(objectRecord).filter((row) => !branch || cleanText(row.branchName) === branch));
  return deepFreeze({
    branchReferences: filter(references.branchReferences),
    crefReferences: filter(references.crefReferences),
  });
}
