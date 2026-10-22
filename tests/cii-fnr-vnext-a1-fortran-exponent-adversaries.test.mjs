import assert from 'node:assert/strict';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';

// Synthetic-only independent field-width regression for FORTRAN scalar notation.
// This deliberately exercises both accepted and rejected lexical forms; it does
// not claim to authenticate private ORIGINAL CII files or the full UI writer.
const row = (values) => values.map((v, i) => String(v).padStart(i ? 13 : 15)).join('');
const element = (from, to, pointer) => Array.from({ length: 15 }, (_, i) =>
  i === 0 ? row([from, to, 120, 0, 0, 0]) :
    i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));
const make = ({ from = '1.0D+01', to = '2.0D+01', pointer = '1.0D+00',
  count = '1.0D+00', newline = '\n' } = {}) => {
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', row([2, 0, 0, count, 0, 0]),
    '#$ ELEMENTS', ...element(from, to, pointer),
    '#$ NODENAME', '  ' + 'FROM'.padEnd(26) + 'TO'.padEnd(25),
  ];
  return new TextEncoder().encode(lines.join(newline) + newline);
};

for (const newline of ['\n', '\r\n']) {
  for (const [from, to, pointer, count, expected] of [
    ['1.0E+01', '2.0E+01', '1.0E+00', '1.0E+00', [10, 20]],
    ['1.0e+01', '2.0e+01', '1.0e+00', '1.0e+00', [10, 20]],
    ['1.0D+01', '2.0D+01', '1.0D+00', '1.0D+00', [10, 20]],
    ['1.0d+01', '2.0d+01', '1.0d+00', '1.0d+00', [10, 20]],
    ['+1.0D+01', '+2.0D+01', '+1.0D+00', '+1.0D+00', [10, 20]],
    ['.10D+02', '.20D+02', '.10D+01', '.10D+01', [10, 20]],
    ['10.D+00', '20.D+00', '1.D+00', '1.D+00', [10, 20]],
    ['100.D-01', '200.D-01', '10.D-01', '10.D-01', [10, 20]],
  ]) {
    const original = make({ from, to, pointer, count, newline });
    const copy = original.slice();
    const parsed = parseCii(original);
    assert.deepEqual([parsed.elements[0].from, parsed.elements[0].to], expected);
    assert.equal(parsed.elements[0].pointer, 1);
    assert.equal(parsed.nonam, 1);
    assert.deepEqual(original, copy, 'parser must not mutate TARGET0');
  }
  for (const [field, value, diagnostic] of [
    ['from', '1.5D+00', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '9.00720D+15', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '1.0D+999', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '1.0D', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '1.0D+01junk', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '1,0D+01', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['from', '1.0+01', 'ELEMENT_ENDPOINT_NOT_INTEGER'],
    ['pointer', '1.25D+00', 'NODENAME_POINTER_INVALID'],
    ['pointer', '-1.0D+00', 'NODENAME_POINTER_INVALID'],
    ['pointer', '1.0D+999', 'NODENAME_POINTER_INVALID'],
    ['count', '1.5D+00', 'CONTROL_NONAM_INVALID'],
    ['count', '-1.0D+00', 'CONTROL_NONAM_INVALID'],
    ['count', '1.0D+999', 'CONTROL_NONAM_INVALID'],
  ]) {
    assert.throws(() => parseCii(make({ [field]: value, newline })), new RegExp(diagnostic),
      field + '=' + value + ' must fail ' + diagnostic);
  }
}
console.log('PASS synthetic FORTRAN exponent variants and malformed/unsafe integers: LF and CRLF');
