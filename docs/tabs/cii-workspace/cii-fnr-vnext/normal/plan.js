/* VNext Normal: independently planned fixed-field claims only; no file mutation. */
import { parseCii } from '../ui/physical.js';
import { branchContainsNode } from './branch-scope.js';
const flagsAllowed = /^[giu]*$/;
const diag = (code, ruleId, detail) => ({ severity: 'ERROR', code, ruleId, detail });

function regexFor(rule) {
  const source = String(rule.find ?? ''); const flags = String(rule.flags || '');
  if (source.length > 256 || !flagsAllowed.test(flags) || new Set(flags).size !== flags.length ||
      /\((?:[^()]|\\.)*(?:\+|\*|\{\d+,?\d*\})(?:[^()]|\\.)*\)(?:\+|\*|\{\d+,?\d*\})/.test(source)) {
    throw new Error('REGEX_UNSAFE_OR_FLAGS_UNSUPPORTED');
  }
  return new RegExp(source, flags);
}
function replaceInside(value, rule) {
  const find = String(rule.find ?? ''), replace = String(rule.replace ?? '');
  if (!find) throw new Error('EMPTY_FIND_UNSUPPORTED');
  if (rule.mode === 'REGEX') {
    const re = regexFor(rule);
    // A zero-length global match is ambiguous in a fixed-field name.
    if (re.test('') || new RegExp(re.source, re.flags.replace(/g/g, '')).test('')) {
      throw new Error('REGEX_EMPTY_MATCH_UNSUPPORTED');
    }
    const matches = [...value.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
    if (matches.some((m) => m[0].length === 0)) throw new Error('REGEX_EMPTY_MATCH_UNSUPPORTED');
    if (!matches.length) return { value, count: 0 };
    return { value: value.replace(new RegExp(re.source, re.flags), replace), count: re.global ? matches.length : 1 };
  }
  if (rule.mode !== 'LITERAL') throw new Error('MODE_UNSUPPORTED');
  const count = value.split(find).length - 1;
  return { value: count ? value.split(find).join(replace) : value, count };
}
function eligible(field, parsed, rule) {
  const scope = rule.scope || 'DOCUMENT';
  const selected = rule.field || 'NODENAME.BOTH';
  if (!['NODENAME.BOTH', 'NODENAME.FROM', 'NODENAME.TO'].includes(selected)) throw new Error('FIELD_UNSUPPORTED');
  if (selected !== 'NODENAME.BOTH' && field.fieldIdentity !== selected) return false;
  if (!['DOCUMENT', 'ELEMENT', 'BLOCK', 'BRANCH'].includes(scope)) throw new Error('SCOPE_UNSUPPORTED');
  if (scope === 'BRANCH') return parsed.elements.some((e) => e.pointer === field.pointer && e.branch === rule.branch);
  if (scope === 'BLOCK' && String(rule.block || 'NODENAME').toUpperCase() !== 'NODENAME') throw new Error('BLOCK_UNSUPPORTED');
  if (scope !== 'DOCUMENT') {
    const from = Number(rule.from), to = Number(rule.to);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || String(rule.from).trim() === '' || String(rule.to).trim() === '') throw new Error('ELEMENT_FILTER_REQUIRED');
    return parsed.elements.some((e) => e.pointer === field.pointer && e.from === from && e.to === to);
  }
  return true;
}

export function planNormal(request) {
  if (request.tab !== 'NORMAL' || !(request.targetBytes instanceof Uint8Array) || !Array.isArray(request.rules) ||
      !/^[a-f0-9]{64}$/i.test(request.originalTargetSha256 || '')) throw new Error('NORMAL_REQUEST_MALFORMED');
  const parsed = parseCii(request.targetBytes), claims = [], diagnostics = [], observations = [];
  for (const [ri, rule] of request.rules.entries()) {
    const ruleId = String(rule.id ?? `r${ri + 1}`); let count = 0;
    try {
      if (!['LITERAL', 'REGEX'].includes(rule.mode)) throw new Error('MODE_UNSUPPORTED');
      if (rule.scope === 'BRANCH' && (typeof rule.branch !== 'string' ||
          !rule.branch.startsWith('/') || /[^\x20-\x7e]/.test(rule.branch))) throw new Error('BRANCH_FILTER_REQUIRED');
      const candidates = parsed.fields.filter((f) => eligible(f, parsed, rule));
      for (const field of candidates) {
        const value = field.before.trim(); const result = replaceInside(value, rule);
        if (!result.count) continue;
        count += result.count;
        if (rule.scope === 'BRANCH' && !branchContainsNode(parsed, field, rule.branch)) {
          diagnostics.push(diag('BRANCH_NODE_CROSSES_SCOPE', ruleId, field.owners.join(','))); continue;
        }
        if (field.shared || field.orphan) {
          diagnostics.push(diag('NODENAME_POINTER_ALIAS_OR_ORPHAN', ruleId, `${field.pointer}`)); continue;
        }
        if (/[^\x20-\x7e]|[\r\n]/.test(result.value)) {
          diagnostics.push(diag('NON_ASCII_REPLACEMENT', ruleId, field.fieldIdentity)); continue;
        }
        if (result.value.length > field.before.length || !result.value.trim()) {
          diagnostics.push(diag('FIELD_WIDTH_OR_EMPTY_OVERFLOW', ruleId, `${result.value.length}/${field.before.length}`)); continue;
        }
        const after = result.value.padEnd(field.before.length, ' ');
        if (after === field.before) continue;
        claims.push({ id: `${ruleId}:${field.byteStart}:${field.byteEnd}`, ruleId,
          targetElementWitness: field.owners[0], section: 'NODENAME', fieldIdentity: field.fieldIdentity,
          byteStart: field.byteStart, byteEnd: field.byteEnd, before: field.before, after,
          evidence: { matchCount: result.count, scope: rule.scope || 'DOCUMENT', pointer: field.pointer,
            ...(rule.scope === 'BRANCH' ? { branch: rule.branch } : {}) }, status: 'PROPOSED' });
      }
      if (!count) diagnostics.push({ severity: 'INFO', code: 'ZERO_MATCHES', ruleId });
      observations.push({ ruleId, matches: count });
    } catch (err) { diagnostics.push(diag(err.message || 'RULE_INVALID', ruleId, 'Rule was not admitted')); }
  }
  const spans = new Map();
  for (const claim of claims) {
    const key = `${claim.byteStart}:${claim.byteEnd}`;
    if (spans.has(key)) {
      claim.status = 'CONFLICT'; spans.get(key).status = 'CONFLICT';
      diagnostics.push(diag('DUPLICATE_FIELD_CLAIM', claim.ruleId, key));
    } else spans.set(key, claim);
  }
  return { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: request.originalTargetSha256,
    claims, diagnostics, observations, incompleteSearch: false };
}
