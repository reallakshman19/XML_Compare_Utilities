/**
 * R2 independent-verifier LIVE adversarial test harness.
 * Each case clones real production verifier + readers into a temporary
 * directory, patches ONLY the clone's dependency imports to return a
 * prescribed invalid view of byte-consistent original/candidate XML, then
 * proves unchanged GREEN rejection => ONE deleted production guard RED.
 * No test-only dependency injection hooks are added to production.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const target='uxml/UxmlEditOpsIndependentVerifier.js';
const runner='tests/uxml-edit-ops-verifier-live-fixture.mjs';
const wrapper=String.raw`
import {mapCaesarInputXmlToUxmlStrict as rawMap}
  from './UxmlInputXmlSchemaMapper.js';
import {inventoryInputXml as rawInventory}
  from './UxmlEditOpsTypedInventory.js';
const seed=process.env.VERIFIER_SEED;
const before=source=>source.includes('FROM_NODE="40"');
export function mapCaesarInputXmlToUxmlStrict(source,opts){
  const doc=rawMap(source,opts),isOld=before(source);
  const row=doc.ports.find(p=>p.sourceRefs?.[0]?.elementIndex===1&&
    p.sourceRefs?.[0]?.endpoint==='FROM');
  if(seed==='ANCHOR'&&isOld){
    if(!row)throw new Error('seed missing source port');
    row.anchored=false;
  }
  if(seed==='LITERAL'&&isOld){
    const attrs=doc.components[1]?.rawAttributes?.inputXml?.sourceAttributes;
    if(!attrs)throw new Error('seed missing original literal');
    attrs.FROM_X='not-a-coordinate';
  }
  if(seed==='POINT'&&!isOld){
    if(!row)throw new Error('seed missing destination port');
    row.point.x+=0.004;
  }
  if(seed==='ROWNUM'&&!isOld){
    const ref=doc.components[1]?.sourceRefs?.[0];
    if(!ref)throw new Error('seed missing new ref');
    ref.fromNode='60';
    ref.recordKey='E1:F60:T50';
  }
  return doc;
}
export function inventoryInputXml(source,opts){
  const inventory=rawInventory(source,opts),isOld=before(source);
  if(seed==='TEXT'&&!isOld){
    inventory.textItems.push({path:'/CAESARII[1]/PIPINGMODEL[1]/PIPINGELEMENT[2]',
      raw:'NODE 40',decoded:'NODE 40'});
  }
  if(seed==='OWNER'&&isOld){
    const row=inventory.carriers.find(c=>c.element==='PIPINGELEMENT'&&
      c.key==='20');
    if(!row)throw new Error('seed missing owner carrier');
    inventory.carriers.push({...row,raw:'20'});
  }
  if(seed==='SHAPE'&&!isOld)inventory.shape.push('EXTRA-UNVERIFIED-SHAPE');
  if(seed==='LEDGER'&&!isOld){
    const c=inventory.items.find(x=>x.element==='RESTRAINT'&&x.field==='NODE');
    if(!c)throw new Error('seed missing edited child');
    c.raw='40';
  }
  if(seed==='UNCHANGED'&&!isOld){
    const c=inventory.items.find(x=>x.element==='RESTRAINT'&&x.field==='NODE');
    if(!c)throw new Error('seed missing nonedited child');
    c.raw='020';
  }
  if(seed==='NONNODE'&&!isOld){
    const c=inventory.items.find(x=>x.element==='PIPINGELEMENT'&&
      x.field==='DIAMETER');
    if(!c)throw new Error('seed missing diameter');
    c.raw='44';c.decoded='44';
  }
  if(seed==='EDGES'&&!isOld){
    inventory.carriers=inventory.carriers.map(c=>
      c.element==='PIPINGELEMENT'&&c.index===1&&c.field==='TO_NODE'
        ? {...c,key:'60'}:c);
  }
  return inventory;
}
`;
const seedSpecs=[
  {
    seed:'TEXT',guard:'verifier text call',
    old:'assertVerifierTextParity(before,after);',replacement:'void after;',
  },
  {
    seed:'OWNER',guard:'verifier owner-spelling call',
    old:'assertVerifierOwnerSpelling(before,after,authorisedMapping);',
    replacement:'void after;',
  },
  {
    seed:'POINT',guard:'verifier solved-point call',
    old:'assertVerifierS3PointConsistency(originalDoc,candidateDoc,i,role);',
    replacement:'void role;',
  },
  {
    seed:'ANCHOR',guard:'verifier physical anchoring and coordinate frame',
    old:"assert(port.anchored===true&&ref.anchored===true&&\n          port.coordinateFrame===INPUTXML_HUB_FRAME&&p&&\n          [p.x,p.y,p.z].every(Number.isFinite),C.COORD,{owner,key});",
    replacement:'assert(true,C.COORD,{owner,key});',
  },
  {
    seed:'LITERAL',guard:'verifier original absolute-coordinate evidence',
    old:'catch{throw fail(C.COORD,{owner,key});}',
    replacement:'catch{raw=p;}',
  },
  {
    seed:'SELF',guard:'verifier FROM/TO source pair self-connection',
    old:'assertVerifierSourcePairDistinctness(before,authorisedMapping);',
    replacement:'void authorisedMapping;',
  },
  {
    seed:'CHILD',guard:'verifier absorbed child numeric reference equality',
    old:'assert(b.key===mapped,C.TOPO,{path:a.path});',
    replacement:'assert(true,C.TOPO,{path:a.path});',
  },
  {
    seed:'SHAPE',guard:'verifier whole XML structure/shape parity',
    old:'assert(eq(before.shape,after.shape)&&before.records.length===after.records.length&&',
    replacement:'assert(true&&before.records.length===after.records.length&&',
  },
  {
    seed:'LEDGER',guard:'verifier edited child ledger raw parity',
    old:'assert(l&&l.before===a.raw&&l.after===b.raw,C.TOPO,{path:a.path});',
    replacement:'assert(true,C.TOPO,{path:a.path});',
  },
  {
    seed:'UNCHANGED',guard:'verifier unchanged typed node raw spelling',
    old:'}else assert(a.raw===b.raw,C.TOPO,{path:a.path});',
    replacement:'}else assert(true,C.TOPO,{path:a.path});',
  },
  {
    seed:'NONNODE',guard:'verifier untouched nonnode numeric field',
    old:'}else assert(a.raw===b.raw&&a.decoded===b.decoded,C.TOPO,{path:a.path});',
    replacement:'}else assert(true,C.TOPO,{path:a.path});',
  },
  {
    seed:'EDGES',guard:'verifier whole numeric directed graph and components',
    old:'assert(eq(expected.map(JSON.stringify),actual.map(JSON.stringify))&&\n    eq(components(expected),components(actual)),C.TOPO);',
    replacement:'assert(true,C.TOPO);',
  },
  {
    seed:'ROWNUM',guard:'verifier per-row S3 sourceRef numeric endpoint identity',
    old:'assert(id(newRef.fromNode)===a&&id(newRef.toNode)===b,C.TOPO,{row:i+1});',
    replacement:'assert(true,C.TOPO,{row:i+1});',
  },
];
function run(dir,seed){
  return spawnSync(process.execPath,['--test',runner],{
    cwd:dir,encoding:'utf8',timeout:60000,
    env:Object.fromEntries([...Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT'),['VERIFIER_SEED',seed]]),
  });
}
for(const spec of seedSpecs){
  test('R2 LIVE verifier '+spec.seed+' '+spec.guard+' GREEN -> RED',()=>{
    const dir=mkdtempSync(join(tmpdir(),'xcu-verifier-live-r2-'));
    try{
      cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
      cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
      mkdirSync(join(dir,'tests'),{recursive:true});
      cpSync(join(root,runner),join(dir,runner));
      writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
      const filename=join(dir,target);
      let verifier=readFileSync(filename,'utf8');
      const replace=(from,to,label)=>{
        assert.equal(verifier.split(from).length-1,1,label);
        verifier=verifier.replace(from,()=>to);
      };
      replace("from './UxmlInputXmlSchemaMapper.js';",
        "from './__VerifierSeed.js';",'exact S3 seed seam');
      replace("from './UxmlEditOpsTypedInventory.js';",
        "from './__VerifierSeed.js';",'exact carrier seed seam');
      writeFileSync(filename,verifier);
      writeFileSync(join(dir,'uxml/__VerifierSeed.js'),wrapper);
      const clean=run(dir,'CONTROL');
      assert.equal(clean.status,0,'CONTROL must accept\n'+clean.stdout+'\n'+clean.stderr);
      const baseline=run(dir,spec.seed);
      assert.equal(baseline.status,0,spec.guard+' seeded GREEN control\n'+
        baseline.stdout+'\n'+baseline.stderr);
      assert.match(baseline.stdout,/^ok 1 -/m,'control must actually execute');
      assert.equal(verifier.split(spec.old).length-1,1,
        spec.guard+' missing exact live verifier guard');
      writeFileSync(filename,verifier.replace(spec.old,()=>spec.replacement));
      const syntax=spawnSync(process.execPath,['--check',target],{cwd:dir,
        encoding:'utf8'});
      assert.equal(syntax.status,0,spec.guard+' parse failure '+syntax.stderr);
      const red=run(dir,spec.seed),output=red.stdout+'\n'+red.stderr;
      assert.notEqual(red.status,0,spec.guard+' survived '+output);
      assert.match(output,/^not ok 1 -/m,'genuine assertion RED, not setup failure');
      assert.doesNotMatch(output,/ERR_MODULE_NOT_FOUND|SyntaxError/);
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}
