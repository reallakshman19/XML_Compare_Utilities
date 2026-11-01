/**
 * CAESAR InputXML delta graph, S3 r1. READ_ONLY; source-key and gap-safe.
 * This module is used ONLY by the additive strict InputXML reader.
 *
 * The existing Workspace converter maps PSI116 (X,Y,Z) into CAESAR
 * (X,Z,-Y). Our hub frame is PSI116_XYZ_MM, so the inverse is (X,-Z,Y).
 * A run without a literal absolute anchor is LOCAL, never globally located.
 */
export const INPUTXML_HUB_FRAME='PSI116_XYZ_MM';
export const INPUTXML_SOURCE_FRAME='CAESAR_INPUTXML_XYZ_MM';
export const INPUTXML_DELTA_TOLERANCE=0.001;
const sentinel=-1.0101;
const finite=(value,path)=>{
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value)))throw Error('INPUT_XML_INVALID_NUMBER:'+path);
  const n=Number(value);
  if(!Number.isFinite(n))throw Error('INPUT_XML_NONFINITE_NUMBER:'+path);
  return n;
};
const toHub=({x,y,z})=>({x,y:-z,z:y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const neg=a=>({x:-a.x,y:-a.y,z:-a.z});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const same=(a,b)=>dist(a,b)<=INPUTXML_DELTA_TOLERANCE;
function value(attrs,key){
  const actual=Object.keys(attrs).find(x=>x.toUpperCase()===key);
  return actual===undefined?'':String(attrs[actual]).trim();
}
function point(attrs,base,i){
  const cols=['X','Y','Z'].map(axis=>base+'_'+axis);
  const found=cols.filter(x=>value(attrs,x)!=='');
  if(!found.length)return null;
  if(found.length!==3)throw Error('INPUT_XML_INCOMPLETE_ABSOLUTE_ANCHOR:E'+i+':'+base);
  return toHub({x:finite(value(attrs,cols[0]),'E'+i+':'+cols[0]),
    y:finite(value(attrs,cols[1]),'E'+i+':'+cols[1]),
    z:finite(value(attrs,cols[2]),'E'+i+':'+cols[2])});
}
function delta(attrs,i){
  const dims=['X','Y','Z'].map(axis=>{
    const key='DELTA_'+axis,raw=value(attrs,key);
    if(!raw)throw Error('INPUT_XML_DELTA_REQUIRED:E'+i+':'+key);
    const n=finite(raw,'E'+i+':'+key);
    // CAESAR 14 writes -1.010100 for an unset/zero component.
    return Math.abs(n-sentinel)<0.00001?0:n;
  });
  return toHub({x:dims[0],y:dims[1],z:dims[2]});
}
export function solveCaesarInputXmlRuns(rows){
  const edges=rows.map(({index,attrs,fromNode,toNode,recordKey})=>({
    index,attrs,fromNode,toNode,recordKey,
    delta:delta(attrs,index),
    explicitFrom:point(attrs,'FROM',index),
    explicitTo:point(attrs,'TO',index),
  }));
  const parent=new Map();
  const find=id=>{
    if(!parent.has(id))parent.set(id,id);
    const p=parent.get(id);
    if(p===id)return id;
    const root=find(p);
    parent.set(id,root);
    return root;
  };
  for(const edge of edges){
    const a=find(edge.fromNode),b=find(edge.toNode);
    if(a!==b)parent.set(b,a);
  }
  const groups=new Map();
  for(const edge of edges){
    const root=find(edge.fromNode);
    if(!groups.has(root))groups.set(root,[]);
    groups.get(root).push(edge);
  }
  const assignments=new Map(),runs=[];
  for(const group of groups.values()){
    const id='RUN-'+String(runs.length).padStart(4,'0');
    const adj=new Map(),anchors=new Map();
    const connect=(from,to,v,index)=>{
      if(!adj.has(from))adj.set(from,[]);
      adj.get(from).push({to,delta:v,index});
    };
    for(const e of group){
      connect(e.fromNode,e.toNode,e.delta,e.index);
      connect(e.toNode,e.fromNode,neg(e.delta),e.index);
      for(const [node,p] of [[e.fromNode,e.explicitFrom],[e.toNode,e.explicitTo]]){
        if(!p)continue;
        if(anchors.has(node)&&!same(anchors.get(node),p))
          throw Error('INPUT_XML_REUSED_NODE_ABSOLUTE_CONFLICT:E'+e.index+':'+node);
        anchors.set(node,p);
      }
    }
    const anchored=anchors.size>0;
    const startNode=anchored?anchors.keys().next().value:group[0].fromNode;
    const positions=new Map([[startNode,anchored?anchors.get(startNode):{x:0,y:0,z:0}]]);
    const queue=[startNode];
    while(queue.length){
      const from=queue.shift();
      for(const next of adj.get(from)||[]){
        const expected=add(positions.get(from),next.delta);
        const known=positions.get(next.to);
        if(known){
          if(!same(known,expected))
            throw Error('INPUT_XML_DELTA_PATH_CONFLICT:E'+next.index+':'+from+'->'+next.to);
        }else{
          positions.set(next.to,expected);queue.push(next.to);
        }
      }
    }
    if(positions.size!==adj.size)throw Error('INPUT_XML_CONNECTED_RUN_NOT_SOLVED:'+id);
    for(const [node,p]of anchors){
      if(!same(positions.get(node),p))throw Error('INPUT_XML_ANCHOR_DELTA_CONFLICT:'+id+':'+node);
    }
    for(const e of group)assignments.set(e.index,{
      runId:id,anchored,from:positions.get(e.fromNode),to:positions.get(e.toNode)});
    runs.push({id,anchored,
      authority:anchored?'EXPLICIT_SOURCE_ABSOLUTE':'UNANCHORED_LOCAL_FRAME',
      firstNode:startNode,nodeCount:positions.size,edgeCount:group.length,
      elementIndices:group.map(e=>e.index),
      sourceFrame:INPUTXML_SOURCE_FRAME,hubFrame:INPUTXML_HUB_FRAME,
      gapPolicy:anchored?'VERIFIED_SOURCE_ANCHOR_ONLY':'WITHIN_RUN_ONLY',
      crossUnanchoredRunPolicy:'REFUSE_CROSS_RUN_GAP_PROXIMITY_JOIN',
    });
  }
  return {edges,runs,assignments};
}
