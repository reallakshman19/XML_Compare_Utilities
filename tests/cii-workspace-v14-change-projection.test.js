import assert from 'node:assert/strict';
import { projectCanonicalV14WriterDelta } from '../tabs/cii-workspace/cii-workspace-v14-change-projection.js';

function documentBytes(sections) {
  const lines = [];
  for (const [name, rows] of sections) {
    lines.push(`#$ ${name}`);
    lines.push(...rows);
  }
  return new TextEncoder().encode(`${lines.join('\r\n')}\r\n`);
}

function text(bytes) {
  return new TextDecoder('utf-8').decode(bytes);
}

function fixedRow(values) {
  return values.map((value, index) => String(value).padStart(index === 0 ? 15 : 13, ' ')).join('');
}

// Native V14 contains one more significant digit than the V11-normalized/canonical
// form. Writer2 changes only the second fixed field. The projection must preserve
// the first original V14 field rather than leaking converter canonicalization.
{
  const native = '   2.044599E+02' + '            4';
  const baseline = '   2.044600E+02' + '            4';
  const modified = '   2.044600E+02' + '            3';
  const original = documentBytes([
    ['RIGID', ['   2.044599E+02 0.000000E+00']],
    ['CONTROL', [native]],
  ]);
  const canonicalBaseline = documentBytes([
    ['RIGID', ['   2.044600E+02 0.000000E+00']],
    ['CONTROL', [baseline]],
  ]);
  const canonicalModified = documentBytes([
    ['RIGID', ['   2.044600E+02 0.000000E+00']],
    ['CONTROL', [modified]],
  ]);
  const result = projectCanonicalV14WriterDelta(original, canonicalBaseline, canonicalModified);
  const output = text(result.outputBytes);
  assert.match(output, /2\.044599E\+02 0\.000000E\+00/, 'unchanged RIGID section must remain native V14 bytes');
  assert.match(output, /2\.044599E\+02\s+3/, 'unchanged first field in changed row must remain original V14 while changed field projects');
  assert.deepEqual(result.changedSections, ['CONTROL']);
  assert.equal(result.ledger.filter((item) => item.operation === 'MERGE_FIXED_ROW').length, 1);
}

// A qualified auxiliary block deletion is represented as an isolated canonical
// row deletion. Original retained rows must be copied rather than canonical rows.
{
  const original = documentBytes([
    ['RESTRANT', ['native-A', 'delete-me', 'native-C']],
  ]);
  const baseline = documentBytes([
    ['RESTRANT', ['canonical-A', 'delete-me', 'canonical-C']],
  ]);
  const modified = documentBytes([
    ['RESTRANT', ['canonical-A', 'canonical-C']],
  ]);
  // Canonical anchors need to match baseline/modified. Keep original row identity
  // different to prove retained output rows come from original coordinates.
  const result = projectCanonicalV14WriterDelta(original, baseline, modified);
  assert.equal(text(result.outputBytes), '#$ RESTRANT\r\nnative-A\r\nnative-C\r\n');
  assert.deepEqual(result.ledger.map((item) => item.operation), ['DELETE_ROWS']);
}

// Non-isolated cardinality rewrite has no safe original-coordinate projection.
{
  const original = documentBytes([['NODENAME', ['A', 'B', 'C']]]);
  const baseline = documentBytes([['NODENAME', ['A', 'B', 'C']]]);
  const modified = documentBytes([['NODENAME', ['X', 'Y']]]);
  assert.throws(
    () => projectCanonicalV14WriterDelta(original, baseline, modified),
    /CII_V14_PROJECTION_NON_ISOLATED_CARDINALITY_RUN/,
  );
}

// Section-order drift and LF-only material are not projectable V14 custody.
{
  const original = documentBytes([['CONTROL', [fixedRow([1, 2, 3, 4, 5, 6])]]]);
  const reversed = documentBytes([['RIGID', ['x']], ['CONTROL', [fixedRow([1, 2, 3, 4, 5, 6])]]]);
  assert.throws(() => projectCanonicalV14WriterDelta(original, original, reversed), /SECTION_ORDER_MISMATCH/);
  assert.throws(
    () => projectCanonicalV14WriterDelta('#$ CONTROL\nrow\n', '#$ CONTROL\nrow\n', '#$ CONTROL\nrow\n'),
    /FINAL_CRLF_REQUIRED/,
  );
}

console.log('CII Workspace V14 canonical-delta projection: PASS');
