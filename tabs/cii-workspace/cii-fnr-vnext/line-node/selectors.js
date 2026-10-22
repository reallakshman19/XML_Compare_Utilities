// Full-field literal/regex selection. Capture expansion is restricted to a single field.
import { isPrintableAscii } from './bytes.js';
const MAX_PATTERN = 256;

function regexIsUnsupported(pattern) {
  if (pattern.length > MAX_PATTERN || /\\[1-9]/.test(pattern) || /\(\?<([=!])/.test(pattern)) return true;
  // Fail closed on nested repetition; do not assume a fast regex timeout exists.
  const stack = []; let escaped = false, inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === ']') { inClass = false; continue; }
    if (inClass) continue;
    if (c === '(') stack.push(false);
    else if ((c === '+' || c === '*' || c === '?' || c === '{') && stack.length) stack[stack.length-1] = true;
    else if (c === ')') {
      const innerRepeats = stack.pop();
      if (/^(?:[+*?]|\{\d)/.test(pattern.slice(i + 1))) return true;
      if (innerRepeats && stack.length) stack[stack.length-1] = true;
    }
  }
  return false;
}

export function compileSelector(spec, kind) {
  if (spec === undefined || spec === null) return null;
  if (!spec || typeof spec !== 'object') throw new Error(`${kind}_SELECTOR_INVALID`);
  const mode = spec.mode || 'literal';
  if (!['literal','regex'].includes(mode)) throw new Error(`${kind}_MODE_INVALID`);
  const pattern = mode === 'regex' ? spec.pattern : spec.value;
  if (typeof pattern !== 'string' || !pattern.length) throw new Error(`${kind}_PATTERN_EMPTY`);
  if (mode === 'literal') {
    if (spec.flags) throw new Error(`${kind}_LITERAL_FLAGS_UNSUPPORTED`);
    return { spec, kind, mode, match: text => text === pattern ? { captures: [], groups: {}, matched: text } : null,
      replace: () => spec.replace };
  }
  if (typeof spec.flags !== 'string' || !/^[imsu]*$/.test(spec.flags) || new Set(spec.flags).size !== spec.flags.length || regexIsUnsupported(pattern)) {
    throw new Error(`${kind}_REGEX_UNSAFE_OR_FLAGS`);
  }
  let regex;
  try { regex = new RegExp(pattern,spec.flags); }
  catch { throw new Error(`${kind}_REGEX_INVALID`); }
  return { spec, kind, mode, match: text => {
    const m = regex.exec(text);
    return m && m.index === 0 && m[0] === text ? { captures: m.slice(1), groups: m.groups || {}, matched: m[0] } : null;
  }, replace: text => text.replace(regex,String(spec.replace)) };
}

export function replacementFor(selector, current) {
  if (selector.spec.replace === undefined) return null;
  if (typeof selector.spec.replace !== 'string') throw new Error('REPLACEMENT_MUST_BE_TEXT');
  const replaced = selector.replace(current);
  if (!isPrintableAscii(replaced)) throw new Error('REPLACEMENT_NON_ASCII_OR_CONTROL');
  return replaced;
}

export function lineFamily(text) {
  // Entire prefix is retained; never equate lines merely on /B2-like suffixes.
  const match = /^(.*)\/(B\d+)$/i.exec(text);
  return match ? { base: match[1], suffix: match[2], validated: !!match[1] } :
    { base: text, suffix: null, validated: !!text };
}
