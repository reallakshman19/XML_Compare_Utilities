import { attempt, require, sha256Hex } from '../kit/core.mjs';
import { readCii14, rigidOf } from '../kit/cii14.mjs';
import { validate } from '../vendor/validate.mjs';

const FIELD = 'RIGID/WEIGHT';
const elementRef = e => ({ kind: 'cii', elementIndex: e.index, fromNode: String(e.from), toNode: String(e.to) });
function resolveElement(cii, ref, pairId, side) {
  const e = cii.elements[ref.elementIndex];
  require(e && String(e.from) === ref.fromNode && String(e.to) === ref.toNode,
    'PROPOSE_REF_MISMATCH', pairId, `${side} element index or FROM/TO does not match the CII`);
  return e;
}
const issues = doc => validate(doc).map(e => `${e.code}: ${e.msg}`).join('; ');

export function checkChangeset(changeset) {
  const errors = issues(changeset);
  require(changeset?.format === 'topofix.changeset' && !errors, 'PROPOSE_CHANGESET_INVALID', 'changeset', errors || 'Expected a Change set');
}
const units = cii => cii.sections.get('UNITS')?.map(row => row.text.trim()).join('\n');

/** Read-only, all-or-nothing. The map object is never modified. */
export async function proposeFromReference(referenceBytes, targetBytes, mapFile, { fields = [FIELD] } = {}) {
  return attempt(async () => {
    require(Array.isArray(fields) && fields.length === 1 && fields[0] === FIELD,
      'PROPOSE_FIELD_NOT_ENABLED', 'fields', 'Only RIGID/WEIGHT is supported');
    require(mapFile?.format === 'topofix.map', 'PROPOSE_MAP_INVALID', 'map', 'Expected a Map file');
    const mapErrors = issues(mapFile);
    require(!mapErrors, 'PROPOSE_MAP_INVALID', 'map', mapErrors);
    require(mapFile.source.kind === 'cii' && mapFile.target.kind === 'cii',
      'PROPOSE_MAP_INVALID', 'map', 'Both sides must be CII');
    const [sourceHash, targetHash] = await Promise.all([sha256Hex(referenceBytes), sha256Hex(targetBytes)]);
    require(mapFile.source.sha256.toLowerCase() === sourceHash && mapFile.target.sha256.toLowerCase() === targetHash,
      'PROPOSE_MAP_FILE_MISMATCH', 'map', 'Reference or target SHA-256 does not match the Map file');
    const source = readCii14(referenceBytes), target = readCii14(targetBytes);
    const sameUnits = Boolean(units(source)) && units(source) === units(target);
    const changes = [], unchanged = [], notComparable = [], review = [], rows = [];
    for (const pair of mapFile.pairs) {
      const { pairId, status } = pair;
      if (status !== 'approved') {
        review.push({ pairId, status, reason: 'Pair is not approved' });
        rows.push({ pairId, status: 'review', reason: `Pair is ${status}` });
        continue;
      }
      if (pair.source.kind !== 'cii' || pair.target.kind !== 'cii') {
        review.push({ pairId, status, reason: 'Not an element pair' });
        rows.push({ pairId, status: 'review', reason: 'Not an element pair' });
        continue;
      }
      // The shared validator does not reject additional ref keys; reject aliases
      // rather than allowing them to evade the 1:1 rule.
      require(Object.keys(pair.source).length === 4 && Object.keys(pair.target).length === 4,
        'PROPOSE_MAP_INVALID', pairId, 'Element refs must contain only kind, elementIndex, FROM and TO');
      const a = resolveElement(source, pair.source, pairId, 'Reference');
      const b = resolveElement(target, pair.target, pairId, 'Target');
      const ar = rigidOf(source, a.index), br = rigidOf(target, b.index);
      if (!ar && !br) continue;
      const row = { pairId, fromNode: String(b.from), toNode: String(b.to),
        targetWeight: br?.weight.value ?? null, referenceWeight: ar?.weight.value ?? null,
        differencePct: ar && br && br.weight.value !== 0 ? (ar.weight.value - br.weight.value) / Math.abs(br.weight.value) * 100 : null };
      if (!ar || !br) {
        const reason = !ar ? 'Reference has no rigid' : 'Target has no rigid';
        notComparable.push({ ...row, reason }); rows.push({ ...row, status: 'notComparable', reason });
        continue;
      }
      // A raw numeric transfer is safe only with a common unit basis.
      if (!sameUnits) {
        const reason = 'Weight unit basis cannot be established as identical';
        notComparable.push({ ...row, reason }); rows.push({ ...row, status: 'notComparable', reason });
        continue;
      }
      if (ar.weight.value === br.weight.value) {
        unchanged.push(row); rows.push({ ...row, status: 'unchanged', reason: 'Weights are equal' });
        continue;
      }
      // R9 requires human confirmation even for an unapproved zero proposal.
      // Never manufacture that confirmation; show the weight in the review table instead.
      if (ar.weight.value === 0) {
        const reason = 'Reference weight is zero; human confirmation required (R9)';
        review.push({ ...row, reason }); rows.push({ ...row, status: 'review', reason });
        continue;
      }
      changes.push({ changeId: `weight-${pairId}`, target: elementRef(b), field: FIELD,
        oldToken: br.weight.token, newValue: ar.weight.value,
        evidence: { source: 'reference-cii', pairId, detail: `Reference rigid ${ar.pointer} (${a.from}→${a.to}), weight ${ar.weight.token}` },
        approval: { approved: false } });
      rows.push({ ...row, status: 'proposal', reason: 'Reference weight differs' });
    }
    const changeset = { format: 'topofix.changeset', version: 1, createdAt: mapFile.createdAt,
      base: { kind: 'cii', fileName: mapFile.target.fileName, sha256: targetHash }, changes };
    checkChangeset(changeset);
    return { changeset, unchanged, notComparable, review, rows };
  });
}
