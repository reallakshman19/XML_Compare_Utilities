import {registeredMethodCPoint} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';

export const stableKey = value => JSON.stringify(value);
export function nodeKey(side, graph, id) {
  const node = graph.nodeIndex.get(String(id));
  if (!node) throw Error('Unknown ' + side + ' physical NODE: ' + id);
  return stableKey([side, graph.member, graph.sha256, node.component, String(id)]);
}
export const pairKey = (source, target, s, t) => stableKey([nodeKey('SOURCE', source, s), nodeKey('TARGET', target, t)]);
export const residualAt = (source, target, transform) => target.map((x,i) => x - registeredMethodCPoint(transform, source)[i]);
export const l1 = xyz => xyz.reduce((sum,x) => sum + Math.abs(x), 0);

export function initialProposals(result, tab) {
  return new Map(result.candidates.rows.map(row => {
    const target = row.anchorTarget || row.target || '';
    return [row.source, {source:row.source, target, checked:Boolean(target), tab,
      originalTarget:target, anchorTarget:row.anchorTarget, originPose:result.candidates.snapshot,
      label:row.anchorTarget ? 'Manual ' + tab + ' anchor' : 'Recommended candidate', revision:0}];
  }));
}
export function proposalDiagnostic(result, proposal) {
  const node = result.target.nodeIndex.get(proposal.target);
  if (!node) return 'Unknown TARGET physical NODE';
  if (node.component !== result.transform.targetComponent) return 'TARGET belongs to another coordinate component';
  return null;
}
export function candidateForPair(result, source, target) {
  const s = result.source.nodeIndex.get(source), t = result.target.nodeIndex.get(target);
  if (!s || !t) throw Error('Physical NODE pair required');
  const residual = residualAt(s.xyz, t.xyz, result.transform);
  return {target, targetMember:result.target.member, targetSha:result.target.sha256,
    xyz:t.xyz, residual, distance:Math.hypot(...residual), targetWitness:t.incident,
    originalElements:t.incident.map(i => result.target.edges[i]?.witness), od:t.od, wall:t.wall};
}
export function displayProposals(result, proposals) {
  const rows = result.candidates.rows.map(row => {
    const p = proposals.get(row.source), invalid = p?.target && proposalDiagnostic(result,p);
    if (!p?.target || invalid) return {...row, proposal:p, target:null, residual:null,
      status:invalid || row.status, alternatives:[], explanation:invalid || row.explanation};
    const candidate = candidateForPair(result,row.source,p.target);
    const alternatives = [candidate, ...row.alternatives.filter(alt => alt.target !== p.target)];
    return {...row, target:p.target, residual:candidate.residual, distance:candidate.distance,
      odDifference:row.sourceOd-candidate.od,wallDifference:row.sourceWall-candidate.wall,
      alternatives, proposal:p, status:p.label + (p.target !== p.originalTarget ? ' · edited proposal' : '')};
  });
  return {...result, candidates:{...result.candidates, rows}};
}
export function checkedUnion(tabs) {
  const byPair = new Map(), invalid = [];
  for (const [tab,entry] of Object.entries(tabs)) {
    if (!entry.result) continue;
    for (const p of entry.proposals.values()) {
      if (!p.checked) continue;
      const reason = !p.target ? 'No physical TARGET NODE' : proposalDiagnostic(entry.result,p);
      if (reason) { invalid.push({...p,reason}); continue; }
      const {source,target} = entry.result, key = pairKey(source,target,p.source,p.target);
      const groupKey = nodeKey('SOURCE',source,p.source);
      const pair = byPair.get(key) || {key, groupKey, source:p.source, target:p.target,
        targetKey:nodeKey('TARGET',target,p.target), origins:[], sourceComponent:source.nodeIndex.get(p.source).component,
        targetComponent:target.nodeIndex.get(p.target).component};
      pair.origins.push({tab, label:p.target===p.originalTarget?p.label:'Edited proposal from '+p.label,
        candidateTarget:p.target,originalTarget:p.originalTarget, revision:p.revision,
        anchorTarget:p.anchorTarget, originPose:p.originPose});
      byPair.set(key,pair);
    }
  }
  const bySource = new Map();
  for (const pair of byPair.values()) {
    if (!bySource.has(pair.groupKey)) bySource.set(pair.groupKey,[]);
    bySource.get(pair.groupKey).push(pair);
  }
  const groups = [...bySource].sort(([a],[b]) => a.localeCompare(b)).map(([key,options]) =>
    ({key, source:options[0].source, options:options.sort((a,b) => a.key.localeCompare(b.key))}));
  return {unique:groups.filter(g => g.options.length === 1).map(g => g.options[0]),
    groups:groups.filter(g => g.options.length > 1), allPairs:[...byPair.values()], invalid};
}
export function custodyDiagnostics(pairs) {
  const byTarget = new Map();
  for (const pair of pairs) {
    if (!byTarget.has(pair.targetKey)) byTarget.set(pair.targetKey,[]);
    byTarget.get(pair.targetKey).push(pair.source);
  }
  return [...byTarget].filter(([,sources]) => sources.length > 1)
    .map(([targetKey,sources]) => ({targetKey,sources}));
}
