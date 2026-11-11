import {normalizeGraph, topologyCandidates, G2_VERSION} from './topology.mjs';
const MODES = ['Manual', 'Topology', 'OR', 'AND'];
const key = (sSha, s, tSha, t) => JSON.stringify([sSha, s, tSha, t]);
const id = x => String(x).trim();
export function reviewLedger(sourceInput, targetInput, inputs = {}, mode = 'OR') {
  if (!MODES.includes(mode)) throw Error('G2_MODE_INVALID');
  const s = normalizeGraph(sourceInput), t = normalizeGraph(targetInput);
  const validS = new Set(s.ids), validT = new Set(t.ids);
  const external = [...(inputs.manual || []), ...(inputs.coordinate || [])];
  if (external.length && (inputs.sourceSha256 !== s.sha256 || inputs.targetSha256 !== t.sha256))
    throw Error('G2_HYPOTHESES_SHA_MISMATCH');
  const top = topologyCandidates(sourceInput, targetInput);
  const rows = new Map(), nonNodeEvidence = [];
  function add(record, role, witness) {
    if (record?.kind === 'SEGMENT') {
      nonNodeEvidence.push({role, kind: 'SEGMENT', witness: record.witness || null,
        source: record.source == null ? null : id(record.source)});
      return;
    }
    if (record?.kind && record.kind !== 'NODE') throw Error('G2_EVIDENCE_KIND_INVALID');
    if (record?.source == null || record?.target == null) throw Error('G2_PAIR_REQUIRED');
    const source = id(record.source), target = id(record.target);
    if (!validS.has(source) || !validT.has(target)) throw Error('G2_PAIR_NODE_NOT_IN_GRAPH');
    const k = key(s.sha256, source, t.sha256, target);
    const old = rows.get(k) || {key: k, source, target, roles: [], witnesses: []};
    if (!old.roles.includes(role)) old.roles.push(role);
    if (witness != null) old.witnesses.push({role, witness});
    rows.set(k, old);
  }
  for (const x of inputs.manual || []) add(x, 'A', x.witness);
  for (const x of inputs.coordinate || []) add(x, 'C', x.witness);
  for (const x of top.pairs) add(x, 'T', x.witness);
  const allEvidence = [...rows.values()];
  const isManual = r => r.roles.includes('A') || r.roles.includes('C');
  const isTopology = r => r.roles.includes('T');
  const included = allEvidence.filter(r => mode === 'Manual' ? isManual(r) :
    mode === 'Topology' ? isTopology(r) : mode === 'OR' ? true : isManual(r) && isTopology(r));
  const excluded = mode === 'AND' ? allEvidence.filter(r => !(isManual(r) && isTopology(r))) : [];
  const conflicts = [];
  for (const [field, issue] of [['source','SOURCE_ALTERNATIVES'], ['target','TARGET_COLLISION']]) {
    const groups = new Map();
    for (const r of allEvidence) {
      if (!groups.has(r[field])) groups.set(r[field], []);
      groups.get(r[field]).push(r.key);
    }
    for (const [identity, keys] of groups) if (keys.length > 1)
      conflicts.push({type: issue, identity, pairKeys: keys});
  }
  for (const row of excluded) conflicts.push({type: 'EXCLUDED_BY_AND', pairKeys: [row.key]});
  return {schema: 'CIIFR.GEO.G2.BooleanReview.v1', algorithm: G2_VERSION,
    sourceSha256: s.sha256, targetSha256: t.sha256, mode,
    spatialResidual: 'NOT_EVALUATED', included, allEvidence, excluded,
    conflicts, nonNodeEvidence, topology: top.bySource,
    qualifiedNodeMap: [], physicalIdentityQualified: false, writerEligible: false};
}
