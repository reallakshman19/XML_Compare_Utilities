/** S4.1 source-guard mutations in disposable directories, never on product branch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const source=fileURLToPath(new URL('../',import.meta.url));
const mapper='uxml/UxmlCategorizedInputXmlSchemaMapper.js';
const files=[
 mapper,'uxml/UxmlConstants.js','uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
 'xml-compare/CategorizedInputXmlConverter.js',
 'xml-compare/XmlCompareCoordinateSideload.js',
 'xml-compare/XmlCompareCoordinateDiagnostics.js',
 'tests/uxml-s4-1-categorized-reader.test.mjs',
];
function kill({name,old,replacement,pattern}){
  const dir=mkdtempSync(join(tmpdir(),'uxml-s4-1-mutant-'));
  try{
    for(const folder of ['uxml','xml-compare','tests'])mkdirSync(join(dir,folder));
    for(const file of files)copyFileSync(join(source,file),join(dir,file));
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const exec=()=>spawnSync(process.execPath,['--test','--test-name-pattern='+pattern,
      'tests/uxml-s4-1-categorized-reader.test.mjs'],
      {cwd:dir,encoding:'utf8',timeout:45000,
        env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
    const green=exec();
    assert.equal(green.status,0,'baseline regression not green: '+name+'\n'+green.stdout+green.stderr);
    assert.match(green.stdout,/# pass 1\b/,'targeted baseline must run');
    const file=join(dir,mapper),code=readFileSync(file,'utf8');
    assert.equal(code.split(old).length-1,1,'must mutate one exact guard: '+name);
    writeFileSync(file,code.replace(old,replacement));
    const red=exec(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+name+'\n'+output);
    assert.match(output,/^not ok \d+ -/m,'targeted regression must fail, not just setup');
    assert.match(output,/# fail 1\b/,'one targeted regression must fail');
    process.stdout.write('RED_VERIFIED S4.1 '+name+' status='+red.status+' original regression # fail 1\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const mutants=[
  {name:'SHA256_GUARD',
    old:"if(measured!==clean(options.fileSha256).toLowerCase())",
    replacement:"if(false&&measured!==clean(options.fileSha256).toLowerCase())",
    pattern:'S4.1 REFUSE wrong SHA'},
  {name:'RECORD_KEY_GUARD',
    old:"if(!clean(fromNode)||!clean(toNode)||!clean(elementKey))",
    replacement:"if(false&&(!clean(fromNode)||!clean(toNode)||!clean(elementKey)))",
    pattern:'S4.1 REFUSE missing record identity'},
  {name:'NO_MATCH_GUARD',
    old:"if(candidateRows.length===0)",
    replacement:"if(false&&candidateRows.length===0)",
    pattern:'S4.1 REFUSE no source match'},
  {name:'AMBIGUOUS_DUPLICATE_GUARD',
    old:"if(candidateRows.length>1)",
    replacement:"if(false&&candidateRows.length>1)",
    pattern:'S4.1 REFUSE ambiguous byte-identical'},
  {name:'ONE_TO_ONE_GUARD',
    old:"if(claimed.has(candidate.index))",
    replacement:"if(false&&claimed.has(candidate.index))",
    pattern:'S4.1 REFUSE repeated claim'},
  {name:'COVERAGE_GUARD',
    old:"if(claimed.size!==originalRows.length)",
    replacement:"if(false&&claimed.size!==originalRows.length)",
    pattern:'S4.1 REFUSE unclaimed original record'},
  {name:'DERIVED_GUARD',
    old:"if(element.evidence!==expected.evidence&&!element.explicitReview)",
    replacement:"if(false&&element.evidence!==expected.evidence&&!element.explicitReview)",
    pattern:'S4.1 REFUSE unreviewed derived'},
  {name:'EXTERNAL_DUPLICATE_GUARD',
    old:"if(repeatedExternalBlock(originalRows))",
    replacement:"if(false&&repeatedExternalBlock(originalRows))",
    pattern:'S4.1 REFUSE duplicated cross-branch RESTRAINT'},
  {name:'UNKNOWN_SECTION_GUARD',
    old:"if(hasUnknownSourceSection(supplied.text,originalRows))",
    replacement:"if(false&&hasUnknownSourceSection(supplied.text,originalRows))",
    pattern:'S4.1 REFUSE unknown original header'},
];
for(const mutant of mutants)
  test('S4.1_MUTANT_KILL_'+mutant.name,()=>kill(mutant));
