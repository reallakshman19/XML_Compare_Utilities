import { buildJsonTraceTree } from './json-trace-tree.js';
import { branchContainsMatch } from './json-trace-scope.js';

export const XML_CII_XML_NODE_TRACE_SCHEMA = 'xml-cii-xml-node-wise-trace/v2-dual-dtxr';

const NONE = '(none)';
const TRACE_TYPES = new Set(['dtxr-pos', 'dtxr-ps', 'support-match', 'dtxr-pos-sif-zero']);
const XML_NODE_TRACE_HEADERS = Object.freeze([
  ['xmlNode', 'XML Node'],
  ['xmlBranch', 'XML Branch'],
  ['componentType', 'Type'],
  ['jsonNodeNoDtxrPs', 'JsonNodeNo(DTXR_PS)'],
  ['jsonNodeNoDtxrPos', 'JsonNodeNo(DTXR_POS)'],
  ['matchType', 'Match Type'],
  ['posBasis', 'POS Basis'],
  ['dtxrPosValue', 'DTXR_POS Value'],
  ['dtxrPsName', 'DTXR_PS/NAME'],
  ['dtxrPsValue', 'DTXR_PS Value'],
  ['status', 'Status'],
]);
const EVIDENCE_TREE_HEADERS = Object.freeze([
  ['branchName', 'Branch'],
  ['bore', 'Bore'],
  ['evidenceType', 'Evidence Type'],
  ['group', 'Evidence Group'],
  ['jsonNodeNo', 'JsonNodeNo'],
  ['objectType', 'Object Type'],
  ['nodeNumber', 'Staged Node'],
  ['position', 'Position'],
  ['field', 'Field'],
  ['value', 'Value'],
  ['dtxrValue', 'DTXR Value'],
  ['name', 'NAME / REF'],
  ['sourcePath', 'JSON Path'],
  ['matchType', 'Trace Match Type'],
  ['resolved', 'Resolved'],
]);

function text(value) { return String(value ?? '').trim(); }
function unique(values = []) { return [...new Set(values.map(text).filter(Boolean))]; }
function rowValue(row = {}) { return text(row.finalValue || row.sourceRawValue || row.value || row.sourceAttributeValue); }
function componentPath(value) { const raw = text(value); const index = raw.indexOf('.attributes'); return index >= 0 ? raw.slice(0, index) : raw; }
function jsonNodeNo(row = {}) { return text(row.jsonNodeNo || row._jsonNodeNo); }
function numericNodeNo(value) { const number = Number(text(value)); return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER; }
function naturalNodeSort(left, right) { return numericNodeNo(left) - numericNodeNo(right) || text(left).localeCompare(text(right), undefined, { numeric: true }); }
function nodeRange(values = []) {
  const nodes = unique(values).sort(naturalNodeSort);
  if (!nodes.length) return NONE;
  if (nodes.length === 1) return nodes[0];
  return `${nodes[0]} to ${nodes[nodes.length - 1]}`;
}
function stripIdentityPrefix(value) { return text(value).replace(/^\s*=\s*/, '').replace(/^\/+/, ''); }
function identityKey(value) { return stripIdentityPrefix(value).replace(/[\s\-_/=]+/g, '').toUpperCase(); }
function isSupportLike(componentType, nodeName) { return /^(ATTA|ANCI|REST|RESTRAINT|SUPPORT)$/i.test(text(componentType)) || /^\/?PS-?\d/i.test(text(nodeName)); }
function isSideLoadType(value) { return /^sideload-restraint/.test(text(value)); }
function isPositionField(value) { return /(^|[^A-Z])(POS|APOS|LPOS|BPOS|HPOS|TPOS|SPOS|EPOS|POSITION)([^A-Z]|$)/i.test(text(value)); }
function isDescriptionField(row = {}) { return /DTXR|DESC|DESCRIPTION/i.test(`${row.field || ''} ${row.sourceAttributeName || ''} ${row.sourcePath || ''}`) && !isPositionField(row.field || row.sourceAttributeName); }
function isIdentityField(row = {}) { return /(^|[^A-Z])(NAME|REF|STEX|CMPSTRESSN|CMPSUPREFN|SUPPORT_TAG)([^A-Z]|$)/i.test(`${row.field || ''} ${row.sourceAttributeName || ''} ${row.sourcePath || ''}`); }
function branchMatches(xmlBranch, stagedBranch) {
  if (!text(xmlBranch)) return true;
  if (!text(stagedBranch)) return false;
  return Boolean(branchContainsMatch(xmlBranch, stagedBranch) || branchContainsMatch(stagedBranch, xmlBranch));
}
function tagContent(block, tag) {
  const match = String(block || '').match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return text(match?.[1]).replace(/<[^>]+>/g, ' ').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&amp;/gi, '&').trim();
}
function nodeBlocks(block) { return [...String(block || '').matchAll(/<Node\b[^>]*>[\s\S]*?<\/Node>/gi)].map((match) => match[0]); }

export function extractXmlNodeTraceSeeds(xmlText = '') {
  const rows = [];
  const source = String(xmlText || '');
  const branchMatchesList = [...source.matchAll(/<Branch\b[^>]*>([\s\S]*?)<\/Branch>/gi)];
  const append = (branchBlock, branchName) => {
    for (const nodeBlock of nodeBlocks(branchBlock)) {
      rows.push(Object.freeze({
        xmlNode: tagContent(nodeBlock, 'NodeNumber'),
        xmlBranch: branchName,
        componentType: tagContent(nodeBlock, 'ComponentType'),
        nodeName: tagContent(nodeBlock, 'NodeName'),
        componentRefNo: tagContent(nodeBlock, 'ComponentRefNo'),
        position: tagContent(nodeBlock, 'Position'),
      }));
    }
  };
  if (branchMatchesList.length) {
    for (const match of branchMatchesList) append(match[1], tagContent(match[1], 'Branchname'));
  } else {
    append(source, tagContent(source, 'Branchname'));
  }
  return Object.freeze(rows);
}

function positionParts(value) {
  const source = text(value);
  if (!source) return null;
  const directional = {};
  source.replace(/\b(E|EAST|EASTING|N|NORTH|NORTHING|EL|ELEV|ELEVATION|U|Z)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/gi, (_, axis, raw) => {
    const key = axis.toUpperCase();
    if (key.startsWith('E') && !['EL', 'ELEV', 'ELEVATION'].includes(key)) directional.x = Number(raw);
    else if (key.startsWith('N')) directional.y = Number(raw);
    else directional.z = Number(raw);
    return '';
  });
  if ([directional.x, directional.y, directional.z].every(Number.isFinite)) return directional;
  const values = source.match(/-?\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) || [];
  return values.length === 3 && values.every(Number.isFinite) ? { x: values[0], y: values[1], z: values[2] } : null;
}
function positionLabel(value) {
  const point = positionParts(value);
  if (!point) return text(value) || NONE;
  return `E=${point.x} N=${point.y} EL=${point.z}`;
}
function positionKey(value) {
  const point = positionParts(value);
  if (!point) return '';
  return [point.x, point.y, point.z].map((number) => Math.round(number * 1000) / 1000).join('|');
}
function groupPositionKey(group = {}) { return positionKey(group.label); }
function leafDescription(leaf = {}) {
  if (isPositionField(`${leaf.field || ''} ${leaf.sourcePath || ''}`)) return '';
  return text(leaf.dtxrValue || leaf.value);
}
function branchPositionGroups(traceRows, xmlBranch) {
  const scoped = (traceRows || []).filter((row) => branchMatches(xmlBranch, row.branchName || row.stagedBranchKey || row.xmlBranchKey));
  const tree = buildJsonTraceTree(scoped, { rowLimit: 9999, groupLimit: 9999, useDelimiter: true, delimiter: ' | ', joinMode: 'unique' });
  const branches = tree.branches.filter((branch) => branchMatches(xmlBranch, branch.branchName));
  const groups = [];
  for (const branch of branches) {
    for (const bore of branch.bores || []) {
      const bucket = (bore.buckets || []).find((item) => item.label === 'DTXR-POS');
      for (const group of bucket?.groups || []) {
        const descriptions = unique((group.rows || []).map(leafDescription).filter(Boolean));
        if (!descriptions.length) continue;
        const nodes = unique((group.rows || []).map((row) => row.jsonNodeNo));
        const paths = unique((group.rows || []).map((row) => componentPath(row.sourcePath)));
        groups.push({ label: group.label, key: groupPositionKey(group), descriptions, value: descriptions.join(' | '), nodes, paths, rows: group.rows || [] });
      }
    }
  }
  groups.sort((left, right) => naturalNodeSort(left.nodes[0], right.nodes[0]));
  return groups;
}
function branchContext(groups = []) {
  return {
    nodeRange: nodeRange(groups.flatMap((group) => group.nodes)),
    value: groups.map((group) => group.value).filter(Boolean).join('||') || NONE,
  };
}
function exactPositionGroup(groups, xmlPosition) {
  const key = positionKey(xmlPosition);
  return key ? groups.find((group) => group.key === key) || null : null;
}
function candidateTraceRows(traceRows, seed) {
  const keys = unique([seed.nodeName, seed.componentRefNo, ...(seed.tags || []), ...(seed.matchedKeys || [])]).map(identityKey).filter(Boolean);
  const rows = (traceRows || []).filter((row) => branchMatches(seed.xmlBranch, row.branchName || row.stagedBranchKey || row.xmlBranchKey));
  const scored = [];
  for (const row of rows) {
    const value = rowValue(row);
    const rowKeys = unique([value, row.name, row.matchedToken, row.matchedText]).map(identityKey).filter(Boolean);
    const exact = keys.some((key) => rowKeys.includes(key));
    const contains = !exact && keys.some((key) => rowKeys.some((rowKey) => rowKey.includes(key) || key.includes(rowKey)));
    const pathMatch = (seed.positionPaths || []).includes(componentPath(row.sourcePath || row.jsonPath));
    let score = exact ? 120 : contains ? 80 : 0;
    if (isIdentityField(row)) score += 30;
    if (/^DTXR_PS/.test(text(row.xmlTraceScope))) score += 20;
    if (pathMatch) score += 15;
    if (score > 0) scored.push({ row, score, path: componentPath(row.sourcePath || row.jsonPath) });
  }
  return scored.sort((left, right) => right.score - left.score || naturalNodeSort(jsonNodeNo(left.row), jsonNodeNo(right.row)));
}
function descriptionRowsAtPath(traceRows, path) {
  if (!path) return [];
  return (traceRows || []).filter((row) => componentPath(row.sourcePath || row.jsonPath) === path && (isDescriptionField(row) || /^DTXR_POS/.test(text(row.xmlTraceScope))));
}
function effectiveIdentityName(seed, identityRow) {
  return stripIdentityPrefix(seed.nodeName || rowValue(identityRow) || seed.componentRefNo) || NONE;
}
function meaningfulDiagnosticValue(value) {
  const output = text(value);
  return output && output !== NONE ? output : '';
}
function diagnosticGroups(diagnostics = []) {
  const map = new Map();
  for (const row of diagnostics || []) {
    const type = text(row.type);
    if (!TRACE_TYPES.has(type) && !isSideLoadType(type)) continue;
    const key = `${text(row.branchName)}\u0001${text(row.nodeNumber)}\u0001${text(row.componentType)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}
function seedKey(seed) { return `${text(seed.xmlBranch)}\u0001${text(seed.xmlNode)}\u0001${text(seed.componentType)}`; }
function combineSeeds(xmlSeeds, diagnostics) {
  const groups = diagnosticGroups(diagnostics);
  const rows = [...xmlSeeds];
  const existing = new Set(rows.map(seedKey));
  for (const [key, items] of groups) {
    if (existing.has(key)) continue;
    const first = items[0] || {};
    rows.push({ xmlNode: first.nodeNumber || '', xmlBranch: first.branchName || '', componentType: first.componentType || '', nodeName: first.nodeName || '', componentRefNo: first.componentRefNo || '', position: first.position || first.matchedKey || '' });
  }
  return { rows, groups };
}

function buildDecision(seed, diagnosticRows, traceRows) {
  const posDiagnostic = diagnosticRows.find((row) => text(row.type) === 'dtxr-pos') || null;
  const psDiagnostic = diagnosticRows.find((row) => text(row.type) === 'dtxr-ps') || null;
  const supportDiagnostic = diagnosticRows.find((row) => text(row.type) === 'support-match') || null;
  const xmlPosition = seed.position || posDiagnostic?.position || supportDiagnostic?.position || '';
  const positionGroups = branchPositionGroups(traceRows, seed.xmlBranch);
  const context = branchContext(positionGroups);
  const exactGroup = exactPositionGroup(positionGroups, xmlPosition);
  const positionPaths = exactGroup?.paths || [];
  const tags = unique([
    ...text(psDiagnostic?.tags).split('|'),
    ...(Array.isArray(supportDiagnostic?.tags) ? supportDiagnostic.tags : text(supportDiagnostic?.tags).split('|')),
  ]);
  const matchedKeys = unique([psDiagnostic?.matchedKey, supportDiagnostic?.matchedKey, posDiagnostic?.matchedKey]);
  const identityCandidates = candidateTraceRows(traceRows, { ...seed, tags, matchedKeys, positionPaths });
  const exactIdentity = identityCandidates[0] || null;
  const exactIdentityPath = exactIdentity?.path || '';
  const identityDescriptionRows = descriptionRowsAtPath(traceRows, exactIdentityPath);
  const candidatePosRows = identityDescriptionRows.length ? identityDescriptionRows : (exactIdentity ? [exactIdentity.row] : []);
  const supportLike = isSupportLike(seed.componentType, seed.nodeName);
  let psEvidenceRow = exactIdentity?.row || null;
  if (!exactGroup && !supportLike && candidatePosRows.length) psEvidenceRow = candidatePosRows[0];
  const psName = effectiveIdentityName(seed, psEvidenceRow);
  const fallbackDescription = unique(candidatePosRows.map(rowValue).filter(Boolean))[0]
    || meaningfulDiagnosticValue(psDiagnostic?.finalValue)
    || meaningfulDiagnosticValue(supportDiagnostic?.finalValue)
    || '';
  const positionPrimaryValue = exactGroup?.descriptions?.[0] || '';
  const psFallbackAllowed = !exactGroup && supportLike && Boolean(psName !== NONE && fallbackDescription);
  const matchType = exactGroup ? (psName !== NONE ? 'POS/PS' : 'POS') : (psFallbackAllowed ? 'PS' : 'none');
  const status = matchType === 'none' ? 'UNRESOLVED' : 'RESOLVED';
  const authority = exactGroup ? 'DTXR_POS_PRIMARY' : psFallbackAllowed ? 'DTXR_PS_FALLBACK' : 'NONE';
  let posNodeEvidence = context.nodeRange;
  if (!exactGroup) posNodeEvidence = nodeRange(candidatePosRows.map(jsonNodeNo));
  const psNodeEvidence = jsonNodeNo(psEvidenceRow) || (exactGroup?.nodes?.[0] || NONE);
  const dtxrPosValue = exactGroup ? context.value : NONE;
  const dtxrPsValue = exactGroup ? (positionPrimaryValue || NONE) : (psFallbackAllowed ? fallbackDescription : NONE);
  return Object.freeze({
    schema: XML_CII_XML_NODE_TRACE_SCHEMA,
    xmlNode: seed.xmlNode || NONE,
    xmlBranch: seed.xmlBranch || NONE,
    componentType: seed.componentType || NONE,
    jsonNodeNoDtxrPs: psNodeEvidence || NONE,
    jsonNodeNoDtxrPos: posNodeEvidence || NONE,
    matchType,
    posBasis: positionLabel(xmlPosition),
    dtxrPosValue,
    dtxrPsName: psName,
    dtxrPsValue,
    status,
    evidenceAuthority: authority,
    restraintSifBasis: authority,
    matchedPositionJsonNodes: exactGroup ? exactGroup.nodes : [],
    matchedPositionJsonPaths: exactGroup ? exactGroup.paths : [],
    identityJsonPath: exactIdentityPath,
    identityJsonNodeNo: psNodeEvidence || NONE,
    candidateCount: identityCandidates.length,
    diagnosticTypes: unique(diagnosticRows.map((row) => row.type)),
    // Backward-compatible fields used by existing filters and exports.
    jsonNodeNo: psNodeEvidence || posNodeEvidence || NONE,
    position: positionLabel(xmlPosition),
    basis: authority,
    field: 'xml-node-decision',
    finalValue: dtxrPsValue === NONE ? '' : dtxrPsValue,
    oldValue: '',
    detail: authority === 'DTXR_POS_PRIMARY' ? 'Restraint/SIF evidence selected from positional group; PS/NAME retained as identity provenance.' : authority === 'DTXR_PS_FALLBACK' ? 'No positional group resolved; support identity fallback used.' : 'Candidate provenance retained without applying a restraint/SIF fact.',
  });
}

export function buildXmlNodeWiseTraceRows({ xmlText = '', diagnostics = [], traceRows = [] } = {}) {
  const xmlSeeds = extractXmlNodeTraceSeeds(xmlText);
  const combined = combineSeeds(xmlSeeds, diagnostics);
  const rows = combined.rows.map((seed) => buildDecision(seed, combined.groups.get(seedKey(seed)) || [], traceRows));
  return Object.freeze(rows);
}

function csvCell(value) {
  const output = Array.isArray(value) ? value.join('|') : (value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
  return /[",\n\r]/.test(output) ? `"${output.replace(/"/g, '""')}"` : output;
}
function delimitedRows(rows, headers, delimiter = ',') {
  return [headers.map(([, label]) => csvCell(label)).join(delimiter), ...(rows || []).map((row) => headers.map(([key]) => csvCell(row?.[key])).join(delimiter))].join('\n');
}

export function xmlNodeWiseTraceToCsv(rows = []) { return delimitedRows(rows, XML_NODE_TRACE_HEADERS); }
export function matchedFactsToClipboardText(rows = []) { return delimitedRows((rows || []).filter((row) => row.status === 'RESOLVED'), XML_NODE_TRACE_HEADERS, '\t'); }

export function buildEvidenceTreeCsvRows(traceRows = [], options = {}) {
  const tree = buildJsonTraceTree(traceRows, { rowLimit: 99999, groupLimit: 99999, useDelimiter: options.useDelimiter === true, delimiter: options.delimiter || '|', joinMode: options.joinMode || 'unique' });
  const rows = [];
  for (const branch of tree.branches || []) {
    for (const bore of branch.bores || []) {
      for (const bucket of bore.buckets || []) {
        for (const group of bucket.groups || []) {
          for (const leaf of group.rows || []) rows.push({
            branchName: branch.branchName,
            bore: bore.boreKey,
            evidenceType: bucket.label,
            group: group.label,
            jsonNodeNo: leaf.jsonNodeNo,
            objectType: leaf.objectType,
            nodeNumber: leaf.nodeNumber,
            position: leaf.positionLabel,
            field: leaf.field,
            value: leaf.value,
            dtxrValue: leaf.dtxrValue,
            name: leaf.name,
            sourcePath: leaf.sourcePath,
            matchType: leaf.matchType,
            resolved: group.resolved ? 'YES' : 'NO',
          });
        }
      }
    }
  }
  return rows;
}
export function evidenceTreeToCsv(traceRows = [], options = {}) { return delimitedRows(buildEvidenceTreeCsvRows(traceRows, options), EVIDENCE_TREE_HEADERS); }

export const _test = Object.freeze({ positionKey, positionLabel, branchPositionGroups, candidateTraceRows, nodeRange });
