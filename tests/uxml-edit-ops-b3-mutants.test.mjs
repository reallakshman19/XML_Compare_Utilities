import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const modulePath='uxml/UxmlInputXmlSameRunCoincidence.js';
const dependencies=[
  modulePath,'uxml/UxmlInputXmlDeltaGraph.js',
  'uxml/UxmlInputXmlSourceFields.js','uxml/UxmlInputXmlSourceStructure.js',
  'tests/uxml-edit-ops-b3-fixtures.mjs','tests/uxml-edit-ops-b3-probe.mjs',
];
const guards=[
  {id:'ALL_PATH',old:'if(pathResidualMm>INPUTXML_DELTA_TOLERANCE)',
    replace:'if(false)'},
  {id:'SAME_RUN',old:'if(runA!==runB)',replace:'if(false)'},
  {id:'TOLERANCE',old:'pathBoundMm<=INPUTXML_DELTA_TOLERANCE?',
    replace:'pathBoundMm<=Infinity?'},
  {id:'SHA',old:'if(measured!==fileSha256.toLowerCase())',
    replace:'if(false)'},
  {id:'STACKED',old:'const pathBoundMm=distanceMm+pathResidualMm;',
    replace:'const pathBoundMm=distanceMm;'},
  {id:'CASE_DUPLICATE',old:'if(variants.length!==1)throw Error(C.FIELD_CASE);',
    replace:'if(false)throw Error(C.FIELD_CASE);'},
  {id:'CASE_REQUIRED',old:"if(!present)throw Error(field.startsWith('DELTA_')?C.DELTA_MISSING:C.NODE_ID);",
    replace:"if(false)throw Error(field.startsWith('DELTA_')?C.DELTA_MISSING:C.NODE_ID);"},
  {id:'SENTINEL',
    old:'if(value!==sentinel && Math.abs(value-sentinel)<0.00001)',
    replace:'if(false)'},
  {id:'NULL_INPUT',
    old:"if(request===null||typeof request!=='object'||Array.isArray(request))",
    replace:'if(false)'},
  {id:'BOUNDARY',old:'pathBoundMm<=INPUTXML_DELTA_TOLERANCE?',
    replace:'pathBoundMm<INPUTXML_DELTA_TOLERANCE?'},
  {id:'NODE_ID',old:'source=exactNodeId(sourceNode);canonical=exactNodeId(canonicalNode);',
    replace:'source=String(sourceNode);canonical=exactNodeId(canonicalNode);'},
  {id:'W1_XML_SPACE_DELTA',
    old:'if(!numberFormat.test(raw))throw Error(C.DELTA_INVALID);',
    replace:'if(false)throw Error(C.DELTA_INVALID);'},
  {id:'W1_XML_SPACE_NODE',
    old:'if(!nodeFormat.test(decoded))throw Error(C.NODE_ID);',
    replace:'if(false)throw Error(C.NODE_ID);'},
  {id:'U1_MM_LENGTH_UNIT',
    old:'if(!unitIsMillimetre(originalText))throw Error(C.UNIT);',
    replace:'if(false)throw Error(C.UNIT);'},
];
const run=(cwd,id)=>spawnSync(process.execPath,
  ['tests/uxml-edit-ops-b3-probe.mjs',id],
  {cwd,encoding:'utf8',timeout:15000});

for(const guard of guards){
  test('B3 GREEN -> RED delete-one-guard '+guard.id,()=>{
    const temp=mkdtempSync(join(tmpdir(),'uxml-b3-'));
    try{
      for(const file of dependencies){
        mkdirSync(join(temp,file.split('/')[0]),{recursive:true});
        cpSync(join(root,file),join(temp,file));
      }
      writeFileSync(join(temp,'package.json'),'{"type":"module"}\n');
      const before=run(temp,guard.id);
      assert.equal(before.status,0,before.stdout+'\n'+before.stderr);
      const path=join(temp,modulePath),original=readFileSync(path,'utf8');
      assert.equal(original.split(guard.old).length,2,
        'Exact one-guard seam required: '+guard.id);
      writeFileSync(path,original.replace(guard.old,guard.replace));
      const mutated=run(temp,guard.id);
      assert.notEqual(mutated.status,0,
        'Guard deletion survived: '+guard.id+'\n'+mutated.stdout+'\n'+mutated.stderr);
      assert.equal(mutated.signal,null,'Mutant must fail assertion, not time out');
      assert.match(mutated.stderr,/AssertionError/,
        'Mutant must turn focused independent assertion RED');
    }finally{rmSync(temp,{recursive:true,force:true});}
  });
}
