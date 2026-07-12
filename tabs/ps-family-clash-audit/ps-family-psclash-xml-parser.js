import { decodeXmlEntities, extractFamilyRoot, makeDisplayName, makeExactMemberKey, parseNumber, parsePipeTag, stripLeadingSlash } from './ps-family-token-utils.js';

function parseAttributes(tagText) {
  const attrs = {};
  const attrRegex = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(tagText))) attrs[match[1]] = decodeXmlEntities(match[2]);
  return attrs;
}

function extractNodes(pathlinkXml) {
  const nodes = [];
  const nodeRegex = /<node>([\s\S]*?)<\/node>/g;
  let match;
  while ((match = nodeRegex.exec(pathlinkXml))) nodes.push(stripLeadingSlash(match[1]));
  return nodes;
}

function extractSmartTagValue(clashObjectXml, tagName) {
  const tagRegex = /<smarttag>\s*<name>([\s\S]*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/smarttag>/g;
  let match;
  while ((match = tagRegex.exec(clashObjectXml))) {
    if (decodeXmlEntities(match[1]).trim().toLowerCase() === tagName.toLowerCase()) return stripLeadingSlash(match[2]);
  }
  return '';
}

function findLineBranchNode(path) {
  return [...path].reverse().find((node) => /ASIM-/i.test(node) && /\/B\d+$/i.test(node)) || '';
}

function findFamilyLeaf(path, fallback = '', options = {}) {
  return [...path].reverse().find((node) => extractFamilyRoot(node, options) && !/MAIN$/i.test(node)) || fallback;
}

function parseClashObject(clashObjectXml, options) {
  const pathlinkMatch = clashObjectXml.match(/<pathlink>([\s\S]*?)<\/pathlink>/i);
  const path = pathlinkMatch ? extractNodes(pathlinkMatch[1]) : [];
  const itemName = extractSmartTagValue(clashObjectXml, 'Item Name') || findFamilyLeaf(path, path[path.length - 1] || '', options);
  const branchNode = findLineBranchNode(path);
  return {
    itemName: makeDisplayName(itemName),
    exactMemberKey: makeExactMemberKey(itemName),
    familyRoot: extractFamilyRoot(itemName, options),
    branchNode,
    pipe: branchNode ? parsePipeTag(branchNode) : null,
    path,
  };
}

function clashNumber(name) {
  const match = String(name || '').match(/^(?:Clash)?(\d+)$/i);
  return match ? match[1] : String(name || '');
}

function rowFromObject(clashName, object, objects, index) {
  if (!object.familyRoot || !object.pipe) return null;
  const siblingCount = objects.filter((item) => item.familyRoot === object.familyRoot && item.branchNode === object.branchNode).length;
  return {
    psClashName: clashNumber(clashName),
    rawClashName: clashName,
    source: object.familyRoot,
    sourceObject: object.itemName,
    exactMemberKey: object.exactMemberKey,
    pipe: object.pipe.fullLineTag,
    lineFamily: object.pipe.lineFamily,
    fullLineTag: object.pipe.fullLineTag,
    branchNode: object.pipe.fullBranchNode,
    groupKey: `${clashName}|${object.familyRoot}|${object.pipe.fullBranchNode}`,
    groupIndex: index + 1,
    groupMemberCount: siblingCount,
  };
}

export function parsePsClashXml(xmlText, options = {}) {
  const source = String(xmlText || '');
  const rows = [];
  const diagnostics = [];
  if (!source.trim()) return { rows, diagnostics };
  const clashRegex = /<clashresult\b([^>]*)>([\s\S]*?)<\/clashresult>/gi;
  let match;
  while ((match = clashRegex.exec(source))) {
    const attrs = parseAttributes(match[1]);
    const objectXml = Array.from(match[2].matchAll(/<clashobject>([\s\S]*?)<\/clashobject>/gi)).map((item) => item[1]);
    const objects = objectXml.map((xml) => parseClashObject(xml, options));
    objects.forEach((object, index) => {
      const row = rowFromObject(attrs.name || 'clash', object, objects, index);
      if (row) rows.push(row);
    });
  }
  if (!rows.length) diagnostics.push({ level: 'WARN', code: 'NO_PSCLASH_ROWS', message: 'No PSClash XML rows were found.' });
  return { rows, diagnostics };
}

export function numberValue(value) { return parseNumber(value); }
