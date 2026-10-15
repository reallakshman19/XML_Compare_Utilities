import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseIndependentNodeNameState } from './cii-workspace-multisource-texpected-oracle.js';

// PH4 / Owner Phase 2 preparer only. No golden or label pairing is invented.
// This inventory is derived from frozen physical nodes, NOT from BM-001,
// partial TEXPECTED, product correspondence authorities or Owner assertions.
const frozenSha = Object.freeze({
  S1: '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2: '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3: 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T: 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const sourceSetSha256='5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3';
const sha256 = bytes=>createHash('sha256').update(bytes).digest('hex');
const base = fileURLToPath(new URL('../',import.meta.url));
const dir = join(base,'test-results/cii-method-a-qualification');
const census = JSON.parse(readFileSync(join(dir,'source-target-census.json'),'utf8'));
const frozenMemberNames=['S1','S2','S3'];
const sourceNodes = [];
const physicalCounts = {};
const sourceRowsByKey=new Map(census.rows.map(row=>[row.rowKey,row]));
assert.equal(census.rows.length,150);
assert.equal(sourceRowsByKey.size,150,'every census physical SOURCE key must be distinct');
const parsedByMember = new Map();
for(const member of [...frozenMemberNames,'T']){
  const bytes=readFileSync(join(base,'Benchmark',member+'.CII'));
  assert.equal(sha256(bytes),frozenSha[member],member+': original byte SHA changed');
  const parsed=parseIndependentNodeNameState(bytes.toString('latin1'));
  assert.deepEqual(parsed.conflicts,[],member+': ambiguous physical NODENAME custody');
  const ids=[...new Set(parsed.elements.flatMap(edge=>[String(edge.from),String(edge.to)]))];
  assert.equal(ids.length,new Set(ids).size);
  parsedByMember.set(member,{ids,names:parsed.names});
  physicalCounts[member]=ids.length;
  if(member==='T') continue;
  for(const id of ids){
    const physical=sourceRowsByKey.get(member+':'+id);
    assert(physical,'raw SOURCE node must exist in read-only census: '+member+':'+id);
    const rawLabel=parsed.names.get(id)||'';
    assert.equal(physical.sourceNodeName,rawLabel,member+':'+id+' lexical custody drift');
    sourceNodes.push({side:'SOURCE',sourceMember:member,physicalNodeId:id,
      rawNodeName:rawLabel,censusState:physical.state,
      identityBound:physical.identityBound===true,
      confidence:physical.confidence||'REVIEW'});
  }
  assert.equal(ids.length,census.rows.filter(row=>row.sourceId===member).length,
    'independent physical SOURCE cardinality: '+member);
}
assert.equal(sourceNodes.length,150);
const t=parsedByMember.get('T');
const targetNodes=t.ids.map(id=>({
  side:'TARGET',sourceMember:'',physicalNodeId:id,
  rawNodeName:t.names.get(id)||'',censusState:'NOT_A_SOURCE_CENSUS_ROW',
  identityBound:false,confidence:'NOT_APPLICABLE',
}));
assert.equal(targetNodes.length,1619,'frozen TARGET physical node population changed');
assert.equal(census.sourceSetSha256,sourceSetSha256,'SOURCE set digest changed');

const index=(nodes,keyFn)=>{
  const map=new Map();
  for(const node of nodes){
    if(!node.rawNodeName) continue;
    const key=keyFn(node);
    if(!map.has(key)) map.set(key,[]);
    map.get(key).push(node);
  }
  return map;
};
const sourceByLabel=index(sourceNodes,n=>n.rawNodeName);
const sourceByMemberAndLabel=index(sourceNodes,n=>n.sourceMember+'\u0000'+n.rawNodeName);
const targetByLabel=index(targetNodes,n=>n.rawNodeName);
const sorted=nodes=>[...nodes].sort((a,b)=>{
  const memberOrder=['S1','S2','S3',''];
  const d=memberOrder.indexOf(a.sourceMember)-memberOrder.indexOf(b.sourceMember);
  if(d!==0) return d;
  return Number(a.physicalNodeId)-Number(b.physicalNodeId);
});
const flags=(row)=>{
  const x=[];
  if(!row.rawNodeName) x.push('UNNAMED_PHYSICAL_NODE');
  if(row.side==='SOURCE'){
    if((sourceByLabel.get(row.rawNodeName)||[]).length>1) x.push('SOURCE_LABEL_REUSED_ACROSS_PHYSICAL_NODES');
    if((sourceByMemberAndLabel.get(row.sourceMember+'\u0000'+row.rawNodeName)||[]).length>1)
      x.push('SOURCE_LABEL_REUSED_WITHIN_MEMBER');
    if(new Set((sourceByLabel.get(row.rawNodeName)||[]).map(x=>x.sourceMember)).size>1)
      x.push('SOURCE_LABEL_REUSED_ACROSS_MEMBERS');
  } else if((targetByLabel.get(row.rawNodeName)||[]).length>1)
    x.push('TARGET_LABEL_REUSED_ACROSS_PHYSICAL_NODES');
  if(/\.{2,}/.test(row.rawNodeName)) x.push('REPEATED_DOT_PUNCTUATION');
  if(/SL-275-A\.8/.test(row.rawNodeName)) x.push('SUFFIX_NEEDS_OWNER_ADJUDICATION');
  return x;
};
const rows=sorted([...sourceNodes,...targetNodes]).map(n=>({
  ...n,sourcePhysicalOccurrences:n.side==='SOURCE'?(sourceByLabel.get(n.rawNodeName)||[]).length:0,
  sourceMemberOccurrences:n.side==='SOURCE'?(sourceByMemberAndLabel.get(n.sourceMember+'\u0000'+n.rawNodeName)||[]).length:0,
  targetPhysicalOccurrences:n.side==='TARGET'?(targetByLabel.get(n.rawNodeName)||[]).length:0,
  flags:flags(n),
}));
assert.equal(rows.length,1769);
assert.equal(rows.filter(x=>x.side==='SOURCE').length,150);
assert.equal(rows.filter(x=>x.side==='TARGET').length,1619);
const duplicateSourceLabels=[...sourceByLabel].filter(([,c])=>c.length>1).map(([label,c])=>({
  rawLabel:label,physicalCandidates:c.map(x=>x.sourceMember+':'+x.physicalNodeId),
  memberCount:new Set(c.map(x=>x.sourceMember)).size,
}));
const duplicateTargetLabels=[...targetByLabel].filter(([,c])=>c.length>1).map(([label,c])=>({
  rawLabel:label,physicalCandidates:c.map(x=>x.physicalNodeId),
}));
const report={
  schema:'CiiOwnerPhase2PhysicalLabelInventory.v1',
  role:'READ_ONLY_ORIGINAL_NODE_LABEL_CATALOG_NOT_OWNER_LEXICAL_GOLDEN',
  headSha:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,
  sourceSetSha256,originalFixtureSha256:frozenSha,
  sourceNodes:150,targetNodes:1619,totalPhysicalNodes:rows.length,
  memberCounts:physicalCounts,
  sourceLabelReuseGroups:duplicateSourceLabels,
  targetLabelReuseGroups:duplicateTargetLabels,
  unnamedPhysicalSourceNodes:sourceNodes.filter(x=>!x.rawNodeName).length,
  unnamedPhysicalTargetNodes:targetNodes.filter(x=>!x.rawNodeName).length,
  individualPhysicalRows:rows,
  authenticOwnerLexicalRelationsPresent:false,
  expectedOriginalOwnerRelationCount:null,
  ownerApproved:false,ph4Accepted:false,writer2Authority:false,
  outstandingOwnerSubmission:[
    'ENTIRE_UNMODIFIED_ORIGINAL_OWNER_PS_TO_SL_LEXICAL_RELATION_BYTES',
    'INDEPENDENT_OWNER_ORIGINAL_SHA256_AND_FULL_NONBLANK_ROW_COUNT',
    'OWNER_PROVENANCE_ISSUE_COMMENT_OR_OTHER_ATTESTED_SOURCE',
    'MEMBER_ATTRIBUTION_AND_MULTI_TARGET_LABEL_ADJUDICATION_WITHOUT_REWRITING_ORIGINAL',
    'WORK_SPECIFIC_V3_6_APPROVAL_AND_OWNER_PHASE_ACCEPTANCE',
  ],
  warning:'THIS_IS_AN_INDEX_OF_PHYSICAL_NODE_LABELS_ONLY; NEVER TREAT IT AS EXPECTED PS_TO_SL_PAIRS',
};
const csv=(v)=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
const columns=['side','sourceMember','physicalNodeId','rawNodeName','censusState',
  'identityBound','confidence','sourcePhysicalOccurrences','sourceMemberOccurrences',
  'targetPhysicalOccurrences','flags'];
const catalogCsv=[columns.join(','),...rows.map(row=>columns.map(c=>
  csv(c==='flags'?JSON.stringify(row.flags):row[c])).join(','))].join('\n')+'\n';
const exceptions=rows.filter(x=>x.flags.length);
const exceptionCsv=[columns.join(','),...exceptions.map(row=>columns.map(c=>
  csv(c==='flags'?JSON.stringify(row.flags):row[c])).join(','))].join('\n')+'\n';
mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'owner-phase2-physical-label-inventory.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dir,'owner-phase2-physical-label-catalog.csv'),catalogCsv);
writeFileSync(join(dir,'owner-phase2-physical-label-exceptions.csv'),exceptionCsv);
assert(!JSON.stringify(report).includes('expectedSourceTargetPair'),
  'physical label inventory cannot pretend to be a pair golden');
console.log(JSON.stringify({
  schema:report.schema,status:'PASS_PHYSICAL_LABEL_INVENTORY_OWNER_RELATIONS_MISSING',
  physicalSourceNodes:sourceNodes.length,physicalTargetNodes:targetNodes.length,
  duplicateSourceLabelGroups:duplicateSourceLabels.length,
  duplicateTargetLabelGroups:duplicateTargetLabels.length,
  flaggedPhysicalRows:exceptions.length,ownerAccepted:false,ph4Accepted:false,
},null,2));
