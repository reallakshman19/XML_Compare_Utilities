/**
 * Baseline investigation only: use the same 2-edge L-shaped topology as the
 * inherited multi-base-correspondence.test.js at the pinned PR base.
 * This is test-only diagnostics, not a relaxation of qualified path gates.
 */
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';
import { buildCiiMultiBaseCorrespondence } from '../tabs/cii-workspace/cii-workspace-multi-base-correspondence.js';
const pt=(x,y,z=0)=>({x,y,z});
const seg=(from,to,fromPos,toPos)=>({from,to,dx:toPos.x-fromPos.x,dy:toPos.y-fromPos.y,dz:toPos.z-fromPos.z,
 length:Math.hypot(toPos.x-fromPos.x,toPos.y-fromPos.y,toPos.z-fromPos.z),
 od:100,wall:6,fromPos,toPos});
function graph(side,id,elements){
 const nodes={};
 for(const e of elements){nodes[e.from]=e.fromPos;nodes[e.to]=e.toPos;}
 return adaptCiiDocumentToTopologyGraph({
 schema:'CIIWorkspaceDocument.v1',side,contentSha256:id,nodeNames:{},
 parsed:{elements,nodes,rigids:[]},
 });
}
const src=graph('SOURCE','source-L',[seg(10,20,pt(0,0),pt(1000,0)),seg(20,30,pt(1000,0),pt(1000,1000))]);
const tgt=graph('TARGET','target-L',[seg(110,120,pt(0,0),pt(1000,0)),seg(120,130,pt(1000,0),pt(1000,1000))]);
const pos=(g,id)=>g.nodes.find(n=>String(n.id)===String(id)).position;
const pair=(a,b)=>({sourceNodeId:String(a),targetNodeId:String(b),source:pos(src,a),target:pos(tgt,b),sourceOdMm:100});
const aBase={baseId:'A-L',anchorPairs:[pair(10,110),pair(20,120),pair(30,130)]};
const configurations=[
 ['A',qualifyCiiMultiBaseAuthority({sourceGraph:src,targetGraph:tgt,methodABases:[aBase]})],
 ['B',qualifyCiiMultiBaseAuthority({sourceGraph:src,targetGraph:tgt,methodBAnchors:[{baseId:'B-L',sourceNodeId:'20',targetNodeId:'120'}]})],
 ['AB',qualifyCiiMultiBaseAuthority({sourceGraph:src,targetGraph:tgt,methodABases:[aBase],methodBAnchors:[{baseId:'B-L',sourceNodeId:'20',targetNodeId:'120'}]})],
];
for(const [label,authority] of configurations){
 const corr=buildCiiMultiBaseCorrespondence(src,tgt,authority);
 console.log('BASELINE_MULTIBASE_DIAGNOSTIC '+JSON.stringify({
   label,authorityStatus:authority.status,correspondenceStatus:corr.status,blockers:corr.blockers,
   readyLoopCount:corr.readyLoopCount,unresolvedReadyBaseLoopCount:corr.unresolvedReadyBaseLoopCount,
   loops:(corr.loopResults||[]).map(({loop,correspondence})=>({
     method:loop.method,loopId:loop.loopId,status:correspondence.status,
     blockers:correspondence.blockers,pathGate:correspondence.pathGate,
     sourceLength:correspondence.sourcePath?.totalLengthMm,targetLength:correspondence.targetPath?.totalLengthMm,
     alignmentScore:correspondence.alignment?.score,pathScore:correspondence.pathScore,
     rows:(correspondence.elementRows||[]).map(r=>({kind:r.kind,status:r.status,authority:r.authority})),
   })),
 }));
}
