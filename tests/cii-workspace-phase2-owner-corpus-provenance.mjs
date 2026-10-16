/**
 * Owner #106 W9: additional fixture provenance investigation.
 * Secondary corpus evidence only; never promote an alternate fixture to the
 * pinned S1/S2/S3/T accepted benchmark, nor import Owner labels into matcher.
 */
import { readdirSync,readFileSync,statSync,mkdirSync,writeFileSync } from 'node:fs';
import { relative,join } from 'node:path';
import {createHash} from 'node:crypto';
import { parseIndependentNodeNameState } from './cii-workspace-multisource-texpected-oracle.js';
const base=new URL('../',import.meta.url);
const repoRoot=decodeURIComponent(base.pathname);
function allCii(path) {
  const out=[];
  for(const ent of readdirSync(path,{withFileTypes:true})){
    const name=join(path,ent.name);
    if(ent.isDirectory())out.push(...allCii(name));
    else if(ent.isFile() && /\.cii$/i.test(ent.name))out.push(name);
  }
  return out;
}
const golden=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url),'utf8')
  .split(/\r?\n/).map(l=>l.trim().match(/^(PS\S+)\s+(SL\S+)$/)).filter(Boolean).map(([_,ps,sl],i)=>({ordinal:i+1,ps,sl}));
const wantedPs=new Set(golden.map(x=>x.ps)),wantedSl=new Set(golden.map(x=>x.sl));
const fileRows=[],allLabels=new Map(),failures=[];
for(const file of allCii(join(repoRoot,'Benchmark')).sort()){
  const bytes=readFileSync(file),path=relative(repoRoot,file).replaceAll('\\','/');
  try{
    const parsed=parseIndependentNodeNameState(bytes.toString('latin1'));
    if(parsed.conflicts.length)throw Error('NODENAME_CONFLICTS:'+parsed.conflicts.length);
    const names=new Set([...parsed.names.values()].filter(Boolean));
    const matchedPs=[...wantedPs].filter(x=>names.has(x));
    const matchedSl=[...wantedSl].filter(x=>names.has(x));
    fileRows.push({
      path,sha256:createHash('sha256').update(bytes).digest('hex'),
      nodeNameUniqueCount:names.size,physicalElementCount:parsed.elements.length,
      ownerPsNameCount:matchedPs.length,ownerSlNameCount:matchedSl.length,
      ownerPsNames:matchedPs,ownerSlNames:matchedSl,
    });
    for(const label of names){
      if(!allLabels.has(label))allLabels.set(label,[]);
      allLabels.get(label).push(path);
    }
  }catch(e){
    failures.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),
      reason:String(e.message||e)});
  }
}
const originalPaths=new Set(['Benchmark/S1.CII','Benchmark/S2.CII','Benchmark/S3.CII','Benchmark/T.CII']);
const otherLabels=new Map();
for(const [label,files] of allLabels){const alternatives=files.filter(f=>!originalPaths.has(f));if(alternatives.length)otherLabels.set(label,alternatives);}
const pairEvidence=golden.map(({ordinal,ps,sl})=>{
  const psInAlternate=otherLabels.get(ps)||[],slInAlternate=otherLabels.get(sl)||[];
  return {ordinal,ps,sl,psInAlternate,slInAlternate,
    bothOriginalLabelsPresentSomewhereInRepositoryCorpus:Boolean(allLabels.has(ps)&&allLabels.has(sl)),
    bothFoundInSameAlternateCii:psInAlternate.some(path=>slInAlternate.includes(path)),
  };
});
const stats={
  schema:'CiiPhase2AlternateFixtureProvenance.v1',
  originalRowCount:golden.length,
  inspectedFiles:fileRows.length,unreadableOrNonconformingCiiFiles:failures,
  uniquePSFromOwner:wantedPs.size,uniqueSLFromOwner:wantedSl.size,
  alternateCorpusPSOwnerLabelsPresent:[...wantedPs].filter(x=>otherLabels.has(x)).length,
  alternateCorpusSLOwnerLabelsPresent:[...wantedSl].filter(x=>otherLabels.has(x)).length,
  originalRowsWithPSInAlternate:pairEvidence.filter(p=>p.psInAlternate.length>0).length,
  originalRowsWithSLInAlternate:pairEvidence.filter(p=>p.slInAlternate.length>0).length,
  originalRowsWithBothPSAndSLAnywhereInCorpus:pairEvidence.filter(p=>p.bothOriginalLabelsPresentSomewhereInRepositoryCorpus).length,
  originalRowsWithBothLabelsInSameAlternate:pairEvidence.filter(p=>p.bothFoundInSameAlternateCii).length,
  checkedOnlyIncludedBenchmarkFolder:true,originalBenchmarkMemberOverride:false,
  status:'SECONDARY_NONAUTHORITATIVE_FIXTURE_PROVENANCE_ONLY',
  releaseValidationGranted:false,
};
const out=new URL('../test-results/cii-phase2/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('owner-alternate-fixture-provenance.json',out),
  JSON.stringify({stats,fileRows,pairEvidence},null,2)+'\n');
console.log('OWNER_ALTERNATE_FIXTURE_PROVENANCE '+JSON.stringify(stats));
console.log('OWNER_ALTERNATE_FIXTURE_FILES '+JSON.stringify(fileRows.map(({path,ownerPsNameCount,ownerSlNameCount,physicalElementCount})=>({
 path,ownerPsNameCount,ownerSlNameCount,physicalElementCount}))));
