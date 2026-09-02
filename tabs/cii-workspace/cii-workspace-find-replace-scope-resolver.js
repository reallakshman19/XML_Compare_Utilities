import { CII_SIX_FIELD_WIDTHS, decodeCiiNumericRow, decodeFixedFields, parseFortranNumber } from '../../parser/fixed-field.js';
import { resolveNodeNameScope } from './cii-workspace-find-replace-nodename-scope.js';

/*
 * CII v14 Find & Replace scope resolution.
 *
 * This module is read-only. It derives authorized search spans from TARGET0.
 * Proven custody used here:
 * - ELEMENTS: exact 15-row physical element blocks.
 * - DISPLMNT: ELEMENT row-12 (0-based 12) field-5 (0-based 4) pointer,
 *   20 physical rows per displacement block (2 specs x 10 rows).
 * - NODENAME: ELEMENT row-13 (0-based 13) field-6 (0-based 5) pointer,
 *   one physical row per name pair with fixed FROM/TO fields.
 * - FORCMNT: current repository authority establishes 20 physical rows/block,
 *   but the exact retained endpoint/payload ownership map is not yet qualified
 *   for Find & Replace. FORCE therefore fails closed.
 */

const ELEMENT_ROWS = 15;
const ELEMENT_DISPLMNT_POINTER_ROW = 12;
const ELEMENT_DISPLMNT_POINTER_FIELD = 4;
const DISPLMNT_ROWS = 20;
const FORCMNT_ROWS = 20;
const ZERO_DISPLACEMENT_NODE = 0;
const MISSING_DISPLACEMENT_NODE = 9999.99;

function physicalLines(textInput) {
  const text = String(textInput ?? '');
  const matches = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) || [];
  const lines = [];
  let offset = 0;
  for (const raw of matches) {
    if (!raw) continue;
    const ending = raw.endsWith('\r\n') ? '\r\n' : raw.endsWith('\n') ? '\n' : raw.endsWith('\r') ? '\r' : '';
    const body = ending ? raw.slice(0, -ending.length) : raw;
    lines.push(Object.freeze({
      body,
      ending,
      start: offset,
      bodyEnd: offset + body.length,
      end: offset + raw.length,
    }));
    offset += raw.length;
  }
  return lines;
}

function sectionRefs(lines, wanted, options = {}) {
  const marker = new RegExp(`^\\s*#\\$\\s*${wanted}\\s*$`, 'i');
  const start = lines.findIndex((line) => marker.test(line.body));
  if (start < 0) return { status: 'BLOCKED', blockers: [`SECTION_NOT_FOUND:${wanted}`], refs: [] };
  const refs = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*#\$\s*/.test(lines[index].body)) break;
    if (!options.keepBlank && !lines[index].body.trim()) continue;
    if (options.skipComments && lines[index].body.trim().startsWith('*')) continue;
    refs.push(Object.freeze({ ...lines[index], lineIndex: index }));
  }
  return { status: 'PASS', blockers: [], refs };
}

function lineSpans(refs, metadata = {}) {
  return Object.freeze((refs || []).map((ref) => Object.freeze({
    start: ref.start,
    end: ref.bodyEnd,
    lineIndex: ref.lineIndex,
    ...metadata,
  })));
}

function integerIdentity(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function parseElementHeader(body) {
  const fields = decodeFixedFields(body, CII_SIX_FIELD_WIDTHS);
  const from = parseFortranNumber(fields[0]);
  const to = parseFortranNumber(fields[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const roundedFrom = Math.round(from); const roundedTo = Math.round(to);
  if (Math.abs(from - roundedFrom) > 1e-9 || Math.abs(to - roundedTo) > 1e-9) return null;
  return { from: roundedFrom, to: roundedTo };
}

function elementBlocks(lines) {
  const section = sectionRefs(lines, 'ELEMENTS');
  if (section.status !== 'PASS') return section;
  if (!section.refs.length || section.refs.length % ELEMENT_ROWS !== 0) {
    return { status: 'BLOCKED', blockers: [`ELEMENT_BLOCK_CARDINALITY_INVALID:${section.refs.length}`], blocks: [] };
  }
  const blocks = [];
  for (let offset = 0; offset < section.refs.length; offset += ELEMENT_ROWS) {
    const refs = section.refs.slice(offset, offset + ELEMENT_ROWS);
    const identity = parseElementHeader(refs[0].body);
    if (!identity) return { status: 'BLOCKED', blockers: [`ELEMENT_HEADER_INVALID:${offset / ELEMENT_ROWS}`], blocks: [] };
    blocks.push(Object.freeze({
      index: offset / ELEMENT_ROWS,
      from: identity.from,
      to: identity.to,
      refs: Object.freeze(refs),
    }));
  }
  return { status: 'PASS', blockers: [], blocks: Object.freeze(blocks) };
}

function exactElementBlock(lines, operation) {
  const from = integerIdentity(operation?.from);
  const to = integerIdentity(operation?.to);
  if (from == null || to == null) return { status: 'BLOCKED', blockers: ['ELEMENT_FROM_TO_REQUIRED'] };
  const parsed = elementBlocks(lines);
  if (parsed.status !== 'PASS') return parsed;
  const matches = parsed.blocks.filter((block) => block.from === from && block.to === to);
  if (!matches.length) return { status: 'BLOCKED', blockers: [`ELEMENT_NOT_FOUND:${from}:${to}`] };
  if (matches.length !== 1) return { status: 'BLOCKED', blockers: [`ELEMENT_IDENTITY_AMBIGUOUS:${from}:${to}:${matches.length}`] };
  return { status: 'PASS', blockers: [], block: matches[0] };
}

function resolveElement(lines, operation) {
  const resolved = exactElementBlock(lines, operation);
  if (resolved.status !== 'PASS') return resolved;
  return Object.freeze({
    status: 'PASS',
    scope: 'ELEMENT',
    authority: 'CII_V14_EXACT_15_ROW_ELEMENT_BLOCK',
    spans: lineSpans(resolved.block.refs, { section: 'ELEMENTS', elementIndex: resolved.block.index }),
    evidence: Object.freeze({
      from: resolved.block.from,
      to: resolved.block.to,
      elementIndex: resolved.block.index,
      rowCount: ELEMENT_ROWS,
    }),
    blockers: Object.freeze([]),
  });
}

function displacementPointer(block) {
  const ref = block?.refs?.[ELEMENT_DISPLMNT_POINTER_ROW];
  if (!ref) return null;
  const fields = decodeFixedFields(ref.body, CII_SIX_FIELD_WIDTHS);
  const value = parseFortranNumber(fields[ELEMENT_DISPLMNT_POINTER_FIELD]);
  if (!Number.isFinite(value)) return null;
  const pointer = Math.round(value);
  if (Math.abs(value - pointer) > 1e-9 || pointer < 1) return null;
  return pointer;
}

function isMissingDisplacementNode(value) {
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - ZERO_DISPLACEMENT_NODE) < 1e-9
    || Math.abs(value - MISSING_DISPLACEMENT_NODE) < 1e-6;
}

function displacementNode(ref) {
  const values = decodeCiiNumericRow(ref?.body || '');
  const value = values?.[0];
  return Number.isFinite(value) ? value : null;
}

function validateDisplacementIdentity(refs, from, to) {
  const candidates = [displacementNode(refs[0]), displacementNode(refs[10])]
    .filter((value) => Number.isFinite(value) && !isMissingDisplacementNode(value))
    .map((value) => Math.round(value));
  if (!candidates.length) return ['DISPLMNT_BLOCK_HAS_NO_ENDPOINT_IDENTITY'];
  const allowed = new Set([from, to]);
  const outside = candidates.filter((value) => !allowed.has(value));
  if (outside.length) return [`DISPLMNT_ENDPOINT_IDENTITY_MISMATCH:${outside.join(',')}`];
  return [];
}

function resolveDisplacement(lines, operation) {
  const element = exactElementBlock(lines, operation);
  if (element.status !== 'PASS') return element;
  const pointer = displacementPointer(element.block);
  if (pointer == null) return { status: 'BLOCKED', blockers: [`DISPLMNT_POINTER_REQUIRED:${element.block.from}:${element.block.to}`] };
  const section = sectionRefs(lines, 'DISPLMNT');
  if (section.status !== 'PASS') return section;
  if (!section.refs.length || section.refs.length % DISPLMNT_ROWS !== 0) {
    return { status: 'BLOCKED', blockers: [`DISPLMNT_BLOCK_CARDINALITY_INVALID:${section.refs.length}`] };
  }
  const blockCount = section.refs.length / DISPLMNT_ROWS;
  if (pointer > blockCount) return { status: 'BLOCKED', blockers: [`DISPLMNT_POINTER_OUT_OF_RANGE:${pointer}:${blockCount}`] };
  const start = (pointer - 1) * DISPLMNT_ROWS;
  const refs = section.refs.slice(start, start + DISPLMNT_ROWS);
  const identityBlockers = validateDisplacementIdentity(refs, element.block.from, element.block.to);
  if (identityBlockers.length) return { status: 'BLOCKED', blockers: identityBlockers };
  return Object.freeze({
    status: 'PASS',
    scope: 'BLOCK',
    block: 'DISPLACEMENT',
    authority: 'CII_V14_ELEMENT_DISPLMNT_POINTER_20_ROW_BLOCK',
    spans: lineSpans(refs, { section: 'DISPLMNT', pointer }),
    evidence: Object.freeze({
      from: element.block.from,
      to: element.block.to,
      elementIndex: element.block.index,
      pointer,
      rowCount: DISPLMNT_ROWS,
    }),
    blockers: Object.freeze([]),
  });
}

function resolveForce() {
  return Object.freeze({
    status: 'BLOCKED',
    scope: 'BLOCK',
    block: 'FORCE',
    authority: 'CII_FORCMNT_20_ROW_BLOCK_AUTHORITY_PENDING_OWNERSHIP_MAP',
    spans: Object.freeze([]),
    evidence: Object.freeze({ rowsPerBlock: FORCMNT_ROWS }),
    blockers: Object.freeze(['FORCMNT_BLOCK_AUTHORITY_NOT_QUALIFIED']),
  });
}

function documentSpans(lines) {
  return Object.freeze(lines.filter((line) => line.body.length > 0).map((line) => Object.freeze({
    start: line.start,
    end: line.bodyEnd,
    lineIndex: lines.indexOf(line),
    section: 'DOCUMENT',
  })));
}

function blockToken(value) {
  return String(value || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
}

export function resolveFindReplaceScope(target0Input, operation = {}) {
  const lines = physicalLines(target0Input);
  const scope = String(operation?.scope || 'DOCUMENT').trim().toUpperCase();
  if (scope === 'DOCUMENT') {
    return Object.freeze({
      status: 'PASS',
      scope,
      authority: 'TARGET0_PHYSICAL_LINE_BODIES',
      spans: documentSpans(lines),
      evidence: Object.freeze({ lineCount: lines.length }),
      blockers: Object.freeze([]),
    });
  }
  if (scope === 'ELEMENT') return resolveElement(lines, operation);
  if (scope === 'BLOCK') {
    const block = blockToken(operation?.block);
    if (block === 'NODENAME') return resolveNodeNameScope(lines, operation, { sectionRefs, elementBlocks, exactElementBlock });
    if (block === 'DISPLACEMENT' || block === 'DISPLMNT') return resolveDisplacement(lines, operation);
    if (block === 'FORCE' || block === 'FORCMNT') return resolveForce();
    return Object.freeze({ status: 'BLOCKED', scope, block, spans: Object.freeze([]), blockers: Object.freeze([`BLOCK_SCOPE_UNSUPPORTED:${block || 'UNKNOWN'}`]) });
  }
  return Object.freeze({ status: 'BLOCKED', scope, spans: Object.freeze([]), blockers: Object.freeze([`SCOPE_UNSUPPORTED:${scope || 'UNKNOWN'}`]) });
}

export const _test = Object.freeze({
  physicalLines,
  sectionRefs,
  elementBlocks,
  exactElementBlock,
  displacementPointer,
});
