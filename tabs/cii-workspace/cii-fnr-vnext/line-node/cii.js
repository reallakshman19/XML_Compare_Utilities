// CII v11/v14 independently validated physical layout: no legacy engine imports.
import { asciiSlice, scanPhysicalLines, isPrintableAscii } from './bytes.js';
const BLOCK_SIZE = 15;

function sectionMap(bytes, lines) {
  const found = new Map(); let current = null;
  for (const row of lines) {
    const content = asciiSlice(bytes, row.start, row.bodyEnd);
    const marker = /^#\$\s*([A-Z0-9_&]+)\s*$/.exec(content);
    if (marker) {
      current = marker[1];
      if (found.has(current)) throw new Error(`DUPLICATE_SECTION:${current}`);
      found.set(current, []);
    } else if (current) found.get(current).push(row);
  }
  return found;
}

function parseVersion(bytes, sections) {
  const row = sections.get('VERSION')?.[0];
  if (!row) throw new Error('VERSION_SECTION_MISSING');
  const match = asciiSlice(bytes, row.start, row.bodyEnd).trim().match(/^\S+\s+(\d+)\.\d+\s/);
  const version = Number(match?.[1]);
  if (![11,14].includes(version)) throw new Error('UNSUPPORTED_CII_VERSION');
  return version;
}

function headerNodes(bytes, row) {
  const values = asciiSlice(bytes, row.start, row.bodyEnd).trim().split(/\s+/);
  if (values.length !== 6) throw new Error('ELEMENT_HEADER_LAYOUT_INVALID');
  const nodes = values.slice(0, 2).map(Number);
  if (nodes.some(x => !Number.isSafeInteger(x))) throw new Error('ELEMENT_NODE_ID_INVALID');
  return nodes.map(String);
}

function elementPointer(bytes, row) {
  if (row.bodyEnd - row.start !== 80) throw new Error('ELEMENT_POINTER_LAYOUT_INVALID');
  const fields = [asciiSlice(bytes,row.start,row.start+15)];
  for (let i = 0; i < 5; i++) fields.push(asciiSlice(bytes,row.start+15+13*i,row.start+28+13*i));
  if (fields.some(x => !/^\s*[+-]?\d+\s*$/.test(x))) throw new Error('ELEMENT_POINTER_INTEGER_INVALID');
  const value = Number(fields[5]);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('ELEMENT_POINTER_VALUE_INVALID');
  return value;
}

function parseLineField(bytes, row) {
  const before = asciiSlice(bytes, row.start, row.bodyEnd);
  const match = /^ {7}(.{5}) (.*)$/.exec(before);
  if (!match || !/^\s*\d+\s*$/.test(match[1])) throw new Error('LINE_PREFIX_INVALID');
  const declared = Number(match[1]);
  if (!Number.isSafeInteger(declared) || declared > match[2].length) throw new Error('LINE_LENGTH_INVALID');
  const label = match[2].slice(0,declared);
  if (match[2].slice(declared).trim()) throw new Error('LINE_TRAILING_DATA');
  if (!isPrintableAscii(label)) throw new Error('LINE_LABEL_CHARACTERS_INVALID');
  return { row, before, declared, label, capacity: match[2].length, blank: !label.trim() };
}

export function renderLineField(field, replacement) {
  if (!isPrintableAscii(replacement) || !replacement.trim()) throw new Error('LINE_REPLACEMENT_INVALID');
  if (replacement.length > field.capacity || replacement.length > 99999) throw new Error('LINE_REPLACEMENT_OVERFLOW');
  return ' '.repeat(7) + String(replacement.length).padStart(5,' ') + ' ' +
    replacement.padEnd(field.capacity,' ');
}

function parseElement(bytes, rows, blockIndex, nameRows) {
  const fromTo = headerNodes(bytes, rows[0]);
  const pointer = elementPointer(bytes, rows[13]);
  if (pointer > nameRows.length) throw new Error('NODENAME_POINTER_OUT_OF_RANGE');
  const line = parseLineField(bytes,rows[10]);
  const name = pointer ? nameRows[pointer - 1] : null;
  if (name && name.bodyEnd - name.start !== 53) throw new Error('NODENAME_ROW_WIDTH_UNSUPPORTED');
  return { blockIndex, from: fromTo[0], to: fromTo[1], pointer, line, name };
}

function componentAssignments(elements) {
  const parent = new Map();
  function root(node) {
    if (!parent.has(node)) parent.set(node,node);
    if (parent.get(node) !== node) parent.set(node,root(parent.get(node)));
    return parent.get(node);
  }
  for (const e of elements) parent.set(root(e.from),root(e.to));
  return elements.map(e => root(e.from));
}

export function parseCiiLineNode(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('CII_BYTES_MUST_BE_UINT8ARRAY');
  const rows = scanPhysicalLines(bytes);
  const sections = sectionMap(bytes, rows);
  const version = parseVersion(bytes, sections);
  const eRows = sections.get('ELEMENTS');
  const nRows = sections.get('NODENAME') || [];
  if (!eRows || !eRows.length || eRows.length % BLOCK_SIZE) throw new Error('ELEMENT_BLOCK_COUNT_INVALID');
  const elements = [];
  for (let i = 0; i < eRows.length; i += BLOCK_SIZE) {
    elements.push(parseElement(bytes,eRows.slice(i,i+BLOCK_SIZE),i/BLOCK_SIZE,nRows));
  }
  const components = componentAssignments(elements);
  elements.forEach((e,i) => { e.component = components[i]; });
  return { version, elements, nameRows: nRows, physicalLines: rows.length };
}

export function fieldForEndpoint(bytes, element, endpoint) {
  if (!element.name) return null;
  const from = endpoint === 'FROM';
  const start = element.name.start + (from ? 2 : 28);
  const end = element.name.start + (from ? 28 : 53);
  const before = asciiSlice(bytes,start,end);
  if (!isPrintableAscii(before)) throw new Error('NODENAME_FIELD_CHARACTERS_INVALID');
  return { start,end,before,label:before.trim(),endpoint,nodeId:from?element.from:element.to,
    pointer:element.pointer,row:element.name };
}
