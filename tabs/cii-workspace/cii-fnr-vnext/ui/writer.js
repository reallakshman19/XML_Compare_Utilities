/* Single byte writer for VNext proposals. It neither accepts raw string edits nor mutates TARGET0. */
import { parseCii, sameStructure } from './physical.js';
const invalid = (reason) => { throw new Error(reason); };
const hex = (digest) => [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, '0')).join('');
export async function sha256(bytes) {
  if (!(bytes instanceof Uint8Array)) invalid('HASH_BYTES_REQUIRED');
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}
const ascii = (s) => { if (typeof s !== 'string' || /[^\x20-\x7e]/.test(s)) invalid('CLAIM_NON_ASCII'); return Uint8Array.from(s, (ch) => ch.charCodeAt(0)); };
const equal = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);

export async function validatePostimage({ original, originalHash, plan, approvedIds, tab = 'NORMAL' }) {
  if (!(original instanceof Uint8Array) || !Array.isArray(plan?.claims) ||
      plan?.schema !== 'CiiFnrVnext.Proposals.v1' || plan?.incompleteSearch !== false ||
      !/^[0-9a-f]{64}$/.test(originalHash || '')) invalid('POSTIMAGE_INPUT_MALFORMED');
  if (tab === 'GEOMETRY') invalid('ATOMIC_BRANCH_GROUP_CONTRACT_REQUIRED');
  if ((await sha256(original)) !== originalHash || plan.targetSha256 !== originalHash) invalid('TARGET0_HASH_STALE');
  const approved = new Set(approvedIds);
  if (approved.size !== approvedIds.length) invalid('CLAIM_ID_DUPLICATE_OR_UNKNOWN');
  if (!approved.size) invalid('EXPLICIT_APPROVAL_REQUIRED');
  if (!plan.claims.every((c) => c && typeof c.id === 'string' && typeof c.ruleId === 'string' && c.evidence && typeof c.evidence === 'object' &&
       !Array.isArray(c.evidence) && ['PROPOSED', 'HOLD', 'CONFLICT', 'REJECTED'].includes(c.status))) invalid('CLAIM_SCHEMA_INVALID');
  if ((plan.diagnostics || []).some((d) => d.severity === 'ERROR')) invalid('PLAN_HAS_BLOCKING_DIAGNOSTICS');
  const allRanges = plan.claims.filter((c) => c.status === 'PROPOSED' || c.status === 'CONFLICT')
    .sort((a, b) => a.byteStart - b.byteStart);
  for (let i = 1; i < allRanges.length; i++) {
    if (allRanges[i].byteStart < allRanges[i - 1].byteEnd) invalid('CLAIM_OVERLAP_OR_UNSUPPORTED');
  }
  const claimIds = new Set(plan.claims.map((c) => c.id));
  if (claimIds.size !== plan.claims.length || [...approved].some((id) => !claimIds.has(id))) invalid('CLAIM_ID_DUPLICATE_OR_UNKNOWN');
  const parsed = parseCii(original);
  const legal = new Map(parsed.fields.filter((f) => !f.shared && !f.orphan)
    .map((f) => [`${f.byteStart}:${f.byteEnd}:${f.fieldIdentity}`, f]));
  const changes = plan.claims.filter((c) => approved.has(c.id)).sort((a, b) => a.byteStart - b.byteStart);
  let priorEnd = -1;
  for (const c of changes) {
    if (c.status !== 'PROPOSED' || c.section !== 'NODENAME' ||
        !Number.isSafeInteger(c.byteStart) || !Number.isSafeInteger(c.byteEnd) ||
        c.byteStart < 0 || c.byteEnd > original.length || c.byteStart >= c.byteEnd || c.byteStart < priorEnd) invalid('CLAIM_OVERLAP_OR_UNSUPPORTED');
    const field = legal.get(`${c.byteStart}:${c.byteEnd}:${c.fieldIdentity}`);
    if (!field || field.before !== c.before || !field.owners.includes(c.targetElementWitness)) invalid('FIELD_OWNERSHIP_OR_PREIMAGE_INVALID');
    if (c.before.length !== c.byteEnd - c.byteStart || c.after?.length !== c.before.length ||
        !equal(original.subarray(c.byteStart, c.byteEnd), ascii(c.before)) ||
        c.after.trim() === '' || !equal(ascii(c.after), ascii(c.after.trim().padEnd(c.after.length, ' ')))) invalid('CLAIM_WIDTH_OR_BEFORE_INVALID');
    priorEnd = c.byteEnd;
  }
  const output = new Uint8Array(original);
  for (const c of changes) output.set(ascii(c.after), c.byteStart);
  const reparsed = parseCii(output);
  if (!sameStructure(parsed, reparsed)) invalid('TARGET1_STRUCTURAL_REPARSE_FAILED');
  const changed = new Set();
  for (const c of changes) for (let i = c.byteStart; i < c.byteEnd; i++) changed.add(i);
  for (let i = 0; i < original.length; i++) if (original[i] !== output[i] && !changed.has(i)) invalid('UNAUTHORIZED_BYTE_CHANGE');
  return { bytes: output, originalHash, target1Hash: await sha256(output),
    audit: changes.map(({ id, ruleId, fieldIdentity, byteStart, byteEnd, before, after, targetElementWitness }) =>
      ({ id, ruleId, fieldIdentity, byteStart, byteEnd, before, after, targetElementWitness })) };
}
