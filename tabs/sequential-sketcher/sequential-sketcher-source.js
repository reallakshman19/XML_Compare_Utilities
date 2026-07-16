import {
  canonicalComponentType, isRouteComponent, pointFrom, stableToken,
} from './sequential-sketcher-contract.js';

export function parseStagedJson(text) {
  let parsed;
  try { parsed = JSON.parse(String(text || '')); }
  catch (error) { throw new Error(`Source JSON is invalid: ${error.message}`); }
  if (!Array.isArray(parsed)) throw new Error('Source JSON root must be an array of branch records.');
  return parsed;
}

export function branchIdentity(record) {
  return String(record?.attributes?.NAME || record?.name || '').trim();
}

export function listBranchIds(records) {
  return records
    .filter((record) => String(record?.type || '').toUpperCase() === 'BRANCH')
    .map(branchIdentity).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function selectExactBranch(records, branchId) {
  const target = String(branchId || '').trim();
  const matches = records.filter((record) => branchIdentity(record) === target);
  if (!matches.length) throw new Error(`Exact branch was not found: ${target || '(blank)'}`);
  if (matches.length > 1) throw new Error(`Exact branch is duplicated ${matches.length} times: ${target}`);
  return matches[0];
}

function componentIdentity(child, branchId, sourceIndex) {
  return String(
    child?.attributes?.NAME || child?.attributes?.REF || child?.name ||
    `${branchId}#CHILD-${sourceIndex + 1}`
  ).trim();
}

export function buildBranchInventory(branch) {
  const branchId = branchIdentity(branch);
  const children = Array.isArray(branch?.children) ? branch.children : [];
  const routeComponents = [];
  const ignoredRecords = [];
  children.forEach((child, sourceIndex) => {
    const sourceType = String(child?.type || child?.attributes?.TYPE || '').toUpperCase();
    if (!isRouteComponent(sourceType)) {
      ignoredRecords.push(Object.freeze({ sourceIndex, sourceType, name: componentIdentity(child, branchId, sourceIndex) }));
      return;
    }
    const attributes = child?.attributes && typeof child.attributes === 'object' ? child.attributes : {};
    const canonicalType = canonicalComponentType(sourceType);
    const componentId = componentIdentity(child, branchId, sourceIndex);
    const a = pointFrom(attributes.APOS || attributes.HPOS);
    const b = pointFrom(attributes.LPOS || attributes.TPOS);
    const position = pointFrom(attributes.POS || attributes.BPOS) || a || b;
    routeComponents.push(Object.freeze({
      id: `${canonicalType}-${stableToken(`${branchId}|${componentId}|${sourceIndex}`)}`,
      componentId, branchId, sourceIndex, sourceType, canonicalType,
      a, b, position,
      cref: String(attributes.CREF || '').trim(),
      attributes,
    }));
  });
  return Object.freeze({
    branchId,
    attributes: branch?.attributes || {},
    routeComponents: Object.freeze(routeComponents),
    ignoredRecords: Object.freeze(ignoredRecords),
    sourceChildCount: children.length,
  });
}

export function parseSupportBundle(text) {
  if (!String(text || '').trim()) return null;
  let parsed;
  try { parsed = JSON.parse(String(text)); }
  catch (error) { throw new Error(`Support bundle JSON is invalid: ${error.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Support bundle must be a JSON object.');
  return parsed;
}
