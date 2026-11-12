import {registerMethodC, registeredMethodCPoint} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {findMethodCCandidates} from '../../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import {custodyDiagnostics, l1} from './proposal-ledger.js';

export const FIT_POLICIES = Object.freeze({
  TRANSLATION:'RETAINED_ORIENTATION_TRANSLATION_V1', RIGID:'NATIVE_METHOD_C_V1',
});
export function fitResolutionTrial(source, target, pairs, policy) {
  if (!pairs.length) throw Error('No checked physical pairs');
  const ordered = [...pairs].sort((a,b) => a.key.localeCompare(b.key));
  const first = ordered[0];
  if (ordered.some(p => p.sourceComponent !== first.sourceComponent || p.targetComponent !== first.targetComponent))
    throw Error('Pairs span different coordinate components; inspect them independently in A/B');
  const anchors = ordered.map(p => ({source:p.source,target:p.target,role:'checked proposal'}));
  const custody = custodyDiagnostics(ordered);
  if (policy.mode === 'RIGID') {
    if (ordered.length > 96) throw Error('Rigid trial limit: 96 pairs; use retained-orientation preview for a larger cohort');
    const transform = registerMethodC(source,target,anchors);
    if (!transform.rotation || !transform.translation) throw Error(transform.status);
    return {transform,custody,trialClass:'NATIVE_ADMISSIBLE'};
  }
  if (policy.mode !== 'TRANSLATION') throw Error('Unknown consolidation fit policy');
  const rotation = policy.rotation;
  const zero = {rotation,translation:[0,0,0]};
  const translation = [0,1,2].map(axis => ordered.reduce((sum,p) => sum +
    target.nodeIndex.get(p.target).xyz[axis] - registeredMethodCPoint(zero,source.nodeIndex.get(p.source).xyz)[axis],0) / ordered.length);
  const transform = {rotation,translation,scale:1,determinant:1,anchors,
    sourceComponent:first.sourceComponent,targetComponent:first.targetComponent,
    sourceMember:source.member,targetMember:target.member,sourceSha:source.sha256,targetSha:target.sha256,
    status:'RETAINED_ORIENTATION_TRANSLATION_DIAGNOSTIC',numericFitAcceptable:false,
    qualified:false,writerEligible:false,physicalNodeCorrespondenceQualified:false,
    leaveOneOut:{status:'NOT_APPLICABLE_DIAGNOSTIC',rows:[]}};
  const errors = pairResiduals(source,target,ordered,transform);
  transform.residuals = ordered.map((p,i) => ({source:p.source,target:p.target,
    xyz:errors[i].residual.map(v => -v),distance:Math.hypot(...errors[i].residual)}));
  transform.maxResidualMm = Math.max(...transform.residuals.map(r => r.distance));
  transform.rmsResidualMm = Math.sqrt(transform.residuals.reduce((sum,r) => sum+r.distance**2,0)/ordered.length);
  return {transform,custody,trialClass:'PREVIEW_NUMERIC'};
}
export function pairResiduals(source,target,pairs,transform) {
  return pairs.map(pair => {
    const xyz = registeredMethodCPoint(transform,source.nodeIndex.get(pair.source).xyz);
    const residual = target.nodeIndex.get(pair.target).xyz.map((value,i) => value - xyz[i]);
    if (residual.some(x => !Number.isFinite(x))) throw Error('Nonfinite trial residual');
    return {key:pair.key,groupKey:pair.groupKey,source:pair.source,target:pair.target,residual,error:l1(residual)};
  });
}
/** Native candidate search supplies validation/snapshot, never the frozen scoring cohort. */
export function resolutionCandidates(source,target,transform,pairs,tolerance) {
  const base = findMethodCCandidates(source,target,transform,tolerance), bySource = new Map(base.rows.map(r => [r.source,r]));
  const rows = pairs.map(pair => {
    const row = bySource.get(pair.source), node = target.nodeIndex.get(pair.target);
    if (!row || !node) throw Error('Checked pair is outside registered component');
    const xyz = registeredMethodCPoint(transform,source.nodeIndex.get(pair.source).xyz);
    const residual = node.xyz.map((v,i) => v-xyz[i]);
    const alt = {target:pair.target,targetMember:target.member,targetSha:target.sha256,
      residual,distance:Math.hypot(...residual),xyz:node.xyz,targetWitness:node.incident,
      od:node.od,wall:node.wall,originalElements:node.incident.map(i=>target.edges[i]?.witness)};
    return {...row,target:pair.target,xyz,residual,distance:alt.distance,alternatives:[alt],
      odDifference:row.sourceOd-node.od,wallDifference:row.sourceWall-node.wall,
      status:'Consolidated chosen pair',origins:pair.origins,explanation:'Fixed checked pair; no nearest-target substitution'};
  });
  return {...base,rows,nearSourceCount:rows.length};
}
