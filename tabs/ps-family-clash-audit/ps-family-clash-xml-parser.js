import {
  decodeXmlEntities,
  extractFamilyRoot,
  makeDisplayName,
  makeExactMemberKey,
  parseNumber,
  parsePipeTag,
  stripLeadingSlash,
} from './ps-family-token-utils.js';
import { PS_FAMILY_CLASH_ROW_SCHEMA } from './ps-family-clash-audit-contract.js';

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

function findPsLeaf(path, fallback = '') {
  return [...path].reverse().find((node) => /(?:^|\/)PS-\d+/i.test(node) && !/MAIN$/i.test(node)) || fallback;
}

function parseClashObject(clashObjectXml) {
  const pathlinkMatch = clashObjectXml.match(/<pathlink>([\s\S]*?)<\/pathlink>/i);
  const path = pathlinkMatch ? extractNodes(pathlinkMatch[1]) : [];
  const itemName = extractSmartTagValue(clashObjectXml, 'Item Name') || findPsLeaf(path, path[path.length - 1] || '');
  const lineBranchNode = findLineBranchNode(path);
  const pipe = lineBranchNode ? parsePipeTag(lineBranchNode) : null;
  return {
    itemName: makeDisplayName(itemName),
    exactMemberKey: makeExactMemberKey(itemName),
    familyRoot: extractFamilyRoot(itemName),
    path,
    lineBranchNode,
    pipe,
  };
}

function chooseSourceAndAgainst(objects, sourceSide) {
  if (objects.length < 2) return { source: objects[0] || null, against: objects[1] || null };
  if (sourceSide === 'left') return { source: objects[0], against: objects[1] };
  if (sourceSide === 'right') return { source: objects[1], against: objects[0] };
  const supportIndex = objects.findIndex((object) => object.path.some((node) => /CU-SU/i.test(node)));
  if (supportIndex >= 0) return { source: objects[supportIndex], against: objects[supportIndex === 0 ? 1 : 0] };
  return { source: objects[0], against: objects[1] };
}

function extractPoint(clashXml) {
  const pointMatch = clashXml.match(/<pos3f\s+([^>]+)\/>/i);
  if (!pointMatch) return { x: null, y: null, z: null };
  const attrs = parseAttributes(pointMatch[1]);
  return { x: parseNumber(attrs.x), y: parseNumber(attrs.y), z: parseNumber(attrs.z) };
}

export function parsePsFamilyClashXml(xmlText, options = {}) {
  const sourceSide = options.sourceSide || 'auto';
  const rows = [];
  const diagnostics = [];
  const clashRegex = /<clashresult\b([^>]*)>([\s\S]*?)<\/clashresult>/gi;
  let match;

  while ((match = clashRegex.exec(String(xmlText || '')))) {
    const attrs = parseAttributes(match[1]);
    const body = match[2];
    const objectXml = Array.from(body.matchAll(/<clashobject>([\s\S]*?)<\/clashobject>/gi)).map((item) => item[1]);
    const objects = objectXml.map(parseClashObject);
    const { source, against } = chooseSourceAndAgainst(objects, sourceSide);
    if (!source || !against) {
      diagnostics.push({ level: 'WARN', code: 'CLASH_OBJECTS_INCOMPLETE', message: `${attrs.name || 'clash'} has fewer than two clash objects` });
      continue;
    }
    const point = extractPoint(body);
    const sourceObject = source.itemName || findPsLeaf(source.path);
    const againstMember = against.itemName || findPsLeaf(against.path);
    rows.push({
      schema: PS_FAMILY_CLASH_ROW_SCHEMA,
      clashName: attrs.name || '',
      guid: attrs.guid || '',
      href: attrs.href || '',
      status: attrs.status || '',
      distance: parseNumber(attrs.distance),
      point,
      source: {
        objectName: sourceObject,
        exactMemberKey: makeExactMemberKey(sourceObject),
        familyRoot: extractFamilyRoot(sourceObject) || extractFamilyRoot(source.path.join('/')),
        path: source.path,
      },
      against: {
        memberName: againstMember,
        exactMemberKey: makeExactMemberKey(againstMember),
        familyRoot: extractFamilyRoot(againstMember),
        lineBranchNode: against.lineBranchNode,
        pipe: against.pipe,
        path: against.path,
      },
    });
  }

  if (!rows.length) diagnostics.push({ level: 'WARN', code: 'NO_CLASH_RESULTS', message: 'No clashresult rows were found in the XML.' });
  return { rows, diagnostics };
}
