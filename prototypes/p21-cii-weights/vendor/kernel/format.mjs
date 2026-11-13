// Write a new value in the same form as the old token of that CII field.
// Pure: no DOM, no fs, no network.
import { require } from '../kit/core.mjs';

/** v14 number style: optional sign, one digit, point, N decimals, E/D, exponent sign, digits. e.g. 1.390000E+03 */
const EXP_FORM = /^([+-]?)(\d)\.(\d+)([EeDd])([+-])(\d+)$/;

/** The number form of an old token: {decimals, letter, expDigits}. Refuses KERNEL_TOKEN_FORM_UNKNOWN. */
export function tokenForm(oldToken, where = '') {
  const m = EXP_FORM.exec(String(oldToken).trim());
  require(m, 'KERNEL_TOKEN_FORM_UNKNOWN', where, 'old token ' + JSON.stringify(oldToken) + ' is not in v14 exponent form (like 1.390000E+03)');
  return { decimals: m[3].length, letter: m[4], expDigits: m[6].length };
}

/** A new value (number or numeric string) as a finite number. Refuses KERNEL_VALUE_INVALID. */
export function numberOf(newValue, where = '') {
  const text = typeof newValue === 'number' ? null : String(newValue).trim();
  const ok = typeof newValue === 'number' || /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/.test(text);
  const v = typeof newValue === 'number' ? newValue : ok ? Number(text.replace(/[Dd]/g, 'E')) : NaN;
  require(ok && Number.isFinite(v), 'KERNEL_VALUE_INVALID', where, 'new value ' + JSON.stringify(newValue) + ' is not a finite number');
  // A non-zero text such as "1e-400" reads as 0 in floating point: refuse rather than write a zero.
  require(v !== 0 || text === null || !/[1-9]/.test(text.split(/[EeDd]/)[0]), 'KERNEL_VALUE_PRECISION_LOST', where,
    'new value ' + JSON.stringify(newValue) + ' is not zero but is too small to hold');
  return v === 0 ? 0 : v; // -0 -> 0
}

/**
 * Format a number for a 13-character CII field in the same form as oldToken.
 * Returns the full field text (right-aligned, exactly `width` characters).
 * Refuses KERNEL_TOKEN_FORM_UNKNOWN, KERNEL_VALUE_INVALID, KERNEL_VALUE_DOES_NOT_FIT, and
 * KERNEL_VALUE_PRECISION_LOST when the written token, read back, is not the value asked for
 * (more digits than the field keeps, or a non-zero value that would be written as zero).
 * Float noise is allowed: up to one millionth of a unit in the last written place.
 */
export function formatCiiNumber(value, oldToken = '0.000000E+00', width = 13, where = '') {
  const { decimals, letter, expDigits } = tokenForm(oldToken, where);
  const v = numberOf(value, where);
  const m = /^(-?)(\d)\.(\d+)e([+-])(\d+)$/.exec(v.toExponential(decimals));
  require(m, 'KERNEL_VALUE_INVALID', where, 'cannot write ' + v);
  require(m[5].length <= expDigits, 'KERNEL_VALUE_DOES_NOT_FIT', where,
    v + ' needs a ' + m[5].length + '-digit exponent; the old token ' + JSON.stringify(oldToken) + ' has ' + expDigits);
  const token = m[1] + m[2] + '.' + m[3] + letter + m[4] + m[5].padStart(expDigits, '0');
  require(token.length <= width, 'KERNEL_VALUE_DOES_NOT_FIT', where, token + ' is ' + token.length + ' characters; the field holds ' + width);
  const back = Number(token.replace(/[Dd]/, 'E'));
  const ulp = Math.pow(10, Number(m[4] + m[5]) - decimals);
  require(!(v !== 0 && back === 0) && Math.abs(back - v) <= ulp * 1e-6, 'KERNEL_VALUE_PRECISION_LOST', where,
    v + ' would be written as ' + token + '; the field keeps ' + (decimals + 1) + ' significant digits');
  return token.padStart(width, ' ');
}

/** A rigid weight: never negative; 0 only with approval.zeroConfirmed. Returns the number. */
export function weightValue(newValue, zeroConfirmed, where = '') {
  const v = numberOf(newValue, where);
  require(v >= 0, 'KERNEL_NEGATIVE_WEIGHT', where, 'weight ' + v + ' is negative');
  require(v !== 0 || zeroConfirmed === true, 'KERNEL_ZERO_NOT_CONFIRMED', where, 'weight 0 needs approval.zeroConfirmed = true');
  return v;
}

/** NODENAME names: printable ASCII, no leading/trailing spaces, at most 25 characters (XCU nodal-transfer.js). */
export const NAME_MAX = 25;

/** Write a node name left-aligned in a name span of `width` characters. */
export function formatCiiName(name, width, where = '') {
  require(typeof name === 'string' && /^[\x20-\x7e]*$/.test(name) && name === name.trim() && name.length > 0,
    'KERNEL_NAME_INVALID', where, 'name ' + JSON.stringify(name) + ' must be printable ASCII text without leading or trailing spaces');
  require(name.length <= Math.min(NAME_MAX, width), 'KERNEL_VALUE_DOES_NOT_FIT', where,
    'name has ' + name.length + ' characters; at most ' + Math.min(NAME_MAX, width) + ' fit');
  return name.padEnd(width, ' ');
}

