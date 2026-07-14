import { STAGED_JSON_TREE_SCHEMA, firstConfiguredValue, normalizeConfig, normalizeSupportIdentity, parseCoordinate, supportRoot, text } from './navis-tag-isonote-contracts.js';

function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function scalar(value) { return value == null || ['string', 'number', 'boolean'].includes(typeof value); }
function coordinateLike(value) {
  if (!isObject(value)) return false;
  const keys = Object.keys(value).map((key) => key.toUpperCase());
  return ['X', 'Y', 'Z'].every((key) => keys.includes(key)) || ['E', 'N', 'EL'].every((key) => keys.includes(key));
}

function collectLocalValues(value, prefix = '', out = {}, depth = 0) {
  if (!isObject(value) || depth > 4) return out;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (scalar(child)) out[path] = child;
    else if (coordinateLike(child)) {
      out[path] = { ...child };
      collectLocalValues(child, path, out, depth + 1);
    } else if (isObject(child) && !['children', 'items', 'members', 'elements', 'components'].includes(key.toLowerCase())) {
      collectLocalValues(child, path, out, depth + 1);
    }
  }
  return out;
}

function nodeType(value, values) {
  return text(values.type ?? values.TYPE ?? values['attributes.TYPE'] ?? value?.type ?? value?.kind ?? 'OBJECT').toUpperCase();
}
function nodeName(value, values, fallback) {
  return text(values.name ?? values.NAME ?? values['attributes.NAME'] ?? values['attributes.OWNER'] ?? value?.name ?? fallback);
}
function childEntries(value) {
  const entries = [];
  if (Array.isArray(value)) value.forEach((child, index) => entries.push({ key: index, value: child }));
  else if (isObject(value)) for (const [key, child] of Object.entries(value)) if (child && typeof child === 'object') {
    if (isObject(child) && ['attributes', 'properties', 'metadata'].includes(key.toLowerCase())) continue;
    entries.push({ key, value: child });
  }
  return entries;
}

function appendPathStat(pathStats, path, value) {
  if (!path) return;
  const stat = pathStats.get(path) || { path, count: 0, samples: [] };
  stat.count += 1;
  const sample = typeof value === 'object' ? JSON.stringify(value) : text(value);
  if (sample && !stat.samples.includes(sample) && stat.samples.length < 5) stat.samples.push(sample);
  pathStats.set(path, stat);
}

function inferBranch(node, byId, config) {
  let current = node;
  while (current) {
    const configured = firstConfiguredValue(current, config.jsonBranchPaths);
    if (configured.value) return { value: text(configured.value), path: configured.path, nodeId: current.nodeId };
    if (current.rawType === 'BRANCH') return { value: current.rawName, path: 'hierarchy:type=BRANCH', nodeId: current.nodeId };
    if (/ASIM-.*\/B\d+$/i.test(current.rawName)) return { value: current.rawName, path: 'hierarchy:name', nodeId: current.nodeId };
    current = current.parentNodeId ? byId.get(current.parentNodeId) : null;
  }
  return { value: '', path: '', nodeId: '' };
}

export function buildStagedJsonHierarchy(documents = [], inputConfig = {}) {
  const config = normalizeConfig(inputConfig);
  const nodes = [];
  const byId = new Map();
  const pathStats = new Map();
  const roots = [];
  let sequence = 0;

  const visit = (value, meta) => {
    const values = collectLocalValues(isObject(value) ? value : {});
    const nodeId = `SJ-${++sequence}`;
    const rawType = Array.isArray(value) ? 'ARRAY' : nodeType(value, values);
    const rawName = Array.isArray(value) ? `${meta.key}[${value.length}]` : nodeName(value, values, String(meta.key));
    const node = {
      nodeId,
      parentNodeId: meta.parentNodeId || '',
      sourceFile: meta.sourceFile,
      sourceDocumentIndex: meta.sourceDocumentIndex,
      depth: meta.depth,
      jsonPath: meta.jsonPath,
      rawType,
      rawName,
      kind: Array.isArray(value) ? 'array' : 'object',
      raw: value,
      values,
      childNodeIds: [],
      ancestorIds: [...meta.ancestorIds],
      hierarchyPath: [...meta.hierarchyPath, rawName].filter(Boolean),
      resolvedBranch: '',
      resolvedBranchPath: '',
      resolvedBranchNodeId: '',
    };
    nodes.push(node);
    byId.set(nodeId, node);
    if (!node.parentNodeId) roots.push(nodeId);
    else byId.get(node.parentNodeId)?.childNodeIds.push(nodeId);
    for (const [path, fieldValue] of Object.entries(values)) appendPathStat(pathStats, path, fieldValue);

    for (const child of childEntries(value)) {
      const childPath = Array.isArray(value) ? `${meta.jsonPath}[${child.key}]` : `${meta.jsonPath}.${child.key}`;
      visit(child.value, {
        parentNodeId: nodeId,
        sourceFile: meta.sourceFile,
        sourceDocumentIndex: meta.sourceDocumentIndex,
        depth: meta.depth + 1,
        jsonPath: childPath,
        key: child.key,
        ancestorIds: [...meta.ancestorIds, nodeId],
        hierarchyPath: node.hierarchyPath,
      });
    }
    return node;
  };

  documents.forEach((document, index) => {
    const sourceFile = text(document?.sourceFile) || `staged-${index + 1}.json`;
    const parsed = document?.data ?? document;
    visit(parsed, { parentNodeId: '', sourceFile, sourceDocumentIndex: index, depth: 0, jsonPath: '$', key: sourceFile, ancestorIds: [], hierarchyPath: [] });
  });

  for (const node of nodes) {
    const branch = inferBranch(node, byId, config);
    node.resolvedBranch = branch.value;
    node.resolvedBranchPath = branch.path;
    node.resolvedBranchNodeId = branch.nodeId;
  }

  return {
    schema: STAGED_JSON_TREE_SCHEMA,
    config,
    nodes,
    roots,
    byId,
    pathCatalogue: [...pathStats.values()].sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
    summary: { documentCount: documents.length, nodeCount: nodes.length, rootCount: roots.length, discoveredPathCount: pathStats.size },
  };
}

function valueForIdentity(node, paths) {
  for (const path of paths) {
    const raw = node.values[path];
    const identity = normalizeSupportIdentity(raw);
    if (identity && supportRoot(identity)) return { path, raw, identity, root: supportRoot(identity) };
  }
  return null;
}

function numericValue(node, paths) {
  for (const path of paths) {
    const raw = node.values[path];
    if (raw == null || raw === '') continue;
    const number = Number(String(raw).match(/-?\d+(?:\.\d+)?/)?.[0]);
    if (Number.isFinite(number)) return { path, raw, value: number };
  }
  return { path: '', raw: '', value: null };
}

export function buildStagedSupportIndex(tree, inputConfig = {}) {
  const config = normalizeConfig({ ...(tree?.config || {}), ...inputConfig });
  const entries = [];
  const byIdentity = new Map();
  const byRoot = new Map();
  for (const node of tree?.nodes || []) {
    const identity = valueForIdentity(node, config.jsonIdentityPaths);
    if (!identity) continue;
    const positionEvidence = firstConfiguredValue(node, config.jsonPositionPaths);
    const position = parseCoordinate(positionEvidence.value, config.jsonUnits);
    const od = numericValue(node, config.jsonOdPaths);
    const bore = numericValue(node, config.jsonBorePaths);
    const entry = {
      nodeId: node.nodeId,
      sourceFile: node.sourceFile,
      jsonPath: node.jsonPath,
      hierarchyPath: node.hierarchyPath,
      rawType: node.rawType,
      rawName: node.rawName,
      identity: identity.identity,
      identityRaw: identity.raw,
      identityPath: identity.path,
      supportRoot: identity.root,
      position,
      positionRaw: positionEvidence.value,
      positionPath: positionEvidence.path,
      resolvedBranch: node.resolvedBranch,
      resolvedBranchPath: node.resolvedBranchPath,
      odMm: od.value,
      odPath: od.path,
      bore: bore.value,
      borePath: bore.path,
      node,
    };
    entries.push(entry);
    if (!byIdentity.has(entry.identity)) byIdentity.set(entry.identity, []);
    byIdentity.get(entry.identity).push(entry);
    if (!byRoot.has(entry.supportRoot)) byRoot.set(entry.supportRoot, []);
    byRoot.get(entry.supportRoot).push(entry);
  }
  return { config, entries, byIdentity, byRoot, summary: { indexedNodeCount: entries.length, exactIdentityCount: byIdentity.size, supportRootCount: byRoot.size } };
}

export function parseStagedJsonText(textValue, sourceFile = 'staged.json') {
  try { return { documents: [{ sourceFile, data: JSON.parse(String(textValue || '')) }], diagnostics: [] }; }
  catch (error) { return { documents: [], diagnostics: [{ severity: 'ERROR', code: 'STAGED_JSON_PARSE_FAILED', sourceFile, message: error?.message || String(error) }] }; }
}
