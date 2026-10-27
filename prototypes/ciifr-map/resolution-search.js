import {fitResolutionTrial, pairResiduals} from './resolution-fit.js';

const EPSILON = 1e-6;
function indexed(input) {
  if (input.codec) return input;
  let weight=1n;
  const weights=[],indices=[];
  for (const group of input.union.groups) {
    weights.push(weight);indices.push(new Map(group.options.map((o,i)=>[o.key,i])));
    weight*=BigInt(group.options.length);
  }
  return {...input,codec:{weights,indices}};
}
const optionVector=(input,choices)=>choices.map((key,i)=>input.codec.indices[i].get(key));
const choiceKey=(input,choices)=>String(optionVector(input,choices).reduce((sum,index,i)=>
  sum+BigInt(index)*input.codec.weights[i],0n));
function* combinations(groups,pins) {
  const options=groups.map(g=>g.options.filter(o=>!pins[g.key]||pins[g.key]===o.key));
  if (options.some(o=>!o.length)) return;
  const indices=groups.map(()=>0);
  while (true) {
    yield options.map((list,i)=>list[indices[i]].key);
    let at=indices.length-1;
    while (at>=0 && ++indices[at]===options[at].length) {indices[at]=0;at--;}
    if (at<0) return;
  }
}
export function trialPairs(union, choices) {
  return [...union.unique, ...union.groups.map((g,i) => g.options.find(o => o.key === choices[i]))];
}
export function evaluateResolution(input, choices) {
  input=indexed(input);
  const {source,target,union,policy} = input, pairs = trialPairs(union,choices);
  try {
    if (pairs.some(p => !p)) throw Error('A selected candidate no longer exists');
    const fit = fitResolutionTrial(source,target,pairs,policy);
    const residuals = pairResiduals(source,target,pairs,fit.transform);
    const total = residuals.reduce((sum,r) => sum+r.error,0);
    const errors = new Map(residuals.map(r => [r.groupKey,r.error]));
    return {choices, key:choiceKey(input,choices), valid:true, total,
      scores:union.groups.map(g => Math.max(0,total-(errors.get(g.key)||0))),
      custody:fit.custody,trialClass:fit.trialClass};
  } catch (error) { return {choices,key:choiceKey(input,choices),valid:false,reason:error.message}; }
}
function neighbor(input,cache,trial,index,option) {
  const difference=BigInt(input.codec.indices[index].get(option.key))-
    BigInt(input.codec.indices[index].get(trial.choices[index]));
  return cache.get(String(BigInt(trial.key)+difference*input.codec.weights[index]));
}
function sliceFor(groupIndex, trial, input, cache) {
  const group = input.union.groups[groupIndex];
  const options = group.options.map(option => {
    return {pairKey:option.key,trial:neighbor(input,cache,trial,groupIndex,option)};
  });
  const valid = options.filter(o => o.trial?.valid);
  const minimum = valid.length ? Math.min(...valid.map(o => o.trial.scores[groupIndex])) : null;
  const complete = options.every(o => o.trial !== undefined);
  const minima = valid.filter(o => o.trial.scores[groupIndex] <= minimum+EPSILON);
  return {groupKey:group.key,source:group.source,complete,minimum,
    recommendedPairKey:minima.map(o => o.pairKey).sort()[0] || null,
    equalMinima:minima.map(o => o.pairKey),
    support:!valid.length?'NO_FEASIBLE_CONTEXT':!complete?'PROVISIONAL':valid.length===1?
      'NO_COMPARABLE_ALTERNATIVE':input.union.unique.length+input.union.groups.length<=1?
        'ZERO_WITNESSES':'COMPARABLE',
    options:options.map(o => ({pairKey:o.pairKey,evaluated:Boolean(o.trial),
      valid:o.trial?.valid,reason:o.trial?.reason,score:o.trial?.valid?o.trial.scores[groupIndex]:null,
      custody:o.trial?.custody || []})),
    witnessCount:input.union.unique.length+input.union.groups.length-1,
    regret:minimum===null?null:Math.max(0,trial.scores[groupIndex]-minimum),
    regretBoundKind:complete?'EXACT':'LOWER_BOUND'};
}
function chooseCoherent(input, cache) {
  let pool = [...cache.values()].filter(t => t.valid && input.union.groups.every((g,i) =>
    !input.pins[g.key] || t.choices[i] === input.pins[g.key]));
  const consistent = pool.filter(t => !t.custody.length);
  if (consistent.length) pool = consistent;
  const rated = pool.map(trial => {
    let maxRegret=0,sumRegret=0;
    for (let i=0;i<input.union.groups.length;i++) {
      const group=input.union.groups[i];if (input.pins[group.key]) continue;
      let minimum=trial.scores[i];
      for (const option of group.options) {
        const other=neighbor(input,cache,trial,i,option);
        if (other?.valid) minimum=Math.min(minimum,other.scores[i]);
      }
      const regret=Math.max(0,trial.scores[i]-minimum);
      maxRegret=Math.max(maxRegret,regret);sumRegret+=regret;
    }
    const changes = trial.choices.filter((c,i) => input.previous?.[i] && c !== input.previous[i]).length;
    return {trial,order:JSON.stringify(optionVector(input,trial.choices)),rank:[maxRegret,sumRegret,trial.total,changes]};
  });
  let survivors = rated;
  for (let stage=0;stage<4 && survivors.length>1;stage++) {
    const minimum = Math.min(...survivors.map(r => r.rank[stage]));
    survivors = survivors.filter(r => r.rank[stage] <= minimum + (stage===3?0:EPSILON));
  }
  const winner=survivors.sort((a,b) => a.order.localeCompare(b.order))[0];
  return winner?{...winner,slices:input.union.groups.map((g,i)=>sliceFor(i,winner.trial,input,cache))}:null;
}
/** Budgeted enumeration: never labels unvisited cases or incomplete slices exact. */
export async function searchResolution(input, {onProgress = () => {}, yieldControl = async () => {},
  maxCases = 4096, timeBudgetMs = 4000, now = () => performance.now()} = {}) {
  const {union,pins = {}} = input; input = indexed({...input,pins});
  let total = 1n;
  for (const group of union.groups) total *= BigInt(pins[group.key]?1:group.options.length);
  const pairCount = union.unique.length+union.groups.length;
  const budget = Math.max(1,Math.min(maxCases,Math.floor(2000000/Math.max(1,pairCount))));
  const cache = new Map(), started = now(); let enumerated = 0;
  for (const choices of combinations(union.groups,pins)) {
    const trial = evaluateResolution(input,choices); cache.set(trial.key,trial); enumerated++;
    if (enumerated%16===0) { onProgress({evaluated:enumerated,total:String(total)}); await yieldControl(); }
    if (enumerated>=budget || now()-started>timeBudgetMs) break;
  }
  let best = chooseCoherent(input,cache);
  // Complete the inspected winner's conditional slices when budget permits, including pinned counterfactuals.
  if (best) for (let i=0;i<union.groups.length;i++) for (const option of union.groups[i].options) {
    const choices = [...best.trial.choices]; choices[i] = option.key;
    const key = choiceKey(input,choices);
    if (!cache.has(key) && cache.size<budget && now()-started<=timeBudgetMs)
      cache.set(key,evaluateResolution(input,choices));
  }
  best = chooseCoherent(input,cache);
  const exact = BigInt(enumerated) === total;
  const completeSlices = best?.slices.every(s => s.complete) ?? false;
  const count = [...cache.values()].filter(t => t.valid).length;
  return {schema:'CIIFR.MultibaseResolution.v1',snapshotId:input.snapshotId,
    policy:input.policy,epsilonMm:EPSILON,coherentPolicy:'MIN_MAX_REGRET_THEN_SUM_THEN_TOTAL_V1',
    totalAssignments:String(total),enumerated,diagnosticEvaluations:cache.size,validTrials:count,
    exact,completeSlices,chosen:best?.trial || null,recommendations:best?.slices || [],
    status:!best?'NO_FEASIBLE_CONTEXT':!exact||!completeSlices?'BEST_FOUND_PARTIAL':
      Object.keys(pins).length===union.groups.length&&union.groups.length?'MANUALLY_PINNED':
        best.rank[0]>EPSILON?'COUPLED_COMPROMISE':'WITHIN_TOLERANCE_MINIMA',
    trialChoiceEncoding:'GROUP_OPTION_INDICES',
    rejected:[...cache.values()].filter(t => !t.valid).map(t => ({choices:optionVector(input,t.choices),reason:t.reason})),
    trials:[...cache.values()].map(t=>({...t,choices:optionVector(input,t.choices)})),writerEligible:false,physicalIdentityQualified:false};
}
