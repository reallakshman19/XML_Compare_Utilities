import { registeredMethodCPoint } from './cii-workspace-method-c-registration.js';

// True metric orthogonal projections only. ISO is labelled NON-METRIC oblique.
export const escapeMethodCXml = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const axis = {XZ:[0,2],YZ:[1,2],XY:[0,1],ISO:[0,1]};
export function projectMethodCPoint(point,projection='XZ'){
  if(!axis[projection])throw new Error('UNSUPPORTED_METHOD_C_PROJECTION');
  if(!Array.isArray(point)||point.length!==3||point.some(v=>!Number.isFinite(v)))
    throw new Error('INVALID_METHOD_C_GEOMETRY_COORDINATE');
  if(projection==='ISO')return [point[0]-point[1]*0.6,-point[2]+(point[0]+point[1])*0.3];
  const [i,j]=axis[projection];return [point[i],-point[j]];
}
const fmt=v=>String(Number(v.toFixed(4)));
function pointData(graph,allowed,coordinate){
  return graph.nodes.filter(n=>allowed.has(n.id)).map(n=>({node:n,xyz:coordinate(n.xyz)}));
}
function elementData(graph,allowed,coordinate){
  return graph.edges.filter(e=>allowed.has(e.from)&&allowed.has(e.to)).map(e=>{
    const a=graph.nodeIndex.get(e.from),b=graph.nodeIndex.get(e.to);
    if(!a||!b)throw new Error('METHOD_C_SVG_MISSING_PHYSICAL_ENDPOINT');
    return {edge:e,a:coordinate(a.xyz),b:coordinate(b.xyz)};
  });
}
function boxOf(lines,nodes,projection){
  const points=[...lines.flatMap(line=>[line.a,line.b]),...nodes.map(n=>n.xyz)].map(p=>projectMethodCPoint(p,projection));
  if(!points.length)throw new Error('METHOD_C_SVG_EMPTY_COMPONENT');
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const extent=Math.max(maxX-minX,maxY-minY,1),pad=extent*0.035+5;
  return {x:minX-pad,y:minY-pad,width:maxX-minX+2*pad,height:maxY-minY+2*pad};
}
function lineSvg(line,projection,kind,selectedElement){
  const a=projectMethodCPoint(line.a,projection),b=projectMethodCPoint(line.b,projection);
  const e=line.edge,w=escapeMethodCXml(e.witness||'NO_ORIGINAL_ELEMENT_WITNESS');
  const selected=String(selectedElement)===(kind+':'+e.index);
  return '<path data-kind="'+kind+'" data-element="'+e.index+'" tabindex="0" '+
    'class="mc-edge mc-'+kind.toLowerCase()+(selected?' mc-selected':'')+'" '+
    'd="M '+a.map(fmt).join(' ')+' L '+b.map(fmt).join(' ')+'">'+
    '<title>'+w+' | '+escapeMethodCXml(e.from)+'→'+escapeMethodCXml(e.to)+
    ' | OD '+fmt(e.od)+' mm | wall '+fmt(e.wall)+' mm</title></path>';
}
function nodeSvg(item,projection,kind,marker,status,selected,labels){
  const p=projectMethodCPoint(item.xyz,projection),n=item.node;
  const title=kind+' '+n.member+' NODE '+n.id+' | '+item.xyz.map(fmt).join(',')+
    ' mm | OD '+n.od+' | wall '+n.wall+' | '+(n.nodeName||'')+' | '+status;
  const attr='data-kind="'+kind+'" data-node="'+escapeMethodCXml(n.id)+'" tabindex="0" role="button" '+
    'aria-label="'+escapeMethodCXml(title)+'" class="mc-node mc-'+kind.toLowerCase()+
    (selected?' mc-selected':'')+'"';
  const body=kind==='SOURCE'
    ? '<circle cx="'+fmt(p[0])+'" cy="'+fmt(p[1])+'" r="'+fmt(marker)+'"/>'
    : '<rect x="'+fmt(p[0]-marker)+'" y="'+fmt(p[1]-marker)+
      '" width="'+fmt(2*marker)+'" height="'+fmt(2*marker)+'"/>';
  const label=labels?'<text class="mc-label" x="'+fmt(p[0]+marker*1.8)+'" y="'+fmt(p[1]-marker*1.8)+'">'+
    (kind==='SOURCE'?'S:':'T:')+escapeMethodCXml(n.id)+'</text>':'';
  return '<g '+attr+' data-status="'+escapeMethodCXml(status)+'">'+body+'<title>'+
    escapeMethodCXml(title)+'</title>'+label+'</g>';
}
export function methodCSvgScene({source,target,transform,candidates,projection='XZ',
  selectedSource=null,selectedElement=null,labels=false,routeSource=null,routeTarget=null,scope='component'}={}){
  if(!axis[projection])throw new Error('UNSUPPORTED_METHOD_C_PROJECTION');
  if(!source?.nodes||!target?.nodes||!transform?.anchors?.length||!candidates?.rows)
    throw new Error('METHOD_C_SVG_REQUIRES_REGISTERED_PHYSICAL_GRAPHS');
  const sourceIds=new Set(scope==='route'&&routeSource?.ids?routeSource.ids:
    source.components[transform.sourceComponent]);
  const targetIds=new Set(scope==='route'&&routeTarget?.ids?routeTarget.ids:
    target.components[transform.targetComponent]);
  const srcXYZ=p=>registeredMethodCPoint(transform,p);
  const sNodes=pointData(source,sourceIds,srcXYZ),tNodes=pointData(target,targetIds,p=>p);
  const sEdges=elementData(source,sourceIds,srcXYZ),tEdges=elementData(target,targetIds,p=>p);
  const viewBox=boxOf([...sEdges,...tEdges],[...sNodes,...tNodes],projection);
  const marker=Math.max(viewBox.width,viewBox.height)*0.0038;
  const rowById=new Map(candidates.rows.map(r=>[r.source,r]));
  const chosen=rowById.get(String(selectedSource));
  const selectedProjection=chosen?.segment && chosen.alternatives.length===0
    ? projectMethodCPoint(chosen.segment.xyz,projection):null;
  const projectionMark=selectedProjection?'<circle data-layer="segment-projection" cx="'+
    fmt(selectedProjection[0])+'" cy="'+fmt(selectedProjection[1])+'" r="'+fmt(marker*2)+
    '" fill="none" stroke="#a75f1d" stroke-width="'+fmt(marker*.7)+
    '"><title>Segment-only projection: '+escapeMethodCXml(chosen.segment.witness)+
    '; fraction '+fmt(chosen.segment.t)+'; station '+fmt(chosen.segment.stationMm)+' mm. No TARGET NODE.</title></circle>':'';
  const styles='.mc-edge{fill:none;vector-effect:non-scaling-stroke;stroke-width:2;cursor:pointer}'+
    '.mc-source{stroke:#c56f2c;stroke-dasharray:6 4}.mc-target{stroke:#2674b9}'+
    '.mc-node{cursor:pointer}.mc-node circle{fill:#ffe0b9;stroke:#ad632c}'+
    '.mc-node rect{fill:#c5e4ff;stroke:#1b5a91}'+
    '.mc-node [data-nothing]{fill:none}.mc-node[data-status="OUTSIDE_TOLERANCE"] circle{fill:#e55d5d}'+
    '.mc-node[data-status="MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT"] circle{fill:#f4c44c}'+
    '.mc-node[data-status="AMBIGUOUS"] circle{fill:#bd7bdc}'+
    '.mc-node[data-status="TARGET_COLLISION"] circle{fill:#e88a49}'+
    '.mc-selected>*:first-child{stroke:#101827;stroke-width:4}'+
    '.mc-label{fill:#101827;stroke:white;stroke-width:3;paint-order:stroke;pointer-events:none;font:12px sans-serif}'+
    '.mc-node>*:first-child{stroke-width:1.5;vector-effect:non-scaling-stroke}';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Method C original piping '+
    projection+' overlay" data-projection="'+projection+'" data-metric="'+(projection!=='ISO')+
    '" viewBox="'+[viewBox.x,viewBox.y,viewBox.width,viewBox.height].map(fmt).join(' ')+'">'+
    '<style>'+styles+'</style>'+
    '<g data-layer="target-elements">'+tEdges.map(e=>lineSvg(e,projection,'TARGET',selectedElement)).join('')+'</g>'+
    '<g data-layer="source-elements">'+sEdges.map(e=>lineSvg(e,projection,'SOURCE',selectedElement)).join('')+'</g>'+
    '<g data-layer="target-nodes">'+tNodes.map(n=>nodeSvg(n,projection,'TARGET',marker,'',
      chosen?.target===n.node.id,labels&&n.node.id===chosen?.target)).join('')+'</g>'+
    '<g data-layer="source-nodes">'+sNodes.map(n=>nodeSvg(n,projection,'SOURCE',marker,
      rowById.get(n.node.id)?.status||'UNREGISTERED',n.node.id===String(selectedSource),
      labels&&(n.node.id===String(selectedSource)||rowById.get(n.node.id)?.status!=='COORDINATE_NEAR_CANDIDATE'))).join('')+
    '</g>'+projectionMark+'</svg>';
  return {svg,viewBox,projection,metric:projection!=='ISO',
    sourceNodes:sNodes.length,targetNodes:tNodes.length,
    sourceElements:sEdges.length,targetElements:tEdges.length,selectedSource};
}
