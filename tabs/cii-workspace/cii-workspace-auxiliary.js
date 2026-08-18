import { decodeCiiNumericRow } from '../../parser/fixed-field.js';
import { deepFreeze, stableStringify } from './cii-workspace-contracts.js';

const ELEMENT_BLOCK_ROWS = 15;
const POINTER_ROW12 = 12;
const POINTER_ROW13 = 13;
const POINTER_ROW14 = 14;
const RESTRAINT_SLOTS = 6;
const RESTRAINT_ROWS_PER_SLOT = 4;
const RESTRAINT_BLOCK_ROWS = RESTRAINT_SLOTS * RESTRAINT_ROWS_PER_SLOT;

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sectionRows(rawText, names) {
  const wanted = (Array.isArray(names) ? names : [names]).map(String);
  const rows = String(rawText ?? '').split(/\r?\n/);
  const markers = wanted.map((name) => new RegExp(`^\\s*#\\$\\s*${escapeRegExp(name)}\\s*$`, 'i'));
  const start = rows.findIndex((row) => markers.some((marker) => marker.test(row)));
  if (start < 0) return [];
  const out = [];
  for (let index = start + 1; index < rows.length; index += 1) {
    if (/^\s*#\$\s*/.test(rows[index])) break;
    if (rows[index].trim()) out.push(rows[index]);
  }
  return out;
}
function numeric(row, minimum = 1) {
  const values = decodeCiiNumericRow(row);
  return Array.isArray(values) && values.length >= minimum && values.slice(0, minimum).every(Number.isFinite) ? values : null;
}
function integerPointer(values, index) {
  const value = Number(values?.[index]);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function elementEnds(row) {
  const values = numeric(row, 2); if (!values) return null;
  const from = Number(values[0]); const to = Number(values[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from: String(Math.round(from)), to: String(Math.round(to)) };
}
function pushConflict(conflicts, code, details = {}) { conflicts.push(Object.freeze({ code, ...details })); }
function lengthPrefixedText(row) {
  const match = String(row ?? '').match(/^\s*(\d+)\s?(.*)$/);
  if (!match) return Object.freeze({ declaredLength: null, text: '', raw: String(row ?? '') });
  const declaredLength = Number(match[1]); const payload = match[2] || '';
  return Object.freeze({ declaredLength, text: payload.slice(0, declaredLength), raw: String(row ?? '') });
}
function rawElementBlocks(rawText, conflicts) {
  const rows = sectionRows(rawText, 'ELEMENTS'); const blocks = [];
  if (rows.length % ELEMENT_BLOCK_ROWS !== 0) {
    pushConflict(conflicts, 'AUX_ELEMENT_BLOCK_ROW_COUNT_NOT_MULTIPLE_OF_15', { rowCount: rows.length });
  }
  for (let offset = 0, blockIndex = 0; offset + ELEMENT_BLOCK_ROWS <= rows.length; offset += ELEMENT_BLOCK_ROWS, blockIndex += 1) {
    const ends = elementEnds(rows[offset]);
    if (!ends) { pushConflict(conflicts, 'AUX_ELEMENT_HEADER_UNREADABLE', { blockIndex }); continue; }
    const row12 = numeric(rows[offset + POINTER_ROW12], 6);
    const row13 = numeric(rows[offset + POINTER_ROW13], 6);
    const row14 = numeric(rows[offset + POINTER_ROW14], 3);
    if (!row12 || !row13 || !row14) {
      pushConflict(conflicts, 'AUX_ELEMENT_POINTER_ROW_UNREADABLE', { blockIndex, from: ends.from, to: ends.to });
      continue;
    }
    blocks.push(Object.freeze({
      blockIndex, ...ends,
      pointers: Object.freeze({
        bend: integerPointer(row12, 0), rigid: integerPointer(row12, 1), restraint: integerPointer(row12, 3),
        sifTee: integerPointer(row13, 4), nodeName: integerPointer(row13, 5), reducer: integerPointer(row14, 0),
      }),
      rawPointerRows: Object.freeze([rows[offset + POINTER_ROW12], rows[offset + POINTER_ROW13], rows[offset + POINTER_ROW14]]),
    }));
  }
  return { rows, blocks };
}
function matchBlocks(parsed, rawBlocks, conflicts) {
  const elements = Array.isArray(parsed?.elements) ? parsed.elements : []; const used = new Set(); const matched = [];
  for (const element of elements) {
    const from = String(Math.round(Number(element.from))); const to = String(Math.round(Number(element.to)));
    let rawIndex = rawBlocks.findIndex((block, index) => !used.has(index) && block.blockIndex === Number(element.index) && block.from === from && block.to === to);
    if (rawIndex < 0) rawIndex = rawBlocks.findIndex((block, index) => !used.has(index) && block.from === from && block.to === to);
    if (rawIndex < 0) {
      pushConflict(conflicts, 'AUX_PARSED_ELEMENT_BLOCK_NOT_FOUND', { parsedElementIndex: element.index, from, to });
      continue;
    }
    used.add(rawIndex);
    matched.push(Object.freeze({ parsedElementIndex: Number(element.index), from, to, raw: rawBlocks[rawIndex] }));
  }
  return matched;
}
function nextPointerLimit(pointer, pointers, rowCount) {
  const next = pointers.find((value) => value > pointer);
  return next ? next - 1 : rowCount;
}
function positivePointers(descriptors, key) {
  return [...new Set(descriptors.map((item) => item.raw.pointers[key]).filter((value) => Number.isSafeInteger(value) && value > 0))].sort((a, b) => a - b);
}
function restraintRecord(line1, line2, tagRow, guidRow, context, conflicts) {
  const first = numeric(line1, 6); const second = numeric(line2, 3);
  if (!first || !second) {
    pushConflict(conflicts, 'RESTRAINT_SLOT_NUMERIC_ROW_UNREADABLE', context); return null;
  }
  const node = Number(first[0]); const typeCode = Number(first[1]);
  if (node === 0 && typeCode === 0) return null;
  if (!(node > 0) || !Number.isInteger(typeCode) || typeCode < 1 || typeCode > 62) {
    pushConflict(conflicts, 'RESTRAINT_SLOT_IDENTITY_INVALID', { ...context, node, typeCode }); return null;
  }
  return deepFreeze({
    ...context,
    node: String(Math.round(node)), typeCode,
    stiffness: Number(first[2]), gap: Number(first[3]), friction: Number(first[4]), connectingNode: Number(first[5]),
    directionCosines: Object.freeze({ x: Number(second[0]), y: Number(second[1]), z: Number(second[2]) }),
    tag: lengthPrefixedText(tagRow), guid: lengthPrefixedText(guidRow),
    rawLine1Fields: Object.freeze(first.slice(0, 6)), rawLine2Fields: Object.freeze(second.slice(0, 3)),
    rawRows: Object.freeze([line1, line2, tagRow, guidRow]),
  });
}
function buildRestraintEvidence(rawText, descriptors, conflicts) {
  const rows = sectionRows(rawText, 'RESTRANT'); const pointers = positivePointers(descriptors, 'restraint');
  const byPointer = {}; const allRecords = []; const byNode = {};
  for (const pointer of pointers) {
    if (pointer > rows.length) { pushConflict(conflicts, 'RESTRAINT_POINTER_OUT_OF_RANGE', { pointer, rowCount: rows.length }); continue; }
    const end = nextPointerLimit(pointer, pointers, rows.length); const span = rows.slice(pointer - 1, end);
    if (span.length < RESTRAINT_BLOCK_ROWS) {
      pushConflict(conflicts, 'RESTRAINT_BLOCK_TOO_SHORT', { pointer, rowCount: span.length, expectedMinimum: RESTRAINT_BLOCK_ROWS }); continue;
    }
    if (span.length !== RESTRAINT_BLOCK_ROWS) pushConflict(conflicts, 'RESTRAINT_BLOCK_SPAN_UNEXPECTED', { pointer, rowCount: span.length, expected: RESTRAINT_BLOCK_ROWS });
    const records = [];
    for (let slot = 0; slot < RESTRAINT_SLOTS; slot += 1) {
      const base = slot * RESTRAINT_ROWS_PER_SLOT;
      const record = restraintRecord(span[base], span[base + 1], span[base + 2], span[base + 3], { pointer, slot: slot + 1 }, conflicts);
      if (!record) continue;
      records.push(record); allRecords.push(record);
      if (!byNode[record.node]) byNode[record.node] = [];
      byNode[record.node].push(record);
    }
    byPointer[pointer] = Object.freeze(records);
  }
  return deepFreeze({
    authority: 'PROTECTED_WRITER_RESTRANT_LINE1_LINE2', sectionRowCount: rows.length,
    records: Object.freeze(allRecords), byPointer: Object.freeze(byPointer),
    byNode: Object.freeze(Object.fromEntries(Object.entries(byNode).map(([node, records]) => [node, Object.freeze(records)]))),
  });
}
function buildRigidEvidence(rawText, descriptors, conflicts) {
  const rows = sectionRows(rawText, 'RIGID'); const pointers = positivePointers(descriptors, 'rigid'); const byPointer = {};
  for (const pointer of pointers) {
    if (pointer > rows.length) { pushConflict(conflicts, 'RIGID_POINTER_OUT_OF_RANGE', { pointer, rowCount: rows.length }); continue; }
    const values = numeric(rows[pointer - 1], 1);
    if (!values) { pushConflict(conflicts, 'RIGID_RECORD_UNREADABLE', { pointer }); continue; }
    byPointer[pointer] = deepFreeze({ pointer, weight: Number(values[0]), rawFields: Object.freeze([...values]), rawRow: rows[pointer - 1] });
  }
  return deepFreeze({ authority: 'PROTECTED_WRITER_RIGID_POINTER_WEIGHT', sectionRowCount: rows.length, byPointer: Object.freeze(byPointer) });
}
function buildSifEvidence(rawText, descriptors, conflicts) {
  const rows = sectionRows(rawText, ['SIF&TEES', 'SIF']); const pointers = positivePointers(descriptors, 'sifTee'); const byPointer = {};
  for (const pointer of pointers) {
    if (pointer > rows.length) { pushConflict(conflicts, 'SIF_TEE_POINTER_OUT_OF_RANGE', { pointer, rowCount: rows.length }); continue; }
    const end = nextPointerLimit(pointer, pointers, rows.length); const recordRows = rows.slice(pointer - 1, end);
    const first = numeric(recordRows[0], 2);
    if (!first) { pushConflict(conflicts, 'SIF_TEE_RECORD_UNREADABLE', { pointer }); continue; }
    const decodedRows = recordRows.map((row) => decodeCiiNumericRow(row));
    const normalizedFirst = [...first]; normalizedFirst[0] = null;
    byPointer[pointer] = deepFreeze({
      pointer, node: String(Math.round(Number(first[0]))), rawCode: Number(first[1]),
      firstRowFields: Object.freeze([...first]),
      normalizedPayload: Object.freeze([Object.freeze(normalizedFirst), ...decodedRows.slice(1).map((row) => row ? Object.freeze([...row]) : null)]),
      rawRows: Object.freeze(recordRows),
      authority: 'POINTER_BOUND_RAW_SIF_TEE_RECORD; FIELD_2_SEMANTICS_UNQUALIFIED',
    });
  }
  return deepFreeze({ authority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD', sectionRowCount: rows.length, byPointer: Object.freeze(byPointer) });
}
function bindElementAuxiliary(descriptors, restraints, rigids, sifTee) {
  const byParsedElementIndex = {};
  for (const descriptor of descriptors) {
    const pointers = descriptor.raw.pointers;
    byParsedElementIndex[descriptor.parsedElementIndex] = deepFreeze({
      parsedElementIndex: descriptor.parsedElementIndex, from: descriptor.from, to: descriptor.to,
      pointers,
      restraintRecords: pointers.restraint > 0 ? (restraints.byPointer[pointers.restraint] || Object.freeze([])) : Object.freeze([]),
      rigidRecord: pointers.rigid > 0 ? (rigids.byPointer[pointers.rigid] || null) : null,
      sifTeeRecord: pointers.sifTee > 0 ? (sifTee.byPointer[pointers.sifTee] || null) : null,
    });
  }
  return Object.freeze(byParsedElementIndex);
}
function parsedCapability(count, qualification, authority, rawRowCount, limitations = [], details = {}) {
  return deepFreeze({
    state: count > 0 ? 'PARSED' : 'EMPTY', count, qualification, authority,
    raw: Object.freeze({ present: rawRowCount > 0, nonEmptyRowCount: rawRowCount }),
    details: Object.freeze(details), limitations: Object.freeze(limitations),
  });
}

export function applyCiiAuxiliaryCapabilities(baseCapabilities, auxiliaryEvidence) {
  const base = baseCapabilities || {}; const families = base.families || {}; const aux = auxiliaryEvidence || {};
  const restraintRecords = aux.restraints?.records || [];
  const restraintNodes = new Set(restraintRecords.map((record) => String(record.node)));
  const rigidRecords = Object.values(aux.rigids?.byPointer || {});
  const sifRecords = Object.values(aux.sifTee?.byPointer || {});
  return deepFreeze({
    ...base,
    families: Object.freeze({
      ...families,
      restraints: parsedCapability(
        restraintRecords.length, 'PARTIAL', 'tabs/cii-workspace/cii-workspace-auxiliary.js#RESTRANT',
        Number(aux.restraints?.sectionRowCount || 0),
        ['Numeric node/type/stiffness/gap/friction/connecting-node and direction-cosine fields are source-qualified; semantic meaning of CAESAR restraint type codes is not mapped in this workspace.'],
        { nodeCount: restraintNodes.size, rawRecordCount: restraintRecords.length, gapFrictionQualified: true },
      ),
      rigidMass: parsedCapability(
        rigidRecords.length, 'QUALIFIED', 'tabs/cii-workspace/cii-workspace-auxiliary.js#RIGID_POINTER',
        Number(aux.rigids?.sectionRowCount || 0), [], { pointerBoundRecordCount: rigidRecords.length },
      ),
      sifTee: parsedCapability(
        sifRecords.length, 'PARTIAL', 'tabs/cii-workspace/cii-workspace-auxiliary.js#SIF_TEE_POINTER',
        Number(aux.sifTee?.sectionRowCount || 0),
        ['SIF&TEES record custody and raw payload are pointer-qualified; the semantic meaning of the second numeric field/raw code is not asserted.'],
        { pointerBoundRecordCount: sifRecords.length },
      ),
    }),
  });
}

export function buildCiiWorkspaceAuxiliaryEvidence(rawText, parsed = {}) {
  const conflicts = []; const raw = rawElementBlocks(rawText, conflicts); const descriptors = matchBlocks(parsed, raw.blocks, conflicts);
  const restraints = buildRestraintEvidence(rawText, descriptors, conflicts);
  const rigids = buildRigidEvidence(rawText, descriptors, conflicts);
  const sifTee = buildSifEvidence(rawText, descriptors, conflicts);
  const elements = bindElementAuxiliary(descriptors, restraints, rigids, sifTee);
  return deepFreeze({
    schema: 'CIIWorkspaceAuxiliaryEvidence.v1',
    sourceAuthority: '3D_Converters/inputxml_to_cii2019.py fixed rows + IEL pointer order',
    elementBlockRows: ELEMENT_BLOCK_ROWS,
    rawElementBlockCount: raw.blocks.length,
    mappedElementCount: descriptors.length,
    elements,
    restraints, rigids, sifTee,
    conflicts: Object.freeze(conflicts),
    semanticHashBasis: stableStringify({
      elements: Object.values(elements).map((item) => ({ from: item.from, to: item.to, pointers: item.pointers })),
      restraints: restraints.records.map((record) => ({ node: record.node, typeCode: record.typeCode, gap: record.gap, friction: record.friction })),
      rigidPointers: Object.keys(rigids.byPointer), sifPointers: Object.keys(sifTee.byPointer),
    }),
  });
}
