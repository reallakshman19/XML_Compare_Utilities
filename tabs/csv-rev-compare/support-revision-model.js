import { graphChildren } from '../../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { normalizeLoadVector, parsePipeIdentity, parseSupportPosition } from './support-revision-normalization.js';

export const SUPPORT_REVISION_MODEL_SCHEMA = 'support-revision-xml-model/v2-composite-location-identity';

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const normalizeIdentityPart = (value) => upper(value).replace(/\s+/g, ' ');

export function buildSupportRevisionModel(conversion) {
  if (!conversion?.graph) throw new Error('A categorized support-revision graph is required.');
  const graph = conversion.graph;
  const source = conversion.source || null;
  const secondaryNodes = (graph.nodes || []).filter((node) => node.levelId === 'secondarySupport');
  const locations = [];
  for (const secondaryNode of secondaryNodes) {
    for (const locationNode of graphChildren(graph, secondaryNode.id).filter((node) => node.levelId === 'supportLocation')) {
      locations.push(buildLocation(graph, source, secondaryNode, locationNode));
    }
  }
  const locationByNodeId = new Map(locations.map((location) => [location.nodeId, location]));
  return Object.freeze({
    schema: SUPPORT_REVISION_MODEL_SCHEMA,
    revision: String(conversion.revision || ''),
    profileId: graph.profileId,
    sourceId: conversion.source?.sourceId || graph.sourceIds?.[0] || '',
    locations: Object.freeze(locations),
    locationByNodeId,
    diagnostics: Object.freeze([...(graph.diagnostics || []), ...(conversion.validationResults || [])]),
  });
}

function buildLocation(graph, source, secondaryNode, locationNode) {
  const children = graphChildren(graph, locationNode.id);
  const pipeNode = children.find((node) => node.levelId === 'pipe') || null;
  const positionNode = children.find((node) => node.levelId === 'position') || null;
  const componentNodes = children.filter((node) => node.levelId === 'primarySupport');
  const loadNodes = children.filter((node) => node.levelId === 'load');
  const family = clean(locationNode.fields?.civilSecondarySupport || secondaryNode.fields?.civilSecondarySupport || secondaryNode.key);
  const rowId = locationNode.sourceRefs?.[0] || '';
  const components = Object.freeze(componentNodes.map((node) => componentFromNode(source, rowId, node)));
  const persistentReferences = Object.freeze([...new Set(components.map((item) => item.reference).filter(Boolean))].sort());
  const pipe = parsePipeIdentity(pipeNode?.fields?.raw || pipeNode?.key || '');
  const supportLocationIdentity = compositeSupportLocationIdentity(family, pipe.raw);
  const position = parseSupportPosition(positionNode?.fields || {});
  const loads = normalizeLoadVector(loadNodes.map((node) => ({ nodeId: node.id, ...node.fields, sourceRefs: node.sourceRefs })));
  return Object.freeze({
    nodeId: locationNode.id,
    secondaryNodeId: secondaryNode.id,
    sourceRowId: rowId,
    family,
    familyClass: familyClass(family),
    supportLocationIdentity,
    supportLocationIdentityRaw: clean(locationNode.fields?.supportLocationIdentity || locationNode.key || `${family}||${pipe.raw}`),
    legacyIdentity: clean(locationNode.fields?.legacyIdentity || secondaryNode.fields?.legacyIdentity),
    scope: clean(locationNode.fields?.scope),
    size: clean(locationNode.fields?.size),
    pipe,
    position,
    components,
    persistentReferences,
    referenceSetKey: persistentReferences.join('|'),
    loads,
    sourceFields: Object.freeze({ ...(locationNode.fields || {}) }),
    provenance: Object.freeze({
      locationNodeId: locationNode.id,
      secondaryNodeId: secondaryNode.id,
      sourceRowId: rowId,
      cells: locationCellRefs(source, rowId),
    }),
  });
}

export function compositeSupportLocationIdentity(civilSecondarySupport, pipeRaw) {
  return `${normalizeIdentityPart(civilSecondarySupport)}||${normalizeIdentityPart(pipeRaw)}`;
}

function componentFromNode(source, rowId, node) {
  const memberId = clean(node.fields?.memberId || node.fields?.value);
  const supportType = clean(node.fields?.supportType);
  const reference = normalizeReference(node.fields?.reference);
  return Object.freeze({
    nodeId: node.id,
    sourceRowId: node.sourceRefs?.[0] || rowId,
    ordinal: Number(node.fields?.manyOrdinal || 0),
    memberId,
    memberFamily: memberFamily(memberId),
    supportType,
    supportTypeKey: upper(supportType),
    reference,
    provenance: Object.freeze({
      sourceRowId: node.sourceRefs?.[0] || rowId,
      memberCells: cellRefs(source, rowId, 'PIPING PRIMARY SUPPORT'),
      supportTypeCells: cellRefs(source, rowId, 'SUPPORT TYPE'),
      referenceCells: cellRefs(source, rowId, 'PIPING PRIMARY SUPPORT REFERENCE'),
      graphEvidence: Object.freeze([...(node.evidence || [])]),
    }),
  });
}

function normalizeReference(value) {
  return clean(value).replace(/\s+/g, '');
}

function memberFamily(memberId) {
  const value = clean(memberId).replace(/^\//, '');
  const dot = value.lastIndexOf('.');
  return dot > 0 ? value.slice(0, dot) : value;
}

function familyClass(family) {
  const value = clean(family).replace(/^\//, '');
  return value.replace(/[._-]?\d+$/i, '') || value;
}

function locationCellRefs(source, rowId) {
  const headers = [
    'PREV NAME', 'SCOPE', 'CIVILSECONDARYSUPPORT', 'PIPE', 'SIZE',
    'EAST/WEST', 'NORTH/SOUTH', 'BOP ELEVATION',
    'TOTAL SUPPORT POINTS ON SECONDARY', 'PRIMARY SUPPORT DESCRIPTION',
    'PRIMARY SUPPORT ZONE', 'PRIMARY SUPPORT SITE', 'PIPE SCHEDULE', 'INSULATION',
    'STRESS SYSTEM NUMBER', 'NODE NO', 'REVISION', 'REMARKS (IF ANY)',
  ];
  return Object.freeze(Object.fromEntries(headers.map((header) => [header, cellRefs(source, rowId, header)])));
}

function cellRefs(source, rowId, header) {
  if (!source) return Object.freeze([]);
  const refs = (source.headers || []).flatMap((candidate, index) => candidate === header ? [`${rowId}:${source.columnIds?.[index] || header}`] : []);
  return Object.freeze(refs);
}

export function referenceIndex(model) {
  const index = new Map();
  for (const location of model?.locations || []) {
    for (const component of location.components) {
      if (!component.reference) continue;
      if (!index.has(component.reference)) index.set(component.reference, []);
      index.get(component.reference).push(Object.freeze({ location, component }));
    }
  }
  return index;
}

export function componentByReference(location) {
  return new Map((location?.components || []).filter((component) => component.reference).map((component) => [component.reference, component]));
}

export const _test = Object.freeze({ normalizeReference, memberFamily, familyClass, cellRefs, normalizeIdentityPart });
