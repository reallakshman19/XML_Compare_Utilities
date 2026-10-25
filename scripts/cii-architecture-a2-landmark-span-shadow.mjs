/**
 * CII #102 Phase 2: non-writing original NODE landmark / span semantics.
 *
 * Physical graph segmentation is not correspondence identity. This module
 * consumes a COMPLETE separately attested node feature ledger; it does not
 * parse original CII blocks, create new targets, remove nodes, or authorize
 * Transfer/Writer. Future production integration must bind that ledger to
 * the original RESTRANT and other fixed-field auxiliary receipts.
 */
const shaRegex=/^[a-f0-9]{64}$/i;
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const freeze=v=>{
 if(Array.isArray(v))return Object.freeze(v.map(freeze));
 if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,freeze(x)])));
 return v;
};
const norm=x=>String(x??'').trim();
function finite(x){return Number.isFinite(Number(x));}
function numeric(x,name){
 const n=Number(x);
 if(!Number.isFinite(n))throw Error('CII102_SPAN_NONFINITE_'+name);
 return n;
}
function policyFor(input={}){
 const tol=numeric(input.pathSpanAbsoluteToleranceMm??100,'TOLERANCE');
 const cosine=numeric(input.minStraightness??0.995,'STRAIGHTNESS');
 if(tol<0||tol>10000||cosine<0||cosine>1)
  throw Error('CII102_SPAN_POLICY_OUT_OF_RANGE');
 return freeze({pathSpanAbsoluteToleranceMm:tol,minStraightness:cosine});
}
function featureRowsToMap(rows,nodes){
 if(!Array.isArray(rows))throw Error('CII102_NODE_FEATURE_LEDGER_REQUIRED');
 const valid=new Set(['NO_ATTACHMENTS_CONFIRMED','FEATURED','UNKNOWN']);
 const found=new Map();
 for(const item of rows){
  const id=norm(item?.nodeId);
  if(!id||found.has(id)||!nodes.has(id))throw Error('CII102_INVALID_FEATURE_NODE_OCCURRENCE:'+id);
  if(!valid.has(item?.status)||!Array.isArray(item.features))
   throw Error('CII102_NODE_FEATURE_STATUS_REQUIRED:'+id);
  const features=[...new Set(item.features.map(norm))].sort(cmp);
  if(features.some(x=>!x)
    ||(item.status==='NO_ATTACHMENTS_CONFIRMED'&&features.length)
    ||(item.status==='FEATURED'&&!features.length))
   throw Error('CII102_FEATURE_CUSTODY_CONTRADICTION:'+id);
  found.set(id,freeze({status:item.status,features}));
 }
 if(found.size!==nodes.size||[...nodes].some(id=>!found.has(id)))
  throw Error('CII102_INCOMPLETE_NODE_FEATURE_AUTHORITY');
 return found;
}
function oriented(edge,at){
 const sign=edge.from===at?1:edge.to===at?-1:0;
 if(!sign)throw Error('CII102_ORIENTATION_NOT_INCIDENT');
 return [edge.dx,edge.dy,edge.dz].map(v=>v*sign);
}
function cosine(a,b){
 const la=Math.hypot(...a),lb=Math.hypot(...b);
 return la>0&&lb>0?a.reduce((s,x,i)=>s+x*b[i],0)/(la*lb):-1;
}
function other(edge,at){return edge.from===at?edge.to:edge.to===at?edge.from:null;}
function nodeClassification(id,adjacency,features,policy){
 const edges=adjacency.get(id)||[];
 const row=features.get(id);
 const why=[];
 if(row.status==='UNKNOWN')why.push('NODE_FEATURE_AUTHORITY_UNKNOWN');
 if(row.status==='FEATURED')why.push(...row.features.map(x=>'FEATURE_'+x));
 if(edges.length!==2)why.push('NODE_DEGREE_'+edges.length);
 if(edges.some(x=>x.componentKind!=='PIPE'))why.push('INCIDENT_NON_PIPE_COMPONENT');
 if(edges.length===2){
  if(Math.abs(edges[0].diameter-edges[1].diameter)>0.00001
    ||Math.abs(edges[0].wall-edges[1].wall)>0.00001)
   why.push('INCIDENT_PROPERTY_TRANSITION');
  const a=oriented(edges[0],other(edges[0],id)),b=oriented(edges[1],id);
  if(cosine(a,b)<policy.minStraightness)why.push('NODE_BEND_OR_DIRECTION_CHANGE');
 }
 return freeze({nodeId:id,role:why.length?'LANDMARK':'PLAIN_TRANSIT',
  featureStatus:row.status,features:row.features,reasons:why});
}
export function buildCiiA2LandmarkSpanShadow({
 graph,originalSha256,nodeFeatureRows,policy={}
}={}){
 const sha=norm(originalSha256).toLowerCase();
 if(!shaRegex.test(sha))throw Error('CII102_SPAN_ORIGINAL_SHA_REQUIRED');
 if(!graph||!['SOURCE','TARGET'].includes(graph.side)
   ||!Array.isArray(graph.edges)||!(graph.adjacency instanceof Map))
  throw Error('CII102_ORIGINAL_PHYSICAL_GRAPH_REQUIRED');
 const applied=policyFor(policy);
 const edges=new Map(),adjacency=new Map(),nodes=new Set();
 for(const raw of graph.edges){
  const id=norm(raw?.elementId),from=norm(raw?.from),to=norm(raw?.to);
  if(!id||!from||!to||from===to||edges.has(id))
   throw Error('CII102_SPAN_EDGE_IDENTITY_INVALID:'+id);
  const edge={
   elementId:id,from,to,componentKind:norm(raw.componentKind||'PIPE'),
   lengthMm:numeric(raw.lengthMm,'LENGTH'),
   diameter:numeric(raw.diameter,'OD'),wall:numeric(raw.wall,'WALL'),
   dx:numeric(raw.dx,'DX'),dy:numeric(raw.dy,'DY'),dz:numeric(raw.dz,'DZ'),
  };
  if(edge.lengthMm<=0||Math.hypot(edge.dx,edge.dy,edge.dz)<=0)
   throw Error('CII102_SPAN_ZERO_OR_INVALID_ELEMENT');
  edges.set(id,edge);
  for(const node of [from,to]){
   nodes.add(node);if(!adjacency.has(node))adjacency.set(node,[]);
   adjacency.get(node).push(edge);
  }
 }
 if(!edges.size)throw Error('CII102_SPAN_EMPTY_GRAPH');
 for(const [node,actual] of adjacency){
  const supplied=graph.adjacency.get(node)||[];
  if(actual.length!==supplied.length
    ||actual.some(edge=>!supplied.some(e=>norm(e.elementId)===edge.elementId)))
   throw Error('CII102_GRAPH_ADJACENCY_CUSTODY_MISMATCH:'+node);
 }
 const features=featureRowsToMap(nodeFeatureRows,nodes);
 const classifications=new Map([...nodes].map(id=>[
  id,nodeClassification(id,adjacency,features,applied)]));
 const used=new Set(),spans=[];
 const landmarkIds=[...nodes].filter(id=>classifications.get(id).role==='LANDMARK').sort(cmp);
 for(const start of landmarkIds){
  for(const first of (adjacency.get(start)||[]).slice().sort((a,b)=>cmp(a.elementId,b.elementId))){
   if(used.has(first.elementId))continue;
   const nodePath=[start],elementIds=[],vectors=[];
   let here=start,step=first,valid=true;
   while(step){
    if(used.has(step.elementId)){valid=false;break;}
    const next=other(step,here);
    if(!next||nodePath.includes(next)){valid=false;break;}
    used.add(step.elementId);
    elementIds.push(step.elementId);
    vectors.push(oriented(step,here));
    nodePath.push(next);
    if(classifications.get(next).role==='LANDMARK')break;
    const out=(adjacency.get(next)||[]).filter(e=>e.elementId!==step.elementId);
    if(out.length!==1){valid=false;break;}
    here=next;step=out[0];
   }
   if(!valid||nodePath.length!==elementIds.length+1)continue;
   const end=nodePath.at(-1);
   if(classifications.get(end).role!=='LANDMARK')continue;
   const total=elementIds.reduce((sum,id)=>sum+edges.get(id).lengthMm,0);
   const net=vectors.reduce((sum,v)=>sum.map((x,i)=>x+v[i]),[0,0,0]);
   spans.push(freeze({
    id:sha.slice(0,12)+':'+start+':'+end+':'+elementIds.join(','),
    originalSha256:sha,side:graph.side,
    from:start,to:end,nodePath,elementIds,internalPlainNodes:nodePath.slice(1,-1),
    totalLengthMm:Number(total.toFixed(5)),netVectorMm:net,
    straightness:Number((Math.hypot(...net)/total).toFixed(7)),
    fromFeature:classifications.get(start),toFeature:classifications.get(end),
    writerReady:false,physicalIdentityCertified:false,
   }));
  }
 }
 const unvisited=[...edges.keys()].filter(x=>!used.has(x)).sort(cmp);
 return freeze({
  schema:'CiiA2LandmarkSpanShadow.v1',
  status:unvisited.length?'INCOMPLETE_OR_CYCLIC_GRAPH':'NONWRITING_LANDMARK_SPAN_EVIDENCE',
  originalSha256:sha,side:graph.side,
  policy:applied,originalNodeCount:nodes.size,originalElementCount:edges.size,
  nodes:[...classifications.values()].sort((a,b)=>cmp(a.nodeId,b.nodeId)),
  spans:spans.sort((a,b)=>cmp(a.from,b.from)||cmp(a.to,b.to)),
  unvisitedEdgeIds:unvisited,
  retainedPhysicalNodeCount:nodes.size,
  certifiedNodeCount:0,transferPlan:null,writeScope:null,writerReady:false,
 });
}
export function compareCiiA2LandmarkSpans(sourceSpan,targetSpan,policy={}){
 const applied=policyFor(policy);
 if(sourceSpan?.side!=='SOURCE'||targetSpan?.side!=='TARGET'
   ||sourceSpan?.writerReady!==false||targetSpan?.writerReady!==false
   ||!shaRegex.test(sourceSpan.originalSha256||'')
   ||!shaRegex.test(targetSpan.originalSha256||''))
  throw Error('CII102_ORIGINAL_NONWRITING_SPANS_REQUIRED');
 const delta=Math.abs(sourceSpan.totalLengthMm-targetSpan.totalLengthMm);
 const forward=sourceSpan.fromFeature.features.join('|')===targetSpan.fromFeature.features.join('|')
  &&sourceSpan.toFeature.features.join('|')===targetSpan.toFeature.features.join('|');
 const reverse=sourceSpan.fromFeature.features.join('|')===targetSpan.toFeature.features.join('|')
  &&sourceSpan.toFeature.features.join('|')===targetSpan.fromFeature.features.join('|');
 const knownEndpoints=[sourceSpan.fromFeature,sourceSpan.toFeature,targetSpan.fromFeature,targetSpan.toFeature]
  .every(x=>x.featureStatus!=='UNKNOWN');
 const reasons=[];
 if(!knownEndpoints)reasons.push('ENDPOINT_FEATURE_CUSTODY_UNKNOWN');
 if(!forward&&!reverse)reasons.push('LANDMARK_FEATURE_SEQUENCE_MISMATCH');
 if(sourceSpan.straightness<applied.minStraightness||targetSpan.straightness<applied.minStraightness)
  reasons.push('NONSTRAIGHT_SPAN_REQUIRES_TURN_SEQUENCE_QUALIFICATION');
 if(delta>applied.pathSpanAbsoluteToleranceMm+1e-8)reasons.push('LANDMARK_SPAN_LENGTH_DELTA_EXCEEDED');
 return freeze({
  schema:'CiiA2LandmarkSpanComparison.v1',
  status:reasons.length?'LOCAL_SPAN_REVIEW_OR_REJECT':'LOCAL_SPAN_GEOMETRY_SUPPORTED_NONWRITING',
  sourceSpanId:sourceSpan.id,targetSpanId:targetSpan.id,
  sourceLengthMm:sourceSpan.totalLengthMm,targetLengthMm:targetSpan.totalLengthMm,
  absoluteLengthDeltaMm:Number(delta.toFixed(5)),
  pathSpanAbsoluteToleranceMm:applied.pathSpanAbsoluteToleranceMm,
  lengthPass:delta<=applied.pathSpanAbsoluteToleranceMm+1e-8,
  orientation:forward?'FORWARD':reverse?'REVERSED':'UNRESOLVED',
  reasons,identityIndependentlyCertified:false,
  physicalGlobalUniquenessVerified:false,writerReady:false,transferPlan:null,
 });
}
