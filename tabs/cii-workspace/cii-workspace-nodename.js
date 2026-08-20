import { decodeCiiNumericRow } from '../../parser/fixed-field.js';
import {
  ciiPhysicalByteString, ciiPhysicalSectionRows, createCiiPhysicalFile, decodeCiiAsciiByteString,
} from './cii-workspace-physical-file.js';

const ELEMENT_BLOCK_ROWS = 15;
const NODENAME_POINTER_ROW = 13;
const NODENAME_FROM_START = 2;
const NODENAME_TO_START = 28;
const NODENAME_ROW_END = 53;
const POINTER_FIELD_START = 67;
const POINTER_FIELD_END = 80;

function integerPointer(row) {
  const values = decodeCiiNumericRow(row);
  const pointer = Number(values?.[5]);
  return Number.isSafeInteger(pointer) && pointer >= 0 ? pointer : null;
}

function elementEnds(row) {
  const values = decodeCiiNumericRow(row);
  const from = Number(values?.[0]); const to = Number(values?.[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from: String(Math.round(from)), to: String(Math.round(to)) };
}

function rawElementDescriptors(physicalFile, physicalBlockers) {
  const rows = ciiPhysicalSectionRows(physicalFile, 'ELEMENTS');
  if (rows.length % ELEMENT_BLOCK_ROWS !== 0) physicalBlockers.push('NODENAME_ELEMENT_BLOCK_ROW_COUNT_NOT_MULTIPLE_OF_15');
  const blockCount = Math.floor(rows.length / ELEMENT_BLOCK_ROWS);
  const blocks = Array.from({ length: blockCount }, () => null);
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const offset = blockIndex * ELEMENT_BLOCK_ROWS;
    const header = rows[offset]; const ends = elementEnds(header?.text);
    if (!ends) {
      physicalBlockers.push(`NODENAME_ELEMENT_BLOCK_HEADER_UNQUALIFIED:${blockIndex}`);
      continue;
    }
    const pointerLine = rows[offset + NODENAME_POINTER_ROW];
    blocks[blockIndex] = Object.freeze({
      blockIndex, ...ends, pointer: integerPointer(pointerLine?.text), pointerLine,
      pointerField: physicalSpan(pointerLine, POINTER_FIELD_START, POINTER_FIELD_END, 'ELEMENT_NODENAME_POINTER', physicalFile),
    });
  }
  return { rows, blocks, blockCount };
}

function elementIdentity(element) {
  return {
    from: String(Math.round(Number(element?.from))),
    to: String(Math.round(Number(element?.to))),
    parsedIndex: Number(element?.index),
  };
}

function exactDescriptor(element, descriptors) {
  const { from, to, parsedIndex } = elementIdentity(element);
  if (!Number.isSafeInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= descriptors.length) return null;
  const descriptor = descriptors[parsedIndex];
  if (!descriptor || descriptor.blockIndex !== parsedIndex || descriptor.from !== from || descriptor.to !== to) return null;
  return descriptor;
}

function semanticDescriptor(element, descriptors, used) {
  const identity = elementIdentity(element);
  const exact = exactDescriptor(element, descriptors);
  if (exact && !used.has(exact.blockIndex)) {
    used.add(exact.blockIndex);
    return Object.freeze({ descriptor: exact, authority: 'EXACT_BLOCK_INDEX' });
  }
  const fallbackIndex = descriptors.findIndex((item, position) => item && !used.has(position)
    && item.from === identity.from && item.to === identity.to);
  if (fallbackIndex < 0) return null;
  used.add(fallbackIndex);
  return Object.freeze({ descriptor: descriptors[fallbackIndex], authority: 'SEMANTIC_FROM_TO_FALLBACK' });
}

function addParsedIndexBlockers(elements, blockCount, physicalBlockers) {
  if (elements.length !== blockCount) {
    physicalBlockers.push(`NODENAME_ELEMENT_BLOCK_COUNT_MISMATCH:${elements.length}:${blockCount}`);
  }
  const seen = new Set();
  for (const element of elements) {
    const parsedIndex = Number(element?.index);
    if (!Number.isSafeInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= blockCount) {
      physicalBlockers.push(`NODENAME_ELEMENT_PARSED_INDEX_OUT_OF_RANGE:${String(element?.index ?? '')}`);
      continue;
    }
    if (seen.has(parsedIndex)) physicalBlockers.push(`NODENAME_ELEMENT_PARSED_INDEX_DUPLICATE:${parsedIndex}`);
    seen.add(parsedIndex);
  }
}

function physicalSpan(line, startColumn, endColumn, fieldIdentity, physicalFile) {
  if (!line) return Object.freeze({ qualified: false, fieldIdentity, reason: 'LINE_MISSING' });
  const width = endColumn - startColumn; const start = line.byteStart + startColumn; const end = line.byteStart + endColumn;
  if (line.bodyByteEnd - line.byteStart < endColumn) {
    return Object.freeze({ qualified: false, fieldIdentity, lineNumber: line.lineNumber, startColumn, endColumn, width, reason: 'ROW_TOO_SHORT' });
  }
  try {
    const rawField = decodeCiiAsciiByteString(ciiPhysicalByteString(physicalFile, start, end));
    return Object.freeze({
      qualified: true, fieldIdentity, lineNumber: line.lineNumber, startColumn, endColumn, width,
      byteStart: start, byteEnd: end, rawField, value: rawField.trim(),
    });
  } catch (error) {
    return Object.freeze({
      qualified: false, fieldIdentity, lineNumber: line.lineNumber, startColumn, endColumn, width,
      byteStart: start, byteEnd: end, reason: error?.message || String(error),
    });
  }
}

function parseNamePair(row) {
  const padded = String(row ?? '').padEnd(NODENAME_ROW_END, ' ');
  return {
    fromName: padded.slice(NODENAME_FROM_START, NODENAME_TO_START).trim(),
    toName: padded.slice(NODENAME_TO_START, NODENAME_ROW_END).trim(),
  };
}

function addConflict(conflicts, code, details = {}) { conflicts.push(Object.freeze({ code, ...details })); }

function assignName(state, nodeId, name, evidence) {
  if (!name) return;
  const key = String(nodeId);
  if (!state.known.has(key)) { addConflict(state.conflicts, 'NODENAME_UNKNOWN_NODE', { nodeId: key, ...evidence }); return; }
  if (state.blocked.has(key)) return;
  const previous = state.names.get(key);
  if (previous && previous !== name) {
    state.names.delete(key); state.blocked.add(key);
    addConflict(state.conflicts, 'NODENAME_CONFLICT', { nodeId: key, previous, proposed: name, ...evidence }); return;
  }
  state.names.set(key, name);
}

function addPhysicalOwner(bySpan, field, owner) {
  if (!field?.qualified) return;
  const key = `${field.byteStart}:${field.byteEnd}`;
  const existing = bySpan.get(key) || { ...field, section: 'NODENAME', owners: [] };
  existing.owners.push(Object.freeze(owner)); bySpan.set(key, existing);
}

function freezePhysicalCustody(physicalFile, blockers, byElementIndex, bySpan, rowCount) {
  const spans = Object.fromEntries([...bySpan.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, value]) => [key, Object.freeze({ ...value, owners: Object.freeze(value.owners) })]));
  return Object.freeze({
    schema: 'CIIWorkspaceNodeNamePhysicalCustody.v1',
    status: physicalFile.writer1CByteEligible && blockers.length === 0 ? 'QUALIFIED' : 'BLOCKED',
    byteAuthority: physicalFile.byteAuthority, writer1CByteEligible: physicalFile.writer1CByteEligible,
    rowCount, blockers: Object.freeze([...new Set(blockers)]),
    byElementIndex: Object.freeze(byElementIndex), bySpan: Object.freeze(spans),
  });
}

export function extractCiiNodeNameEvidence(rawText, parsed = {}, options = {}) {
  const physicalFile = options.physicalFile || createCiiPhysicalFile(rawText);
  const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
  const rows = ciiPhysicalSectionRows(physicalFile, 'NODENAME'); const physicalBlockers = [];
  if (!physicalFile.writer1CByteEligible) physicalBlockers.push('NODENAME_ORIGINAL_BYTE_CUSTODY_REQUIRED');
  const descriptors = rawElementDescriptors(physicalFile, physicalBlockers); const semanticUsed = new Set();
  addParsedIndexBlockers(elements, descriptors.blockCount, physicalBlockers);
  const state = { known: new Set(Object.keys(parsed.nodes || {}).map(String)), names: new Map(), blocked: new Set(), conflicts: [] };
  const byElementIndex = {}; const bySpan = new Map(); let mappedElementCount = 0;
  elements.forEach((element, elementIndex) => {
    const exact = exactDescriptor(element, descriptors.blocks);
    const semanticMatch = semanticDescriptor(element, descriptors.blocks, semanticUsed);
    if (!semanticMatch) {
      addConflict(state.conflicts, 'NODENAME_ELEMENT_BLOCK_NOT_FOUND', { elementIndex, parsedElementIndex: element?.index, from: element.from, to: element.to });
      return;
    }
    if (!exact) physicalBlockers.push(`NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:${elementIndex}`);
    const descriptor = semanticMatch.descriptor;
    const { pointer, blockIndex } = descriptor;
    if (pointer === null) {
      addConflict(state.conflicts, 'NODENAME_POINTER_UNREADABLE', { elementIndex, parsedElementIndex: element?.index, blockIndex });
      return;
    }
    if (pointer === 0) {
      if (exact) {
        if (!descriptor.pointerField.qualified) physicalBlockers.push('NODENAME_POINTER_FIXED_LAYOUT_UNQUALIFIED');
        byElementIndex[elementIndex] = Object.freeze({
          elementIndex, parsedElementIndex: Number(element.index), blockIndex, from: descriptor.from, to: descriptor.to,
          pointer, pointerField: descriptor.pointerField, rowIndex: null, exactPhysicalCustody: true,
        });
      }
      return;
    }
    if (pointer > rows.length) {
      addConflict(state.conflicts, 'NODENAME_POINTER_OUT_OF_RANGE', { elementIndex, parsedElementIndex: element?.index, blockIndex, pointer, rowCount: rows.length });
      return;
    }
    mappedElementCount += 1;
    const rowIndex = pointer - 1; const row = rows[rowIndex]; const pair = parseNamePair(row.text);
    assignName(state, element.from, pair.fromName, {
      elementIndex, parsedElementIndex: element?.index, blockIndex, pointer, end: 'FROM', semanticAuthority: semanticMatch.authority,
    });
    assignName(state, element.to, pair.toName, {
      elementIndex, parsedElementIndex: element?.index, blockIndex, pointer, end: 'TO', semanticAuthority: semanticMatch.authority,
    });
    if (!exact) return;
    if (!descriptor.pointerField.qualified) physicalBlockers.push('NODENAME_POINTER_FIXED_LAYOUT_UNQUALIFIED');
    const fromField = physicalSpan(row, NODENAME_FROM_START, NODENAME_TO_START, 'NODENAME_FROM', physicalFile);
    const toField = physicalSpan(row, NODENAME_TO_START, NODENAME_ROW_END, 'NODENAME_TO', physicalFile);
    if (!fromField.qualified || !toField.qualified) physicalBlockers.push('NODENAME_FIXED_LAYOUT_UNQUALIFIED');
    byElementIndex[elementIndex] = Object.freeze({
      elementIndex, parsedElementIndex: Number(element.index), blockIndex, from: descriptor.from, to: descriptor.to, pointer,
      pointerField: descriptor.pointerField, rowIndex, rowLineNumber: row.lineNumber, fromField, toField, exactPhysicalCustody: true,
    });
    addPhysicalOwner(bySpan, fromField, {
      elementIndex, parsedElementIndex: Number(element.index), blockIndex, pointer, rowIndex, end: 'FROM', nodeId: String(element.from),
    });
    addPhysicalOwner(bySpan, toField, {
      elementIndex, parsedElementIndex: Number(element.index), blockIndex, pointer, rowIndex, end: 'TO', nodeId: String(element.to),
    });
  });
  const names = Object.fromEntries([...state.names.entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
  const custodyBlockers = [...physicalBlockers,
    ...state.conflicts.map((item) => `NODENAME_CUSTODY_CONFLICT:${item.code}`)];
  return Object.freeze({
    schema: 'CIIWorkspaceNodeNameEvidence.v1', rowCount: rows.length, rawElementBlockCount: descriptors.blockCount,
    mappedElementCount, names: Object.freeze(names), conflicts: Object.freeze(state.conflicts),
    physicalCustody: freezePhysicalCustody(physicalFile, custodyBlockers, byElementIndex, bySpan, rows.length),
  });
}
