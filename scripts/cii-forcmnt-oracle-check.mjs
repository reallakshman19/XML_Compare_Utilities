#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CII_SIX_FIELD_WIDTHS,
  decodeCiiNumericRow,
  decodeFixedFields,
  parseFortranNumber,
} from '../parser/fixed-field.js';
import { _test as scopeResolverTest } from '../tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js';

const ELEMENT_FORCMNT_POINTER_ROW = 12;
const ELEMENT_FORCMNT_POINTER_FIELD = 5;
const FORCMNT_ROWS_PER_BLOCK = 20;

function safeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (Math.abs(number - rounded) > 1e-9 || !Number.isSafeInteger(rounded)) return null;
  return rounded;
}

function numericVersion(refs) {
  for (const ref of refs || []) {
    const values = decodeCiiNumericRow(ref.body);
    if (!values || values.length < 2) continue;
    const version = Number(values[1]);
    if (Number.isFinite(version)) return version;
  }
  return null;
}

function controlForcmntCount(refs) {
  const row = refs?.[1];
  if (!row) return null;
  const values = decodeCiiNumericRow(row.body);
  return safeInteger(values?.[5]);
}

function elementForcmntPointer(block) {
  const ref = block?.refs?.[ELEMENT_FORCMNT_POINTER_ROW];
  if (!ref) return null;
  const fields = decodeFixedFields(ref.body, CII_SIX_FIELD_WIDTHS);
  const value = parseFortranNumber(fields[ELEMENT_FORCMNT_POINTER_FIELD]);
  return safeInteger(value);
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function blockHeadValue(refs, offset) {
  const values = decodeCiiNumericRow(refs?.[offset]?.body || '');
  return Number.isFinite(values?.[0]) ? values[0] : null;
}

export function inspectForcmntOracleCandidate(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(String(input ?? ''), 'utf8');
  const text = bytes.toString('utf8');
  const lines = scopeResolverTest.physicalLines(text);
  const blockers = [];

  const versionSection = scopeResolverTest.sectionRefs(lines, 'VERSION');
  const version = versionSection.status === 'PASS' ? numericVersion(versionSection.refs) : null;
  if (version !== 14) blockers.push(`TARGET_V14_REQUIRED:${version ?? 'UNKNOWN'}`);

  const controlSection = scopeResolverTest.sectionRefs(lines, 'CONTROL');
  const controlCount = controlSection.status === 'PASS' ? controlForcmntCount(controlSection.refs) : null;
  if (controlCount == null || controlCount < 0) blockers.push('CONTROL_FORCMNT_COUNT_INVALID');
  else if (controlCount === 0) blockers.push('CONTROL_FORCMNT_NONZERO_REQUIRED');

  const parsedElements = scopeResolverTest.elementBlocks(lines);
  const elementPointers = [];
  if (parsedElements.status !== 'PASS') {
    blockers.push(...(parsedElements.blockers || ['ELEMENT_BLOCKS_INVALID']));
  } else {
    for (const block of parsedElements.blocks) {
      const pointer = elementForcmntPointer(block);
      if (pointer == null || pointer < 0) {
        blockers.push(`ELEMENT_FORCMNT_POINTER_INVALID:${block.index}:${block.from}:${block.to}`);
        continue;
      }
      elementPointers.push(Object.freeze({
        elementIndex: block.index,
        from: block.from,
        to: block.to,
        pointer,
      }));
    }
  }

  const positivePointers = elementPointers.filter((entry) => entry.pointer > 0);
  if (!positivePointers.length) blockers.push('ELEMENT_FORCMNT_POSITIVE_POINTER_REQUIRED');

  const forcmntSection = scopeResolverTest.sectionRefs(lines, 'FORCMNT');
  const physicalRows = forcmntSection.status === 'PASS' ? forcmntSection.refs.length : 0;
  if (forcmntSection.status !== 'PASS') blockers.push('SECTION_NOT_FOUND:FORCMNT');

  const expectedRows = Number.isInteger(controlCount) && controlCount >= 0
    ? controlCount * FORCMNT_ROWS_PER_BLOCK
    : null;
  if (expectedRows != null && physicalRows !== expectedRows) {
    blockers.push(`FORCMNT_CONTROL_CARDINALITY_MISMATCH:${physicalRows}:${expectedRows}`);
  }
  if (physicalRows && physicalRows % FORCMNT_ROWS_PER_BLOCK !== 0) {
    blockers.push(`FORCMNT_20_ROW_ALIGNMENT_REQUIRED:${physicalRows}`);
  }

  const blockCount = physicalRows % FORCMNT_ROWS_PER_BLOCK === 0
    ? physicalRows / FORCMNT_ROWS_PER_BLOCK
    : null;
  if (blockCount != null) {
    for (const entry of positivePointers) {
      if (entry.pointer > blockCount) {
        blockers.push(`ELEMENT_FORCMNT_POINTER_OUT_OF_RANGE:${entry.pointer}:${blockCount}:${entry.from}:${entry.to}`);
      }
    }
  }

  const blockEvidence = [];
  if (forcmntSection.status === 'PASS' && blockCount != null) {
    for (let index = 0; index < blockCount; index += 1) {
      const start = index * FORCMNT_ROWS_PER_BLOCK;
      const refs = forcmntSection.refs.slice(start, start + FORCMNT_ROWS_PER_BLOCK);
      blockEvidence.push(Object.freeze({
        pointer: index + 1,
        rowCount: refs.length,
        firstPhysicalLine: refs[0]?.lineIndex != null ? refs[0].lineIndex + 1 : null,
        lastPhysicalLine: refs.at(-1)?.lineIndex != null ? refs.at(-1).lineIndex + 1 : null,
        specification1HeadValue: blockHeadValue(refs, 0),
        specification2HeadValue: blockHeadValue(refs, 10),
      }));
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const status = uniqueBlockers.length ? 'BLOCKED' : 'PASS_CANDIDATE';
  return Object.freeze({
    schema: 'CiiForcmntOracleCandidate.v1',
    status,
    source: Object.freeze({
      byteLength: bytes.length,
      sha256: sha256Hex(bytes),
    }),
    evidence: Object.freeze({
      version,
      controlForcmntCount: controlCount,
      rowsPerForcmntBlock: FORCMNT_ROWS_PER_BLOCK,
      physicalForcmntRows: physicalRows,
      physicalForcmntBlockCount: blockCount,
      positiveElementPointers: Object.freeze(positivePointers),
      allElementPointers: Object.freeze(elementPointers),
      blocks: Object.freeze(blockEvidence),
    }),
    blockers: uniqueBlockers,
    mutationAuthority: 'NONE',
    mutableSpans: Object.freeze([]),
    nextQualificationGate: 'RETAIN_EXACT_BYTES_AND_DECODE_BOTH_10_ROW_SPECS_WITH_NODE_VECTOR_SENTINEL_AND_ADJACENT_FALSIFIERS',
  });
}

function main(argv) {
  const candidate = argv[2];
  if (!candidate) {
    console.error('Usage: node scripts/cii-forcmnt-oracle-check.mjs <candidate-v14.cii>');
    return 64;
  }
  const bytes = fs.readFileSync(candidate);
  const result = inspectForcmntOracleCandidate(bytes);
  console.log(JSON.stringify({ file: path.resolve(candidate), ...result }, null, 2));
  return result.status === 'PASS_CANDIDATE' ? 0 : 2;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main(process.argv);

export const _test = Object.freeze({
  ELEMENT_FORCMNT_POINTER_ROW,
  ELEMENT_FORCMNT_POINTER_FIELD,
  FORCMNT_ROWS_PER_BLOCK,
  safeInteger,
  numericVersion,
  controlForcmntCount,
  elementForcmntPointer,
});
