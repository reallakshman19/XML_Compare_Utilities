/**
 * Issue #102: strictly original, joined F2 physical path witnesses.
 *
 * Evidence projection only. Joins already-enumerated A2 original witness
 * endpoints; performs no new physical candidate generation / scoring /
 * global correspondence solving. Not a certificate, review decision,
 * Transfer scope or Writer input.
 */
const compare=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const frozen=x=>Object.freeze(x);
const key=(m,n,t)=>String(m)+':'+String(n)+'=>'+String(t);
const escapeHtml=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function assertOriginal(report){
  const ledger=report?.physicalGapLedger;
  if(report?.schema!=='CiiF2CanonicalBrowserShadow.v1'
    ||report.status!=='SHADOW_ONLY_NOT_PHYSICALLY_CERTIFIED'
    ||report.writerReady!==false||report.physicalIdentityCertified!==false
    ||report.certifiedNodeCount!==0||report.certifiedElementCount!==0
    ||report.transferPlan!==null||report.writeScope!==null
    ||(report.correspondenceCertificates||[]).length!==0
    ||ledger?.schema!=='CiiF2PhysicalFactorGapLedger.v1'
    ||ledger.writerReady!==false||ledger.certifiedNodeCount!==0
    ||ledger.certifiedElementCount!==0||ledger.transferPlan!==null
    ||ledger.writeScope!==null||ledger.originalSourceSetSha256!==report.provenance.sourceSetSha256
    ||ledger.originalTargetSha256!==report.provenance.originalTargetSha256
    ||ledger.totalPhysicalSourceElements!==ledger.rows?.length
    ||report.summary?.originalPhysicalElementFactors!==ledger.rows?.length
    ||report.summary?.originalPhysicalSourceNodes!==report.rows?.length)
    throw Error('CII102_ORIGINAL_CHAIN_NONWRITING_CUSTODY_REQUIRED');
  return ledger;
}
function union(parent,a,b){
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  const ra=find(a),rb=find(b);
  if(ra!==rb)parent[rb]=ra;
}
function componentsOf(rows){
  const parent=rows.map((_,i)=>i),states=new Map();
  rows.forEach((row,i)=>{
    for(const state of row.nodeStates){
      if(states.has(state))union(parent,states.get(state),i);
      else states.set(state,i);
    }
  });
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  const grouped=new Map();
  rows.forEach((row,i)=>{const root=find(i);if(!grouped.has(root))grouped.set(root,[]);grouped.get(root).push(row);});
  return [...grouped.values()];
}

/**
 * Distinguishes "rows share a NODE claim" from a genuinely traversable
 * ordered chain. This only stitches ORIGINAL pre-frontier A2 witnesses.
 * It does not generate TARGET candidates, infer registration or certify a
 * physical identity. Search exhaustion fails closed; no first-winner shortcut.
 */
function contiguousOriginalChains(entries,policy={maxVisits:20000,maxChains:3000}){
  const byStart=new Map(),incidence=new Map();
  for(const entry of entries){
    if(entry.nodeStates.length!==2
      ||entry.targetNodePath[0]!==entry.targetEndpoints[0]
      ||entry.targetNodePath.at(-1)!==entry.targetEndpoints[1])
      throw Error('CII102_CONTIGUOUS_WITNESS_IDENTITY_INVALID');
    for(let dir=0;dir<2;dir++){
      const reverse=dir===1;
      const states=reverse?[entry.nodeStates[1],entry.nodeStates[0]]:entry.nodeStates;
      const source=reverse?[entry.sourceEndpoints[1],entry.sourceEndpoints[0]]:entry.sourceEndpoints;
      const target=reverse?[...entry.targetNodePath].reverse():entry.targetNodePath;
      const elements=reverse?[...entry.targetElementIds].reverse():entry.targetElementIds;
      const step={factorId:entry.factorId,states,source,target,elements,
        propertyWarnings:entry.propertyWarnings};
      if(!byStart.has(states[0]))byStart.set(states[0],[]);
      byStart.get(states[0]).push(step);
      if(!incidence.has(states[0]))incidence.set(states[0],new Set());
      incidence.get(states[0]).add(entry.factorId);
    }
  }
  const starts=[...incidence].filter(([,factors])=>factors.size===1).map(([state])=>state);
  if(!starts.length)starts.push(...incidence.keys());
  starts.sort(compare);
  let visits=0;
  const chains=new Map();
  function recurse(state,steps,usedFactors,usedNodes,usedEdges){
    if(++visits>policy.maxVisits)throw Error('CII102_CONTIGUOUS_CHAIN_ENUMERATION_INCOMPLETE');
    const next=[];
    for(const step of byStart.get(state)||[]){
      if(usedFactors.has(step.factorId)||usedNodes.has(step.states[1]))continue;
      if(step.elements.some(id=>usedEdges.has(id)))continue;
      if(step.target.slice(1).some(t=>usedNodes.has('TARGET:'+t)))continue;
      next.push(step);
    }
    if(next.length===0){
      if(steps.length<2)return;
      const forward=steps.map(x=>x.factorId+'@'+x.target.join('>')).join('|');
      const reverse=steps.slice().reverse().map(x=>x.factorId+'@'+[...x.target].reverse().join('>')).join('|');
      const id=forward<reverse?forward:reverse;
      if(!chains.has(id)){
        if(chains.size>=policy.maxChains)
          throw Error('CII102_CONTIGUOUS_CHAIN_RESULT_BOUND_EXCEEDED');
        chains.set(id,frozen({
          sourceMember:entries[0].member,
          factorIds:frozen(steps.map(x=>x.factorId)),
          sourceNodePath:frozen([steps[0].source[0],...steps.map(x=>x.source[1])]),
          targetNodePath:frozen([steps[0].target[0],...steps.flatMap(x=>x.target.slice(1))]),
          targetElementIds:frozen(steps.flatMap(x=>x.elements)),
          factorCount:steps.length,
          provenance:'JOINED_ORIGINAL_F2_LOCAL_A2_WITNESSES_ONLY',
          globallyUnique:false,independentlyCertified:false,writerEligible:false,
        }));
      }
      return;
    }
    for(const step of next){
      if(step.states[0]!==state)throw Error('CII102_CONTIGUOUS_SOURCE_TARGET_STATE_DRIFT');
      // Any source/target NODE already touched in the current route invalidates
      // a new segment; a subdivision intermediate is not a SOURCE NODE claim.
      const newNodes=new Set(usedNodes);
      newNodes.add(step.states[1]);
      for(const t of step.target.slice(1))newNodes.add('TARGET:'+t);
      const newEdges=new Set(usedEdges);
      for(const id of step.elements)newEdges.add(id);
      recurse(step.states[1],[...steps,step],
        new Set([...usedFactors,step.factorId]),newNodes,newEdges);
    }
  }
  for(const start of starts){
    // Starting TARGET node also must be reserved for collision-checking.
    const startTarget=start.split('=>')[1];
    recurse(start,[],new Set(),new Set([start,'TARGET:'+startTarget]),new Set());
  }
  return frozen({
    routes:frozen([...chains.values()].sort((a,b)=>b.factorCount-a.factorCount
      ||compare(a.sourceMember,b.sourceMember)
      ||compare(a.sourceNodePath.join('>'),b.sourceNodePath.join('>')))),
    visits,completeWithinOriginalWitnessDomain:true,
    globalSearchComplete:false,independentlyCertified:false,
  });
}

export function buildCiiF2OriginalChainReview(report){
  const ledger=assertOriginal(report);
  const seenFactors=new Set(),originalEvidence=[],factorOptions=new Map();
  const sourceTargets=new Map(),targetOwners=new Map();
  const counts={};
  for(const factor of ledger.rows){
    const factorId=String(factor.sourceElementKey);
    const member=String(factor.sourceMember);
    const endpoints=(factor.sourceEndpoints||[]).map(String);
    if(!member||!factorId||seenFactors.has(factorId)||endpoints.length!==2
      ||endpoints[0]===endpoints[1]
      ||factor.endpointDiagnosis?.length!==2
      ||factor.endpointDiagnosis.some((e,i)=>e.sourceNodeKey!==member+':'+endpoints[i])
      ||!Array.isArray(factor.originalTargetPhysicalPathWitnesses)
      ||factor.originalTargetPhysicalPathWitnesses.length!==factor.originalPathWitnesses
      ||factor.writerReady!==false||factor.physicalIdentityCertified!==false)
      throw Error('CII102_ORIGINAL_CHAIN_FACTOR_OR_PROVENANCE_INVALID:'+factorId);
    seenFactors.add(factorId);
    counts[member]=(counts[member]||0)+1;
    factorOptions.set(factorId,factor.originalTargetPhysicalPathWitnesses.length);
    for(const [j,w] of factor.originalTargetPhysicalPathWitnesses.entries()){
      const path=(w.targetNodePath||[]).map(String);
      const ids=(w.targetElementIds||[]).map(String);
      const targets=(w.targetEndpoints||[]).map(String);
      if(!path.length||path.length!==ids.length+1||!ids.length
        ||path[0]!==targets[0]||path.at(-1)!==targets[1]
        ||targets.length!==2||targets[0]===targets[1]
        ||!factor.endpointDiagnosis[0].originalTargets.includes(targets[0])
        ||!factor.endpointDiagnosis[1].originalTargets.includes(targets[1])
        ||new Set(path).size!==path.length
        ||new Set(ids).size!==ids.length)
        throw Error('CII102_ORIGINAL_CHAIN_INVALID_SOURCE_BOUND_WITNESS:'+factorId+':'+j);
      const nodeStates=[key(member,endpoints[0],targets[0]),
        key(member,endpoints[1],targets[1])];
      for(let side=0;side<2;side++){
        const src=member+':'+endpoints[side],dst=targets[side];
        if(!sourceTargets.has(src))sourceTargets.set(src,new Set());
        sourceTargets.get(src).add(dst);
        if(!targetOwners.has(dst))targetOwners.set(dst,new Set());
        targetOwners.get(dst).add(src);
      }
      originalEvidence.push(frozen({
        factorId,member,sourceEndpoints:frozen(endpoints),
        targetEndpoints:frozen(targets),targetNodePath:frozen(path),
        targetElementIds:frozen(ids),nodeStates:frozen(nodeStates),
        relation:w.relation||'UNSPECIFIED',propertyWarnings:frozen([...(w.propertyWarnings||[])]),
      }));
    }
  }
  const groups=componentsOf(originalEvidence).map(entries=>{
    const members=[...new Set(entries.map(x=>x.member))];
    if(members.length!==1)throw Error('CII102_CROSS_MEMBER_COMPONENT_MIX');
    const member=members[0];
    const factors=[...new Set(entries.map(x=>x.factorId))].sort(compare);
    const sourceNodes=[...new Set(entries.flatMap(x=>x.sourceEndpoints))].sort(compare);
    const targetNodes=[...new Set(entries.flatMap(x=>x.targetNodePath))].sort(compare);
    const competingOriginalTargets=sourceNodes.flatMap(n=>{
      const values=[...(sourceTargets.get(member+':'+n)||[])].sort(compare);
      return values.length>1?[{sourceNode:n,targets:values}]:[];
    });
    const sharedTargetClaims=targetNodes.flatMap(t=>{
      const owners=[...(targetOwners.get(t)||[])].sort(compare);
      return owners.length>1?[{targetNode:t,sourceClaims:owners}]:[];
    });
    const multipleFactorWitnesses=factors.filter(f=>(factorOptions.get(f)||0)>1);
    const warnings=[...new Set(entries.flatMap(x=>x.propertyWarnings))].sort(compare);
    const continuity=contiguousOriginalChains(entries);
    return frozen({
      member,sourceElementFactors:frozen(factors),
      sourceNodeIds:frozen(sourceNodes),targetNodeIds:frozen(targetNodes),
      witnessCount:entries.length,joinedFactorCount:factors.length,
      multipleFactorWitnesses:frozen(multipleFactorWitnesses),
      competingOriginalTargets:frozen(competingOriginalTargets),
      sharedTargetClaims:frozen(sharedTargetClaims),
      propertyWarnings:frozen(warnings),
      contiguousOriginalChains:continuity.routes,
      longestTraversableOriginalFactors:continuity.routes[0]?.factorCount||0,
      originalWitnessChainSearchComplete:continuity.completeWithinOriginalWitnessDomain,
      readOnlyStatus:'JOINED_LOCAL_ORIGINAL_WITNESSES_NOT_CERTIFIED',
      witnesses:frozen([...entries].sort((a,b)=>compare(a.factorId,b.factorId)
        ||compare(a.targetNodePath.join('>'),b.targetNodePath.join('>')))),
      identityIndependentlyCertified:false,reviewedCorrespondence:false,writerEligible:false,
    });
  }).sort((a,b)=>b.joinedFactorCount-a.joinedFactorCount||compare(a.member,b.member)
    ||compare(a.sourceElementFactors[0],b.sourceElementFactors[0]));
  const coveredFactors=new Set(originalEvidence.map(x=>x.factorId));
  const unobserved=ledger.rows.filter(row=>!coveredFactors.has(String(row.sourceElementKey)))
    .map(x=>String(x.sourceElementKey)).sort(compare);
  const byMember=Object.keys(counts).sort(compare).map(member=>frozen({
    member,originalElementFactors:counts[member],
    factorsWithOriginalWitnesses:ledger.rows.filter(x=>
      x.sourceMember===member&&coveredFactors.has(String(x.sourceElementKey))).length,
    joinedGroups:groups.filter(x=>x.member===member).length,
  }));
  return frozen({
    schema:'CiiF2OriginalChainReview.v1',
    status:'READ_ONLY_ORIGINAL_PATH_CONTINUITY_NOT_CERTIFICATION',
    originalSourceSetSha256:ledger.originalSourceSetSha256,
    originalTargetSha256:ledger.originalTargetSha256,
    originalElementFactors:ledger.rows.length,
    originalPhysicalSourceNodes:report.rows.length,
    factorWitnesses:originalEvidence.length,
    factorsWithWitnesses:coveredFactors.size,
    factorsWithoutWitnesses:unobserved.length,
    missingFactorIds:frozen(unobserved),
    groups:frozen(groups),byMember:frozen(byMember),
    longestTraversableOriginalChainFactors:Math.max(0,...groups.map(x=>x.longestTraversableOriginalFactors)),
    traversableOriginalChainCount:groups.reduce((n,x)=>n+x.contiguousOriginalChains.length,0),
    candidateGenerationPerformed:false,
    searchCompletenessAsserted:false,
    globalUniquenessAsserted:false,
    approvedIdentityCount:0,certifiedNodeCount:0,
    transferPlan:null,writeScope:null,writerReady:false,
  });
}
export function ciiF2OriginalChainReviewMarkup(review){
  if(!review)return'';
  if(review.schema!=='CiiF2OriginalChainReview.v1'
    ||review.status!=='READ_ONLY_ORIGINAL_PATH_CONTINUITY_NOT_CERTIFICATION'
    ||review.writerReady!==false||review.certifiedNodeCount!==0
    ||review.transferPlan!==null||review.writeScope!==null
    ||review.approvedIdentityCount!==0)
    throw Error('CII102_CHAIN_MARKUP_NOT_NONWRITING');
  const per=review.byMember.map(s=>escapeHtml(s.member)+': '+s.factorsWithOriginalWitnesses
    +'/'+s.originalElementFactors+' original physical ELEMENT factors with path evidence').join(' · ');
  const items=review.groups.map((group,index)=>{
    const ordered=group.contiguousOriginalChains.slice(0,10).map(route=>
      '<small>Traversable original chain: SOURCE '+escapeHtml(route.sourceNodePath.join('→'))
      +' → TARGET '+escapeHtml(route.targetNodePath.join('→'))
      +' · '+route.factorCount+' physical SOURCE factors · NOT CERTIFIED</small>').join('');
    const details=group.witnesses.map(w=>'<small>'+escapeHtml(w.factorId)+' · SOURCE '
      +escapeHtml(w.sourceEndpoints.join('→'))+' → TARGET '
      +escapeHtml(w.targetNodePath.join('→'))+' ['+escapeHtml(w.relation)+']'
      +(w.propertyWarnings.length?' · revision flags: '+escapeHtml(w.propertyWarnings.join(',')):'')
      +'</small>').join('');
    return '<details data-ciiw-f2-chain-group="1"><summary>'
      +escapeHtml(group.member)+' group '+(index+1)+' · '
      +group.joinedFactorCount+' contiguous-evidence factors / '+group.witnessCount
      +' original local route witnesses'
      +(group.competingOriginalTargets.length?' · competing SOURCE targets':'')
      +(group.sharedTargetClaims.length?' · shared TARGET claims':'')
      +'</summary><p><b>Not certified.</b> Joined local original witnesses only; no global assignment or engineering revision approval.</p>'
      +(group.multipleFactorWitnesses.length?'<p>Multiple routes on: '+escapeHtml(group.multipleFactorWitnesses.join(', '))+'</p>':'')
      +(group.competingOriginalTargets.length?'<p>Alternative NODE claims: '
        +escapeHtml(group.competingOriginalTargets.map(x=>x.sourceNode+'=['+x.targets.join(',')+']').join('; '))+'</p>':'')
      +(group.sharedTargetClaims.length?'<p>Shared TARGET claims: '
        +escapeHtml(group.sharedTargetClaims.map(x=>x.targetNode+'=['+x.sourceClaims.join(',')+']').join('; '))+'</p>':'')
      +'<p>Longest ordered, non-reusing original route: '+group.longestTraversableOriginalFactors
      +' factors. '+group.contiguousOriginalChains.length+' enumerated maximal route(s). '
      +'Original witness domain only; global TARGET search/uniqueness NOT proved.</p>'
      +'<div class="ciiw-chain-witnesses">'+ordered+details+'</div></details>';
  }).join('');
  return '<section data-ciiw-f2-original-chain-review="1" class="ciiw-method-evidence">'
    +'<h3>Original F2 contiguous physical evidence — review only</h3>'
    +'<p><b>'+review.factorsWithWitnesses+'/'+review.originalElementFactors+'</b> original SOURCE ELEMENT factors have pre-frontier path witnesses; '
    +review.factorWitnesses+' local paths linked into '+review.groups.length+' evidence groups; '
    +review.factorsWithoutWitnesses+' factors lack original path evidence. '+per+'.</p>'
    +'<p><b>0 physically certified identities; 0 extra Transfer/Writer operations.</b> '
    +'These linked physical witnesses are not complete candidate enumeration, '
    +'a globally unique assignment, or the Owner Phase 2 golden benchmark.</p>'
    +'<details><summary>Inspect original physical chain groups and conflicting alternatives ('
    +review.groups.length+')</summary>'+items+'</details></section>';
}
