/**
 * Issue #106 / W3: comparison-only projection of demonstrably plain PIPE splits.
 * Never replaces the original topology graph, Method B run topology, the NODE
 * census, or any Writer2 element/pointer identity.
 *
 * Positive eligibility requires an externally audited, node-level
 * attachment inventory. Unknown auxiliary/hanger/component custody is a veto.
 */
const frozen = Object.freeze;
const text = x => String(x ?? '');
const r = x => Number(x);
const compare = (a,b) => text(a).localeCompare(text(b),undefined,{numeric:true});
const PROCESS_FIELDS = Object.freeze([
  'insulationThickness','corrosionAllowance','insulationDensity','fluidDensity','hydroPressure',
  ...Array.from({length:9},(_,i)=>'P'+(i+1)), ...Array.from({length:9},(_,i)=>'T'+(i+1)),
]);
function attachmentAt(index,node) {
  return index instanceof Map ? index.get(node) : index?.[node];
}
function other(edge,node) {
  return text(edge.from)===node ? text(edge.to) : text(edge.from);
}
function vecAway(edge,node) {
  const sign = text(edge.from)===node ? 1 : -1;
  return [r(edge.dx)*sign,r(edge.dy)*sign,r(edge.dz)*sign];
}
function magnitude(a) { return Math.hypot(...a); }
function dot(a,b) { return a.reduce((s,v,i)=>s+v*b[i],0); }
function numericSame(a,b,epsilon=1e-6) {
  return Number.isFinite(r(a)) && Number.isFinite(r(b)) && Math.abs(r(a)-r(b)) <= epsilon;
}
function matchingProperties(a,b) {
  return r(a.diameter)>0 && r(b.diameter)>0 && r(a.wall)>0 && r(b.wall)>0
    && numericSame(a.diameter,b.diameter) && numericSame(a.wall,b.wall)
    && PROCESS_FIELDS.every(k=>numericSame(a[k]??0,b[k]??0));
}
function credibleLength(edge) {
  const vector=magnitude([r(edge.dx),r(edge.dy),r(edge.dz)]);
  const length=r(edge.lengthMm);
  return Number.isFinite(length) && length>0 && Number.isFinite(vector)
    && vector>0 && Math.abs(vector-length)<=Math.max(0.001,length*0.001);
}
function isStraight(a,b,node,angleDegrees) {
  if(!credibleLength(a)||!credibleLength(b)) return false;
  const u=vecAway(a,node),v=vecAway(b,node),lu=magnitude(u),lv=magnitude(v);
  return dot(u,v)/(lu*lv)<=-Math.cos(angleDegrees*Math.PI/180);
}
function ownAdjacency(graph) {
  const out=new Map(), seen=new Set();
  for(let i=0;i<(graph?.edges||[]).length;i++){
    const edge=graph.edges[i], key=text(edge.elementId);
    if(!key || seen.has(key)) throw new Error('CII_PHASE2_RAW_ELEMENT_ID_INVALID');
    seen.add(key);
    for(const node of [text(edge.from),text(edge.to)]){
      if(!node) throw new Error('CII_PHASE2_RAW_NODE_ID_MISSING');
      if(!out.has(node)) out.set(node,[]);
      out.get(node).push(edge);
    }
  }
  return out;
}
export function classifyCiiComparisonPassThroughNode(graph,nodeId,options={}) {
  const node=text(nodeId);
  const incident=(options.adjacency || ownAdjacency(graph)).get(node) || [];
  const reasons=[];
  if(incident.length!==2 || incident[0]===incident[1]) reasons.push('NOT_PLAIN_DEGREE_TWO');
  const attached=attachmentAt(options.attachmentEvidenceByNode,node);
  if(!attached || attached.state!=='VERIFIED_EMPTY' || attached.complete!==true) reasons.push('ATTACHMENT_CUSTODY_NOT_VERIFIED_EMPTY');
  if((options.protectedNodeIds||[]).includes(node)) reasons.push('PROTECTED_EXPLICIT_ANCHOR');
  if(incident.length===2 && incident[0]!==incident[1]){
    if(incident.some(e=>e.componentKind!=='PIPE')) reasons.push('NON_PIPE_COMPONENT');
    // isAnchorElement is edge-wide (it can mean a terminal at the OTHER
    // end). It is not proof that this particular interior node is functional.
    if(incident.some(e=>(e.packetEvidence||[]).some(x=>x && x!=='PIPE')))
      reasons.push('RAW_ENGINEERING_ANCHOR');
    if(!matchingProperties(incident[0],incident[1])) reasons.push('ENGINEERING_PROPERTY_TRANSITION');
    if(!isStraight(incident[0],incident[1],node,options.collinearToleranceDegrees??0.5))
      reasons.push('NON_COLLINEAR_OR_UNTRUSTWORTHY_GEOMETRY');
  }
  return frozen({nodeId:node,eligible:reasons.length===0,reasons:frozen([...new Set(reasons)])});
}
function orientedVector(edge,start) {
  const sign=text(edge.from)===start?1:-1;
  return [r(edge.dx)*sign,r(edge.dy)*sign,r(edge.dz)*sign];
}
function comparePath(edges,nodes,reason=null) {
  let distance=0;
  const displacement=[0,0,0];
  for(let i=0;i<edges.length;i++){
    distance+=r(edges[i].lengthMm);
    const v=orientedVector(edges[i],nodes[i]);
    for(let j=0;j<3;j++) displacement[j]+=v[j];
  }
  return frozen({
    startNodeId:nodes[0],endNodeId:nodes.at(-1),
    originalNodeIds:frozen([...nodes]),originalElementIds:frozen(edges.map(e=>text(e.elementId))),
    interiorPassThroughNodeIds:frozen(nodes.slice(1,-1)),
    totalLengthMm:distance, displacementMm:frozen(displacement),
    status:reason || 'READ_ONLY_COMPARISON_PATH',
    mutationAuthorized:false, methodBQualifiedByThisPath:false,
  });
}
export function buildCiiComparisonPathProjection(graph,options={}) {
  const adjacency=ownAdjacency(graph), classifications=new Map(), visited=new Set(), paths=[];
  const opts={...options,adjacency};
  for(const node of [...adjacency.keys()].sort(compare))
    classifications.set(node,classifyCiiComparisonPassThroughNode(graph,node,opts));
  // Edges are traversed from meaningful raw nodes only. Unanchored cycles
  // never collapse; every original edge remains traceable.
  for(const start of [...adjacency.keys()].sort(compare)){
    if(classifications.get(start).eligible) continue;
    for(const first of adjacency.get(start)){
      if(visited.has(first.elementId)) continue;
      const edges=[],nodes=[start];let node=start,edge=first;
      const local=new Set();
      while(edge&&!visited.has(edge.elementId)){
        if(local.has(edge.elementId)) break;
        local.add(edge.elementId);visited.add(edge.elementId);
        edges.push(edge);
        const next=other(edge,node);nodes.push(next);
        if(!classifications.get(next)?.eligible) break;
        const remaining=(adjacency.get(next)||[]).filter(e=>!visited.has(e.elementId));
        if(remaining.length!==1) break;
        node=next;edge=remaining[0];
      }
      if(edges.length){
        if(nodes[0]===nodes.at(-1)) {
          // A closed route has no unique path endpoints. Keep original edges.
          for(const original of edges)
            paths.push(comparePath([original],[text(original.from),text(original.to)],'CYCLIC_ROUTE_NOT_COLLAPSED'));
        } else paths.push(comparePath(edges,nodes));
      }
    }
  }
  for(const edge of graph?.edges||[])if(!visited.has(edge.elementId)){
    visited.add(edge.elementId);
    paths.push(comparePath([edge],[text(edge.from),text(edge.to)],'UNANCHORED_OR_AMBIGUOUS_RAW_EDGE'));
  }
  const rawElementCount=(graph?.edges||[]).length;
  if(paths.reduce((s,p)=>s+p.originalElementIds.length,0)!==rawElementCount)
    throw new Error('CII_PHASE2_NORMALIZATION_RAW_ELEMENT_CENSUS_MISMATCH');
  return frozen({
    schema:'CiiComparisonPathProjection.v1',status:'READ_ONLY_NOT_METHOD_A_OR_B_CERTIFICATION',
    paths:frozen(paths),
    classifications:frozen([...classifications.values()]),
    rawNodeCount:adjacency.size,rawElementCount,
    comparisonPathCount:paths.length,
    mutationAuthorized:false,writerAuthorized:false,methodBAxesInferred:0,
  });
}
