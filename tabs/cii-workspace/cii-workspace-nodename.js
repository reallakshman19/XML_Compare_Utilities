const ELEMENT_BLOCK_ROWS = 15;
const NODENAME_POINTER_ROW = 13;
const NODENAME_FROM_START = 2;
const NODENAME_TO_START = 28;
const NODENAME_ROW_END = 53;

function sectionRows(rawText, wanted) {
  const rows = String(rawText ?? '').split(/\r?\n/);
  const marker = new RegExp(`^\\s*#\\$\\s*${wanted}\\s*$`, 'i');
  const start = rows.findIndex((row) => marker.test(row));
  if (start < 0) return [];
  const out = [];
  for (let index = start + 1; index < rows.length; index += 1) {
    if (/^\s*#\$\s*/.test(rows[index])) break;
    if (rows[index].trim()) out.push(rows[index]);
  }
  return out;
}

function parsePointer(row) {
  const fields = String(row ?? '').trim().split(/\s+/);
  if (fields.length < 6 || !fields.slice(0, 6).every((value) => /^[-+]?\d+$/.test(value))) return null;
  const pointer = Number(fields[5]);
  return Number.isSafeInteger(pointer) && pointer >= 0 ? pointer : null;
}

function parseElementEnds(row) {
  const fields = String(row ?? '').trim().split(/\s+/);
  if (fields.length < 2) return null;
  const from = Number(fields[0]); const to = Number(fields[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from: String(Math.round(from)), to: String(Math.round(to)) };
}

function rawElementDescriptors(rawText) {
  const rows = sectionRows(rawText, 'ELEMENTS'); const blocks = [];
  for (let offset = 0, blockIndex = 0; offset < rows.length; offset += ELEMENT_BLOCK_ROWS, blockIndex += 1) {
    const ends = parseElementEnds(rows[offset]);
    if (!ends) continue;
    blocks.push(Object.freeze({
      blockIndex, from: ends.from, to: ends.to,
      pointer: parsePointer(rows[offset + NODENAME_POINTER_ROW]),
    }));
  }
  return blocks;
}

function matchDescriptor(element, descriptors, used) {
  const from = String(Math.round(Number(element.from))); const to = String(Math.round(Number(element.to)));
  const index = descriptors.findIndex((item, position) => !used.has(position) && item.from === from && item.to === to);
  if (index < 0) return null;
  used.add(index); return descriptors[index];
}

function parseNamePair(row) {
  const padded = String(row ?? '').padEnd(NODENAME_ROW_END, ' ');
  return {
    fromName: padded.slice(NODENAME_FROM_START, NODENAME_TO_START).trim(),
    toName: padded.slice(NODENAME_TO_START, NODENAME_ROW_END).trim(),
  };
}

function addConflict(conflicts, code, details = {}) {
  conflicts.push(Object.freeze({ code, ...details }));
}

function assignName(state, nodeId, name, evidence) {
  if (!name) return;
  const key = String(nodeId);
  if (!state.known.has(key)) {
    addConflict(state.conflicts, 'NODENAME_UNKNOWN_NODE', { nodeId: key, ...evidence });
    return;
  }
  if (state.blocked.has(key)) return;
  const previous = state.names.get(key);
  if (previous && previous !== name) {
    state.names.delete(key); state.blocked.add(key);
    addConflict(state.conflicts, 'NODENAME_CONFLICT', { nodeId: key, previous, proposed: name, ...evidence });
    return;
  }
  state.names.set(key, name);
}

export function extractCiiNodeNameEvidence(rawText, parsed = {}) {
  const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
  const rows = sectionRows(rawText, 'NODENAME'); const descriptors = rawElementDescriptors(rawText); const used = new Set();
  const state = {
    known: new Set(Object.keys(parsed.nodes || {}).map(String)), names: new Map(), blocked: new Set(), conflicts: [],
  };
  let mappedElementCount = 0;
  elements.forEach((element, elementIndex) => {
    const descriptor = matchDescriptor(element, descriptors, used);
    if (!descriptor) {
      addConflict(state.conflicts, 'NODENAME_ELEMENT_BLOCK_NOT_FOUND', { elementIndex, from: element.from, to: element.to });
      return;
    }
    const { pointer, blockIndex } = descriptor;
    if (pointer === null) {
      addConflict(state.conflicts, 'NODENAME_POINTER_UNREADABLE', { elementIndex, blockIndex });
      return;
    }
    if (pointer === 0) return;
    if (pointer > rows.length) {
      addConflict(state.conflicts, 'NODENAME_POINTER_OUT_OF_RANGE', { elementIndex, blockIndex, pointer, rowCount: rows.length });
      return;
    }
    mappedElementCount += 1; const pair = parseNamePair(rows[pointer - 1]);
    assignName(state, element.from, pair.fromName, { elementIndex, blockIndex, pointer, end: 'FROM' });
    assignName(state, element.to, pair.toName, { elementIndex, blockIndex, pointer, end: 'TO' });
  });
  const names = Object.fromEntries([...state.names.entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
  return Object.freeze({
    schema: 'CIIWorkspaceNodeNameEvidence.v1', rowCount: rows.length, rawElementBlockCount: descriptors.length,
    mappedElementCount, names: Object.freeze(names), conflicts: Object.freeze(state.conflicts),
  });
}
