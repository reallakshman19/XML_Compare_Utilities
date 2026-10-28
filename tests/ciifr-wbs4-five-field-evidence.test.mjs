import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPrivateOutputSecurity } from './helpers/ciifr-private-output.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { inspectFiveFieldEvidence, publicFiveFieldSummary }
  from '../tools/ciifr-wbs4/five-field-evidence.mjs';

// Synthetic V14 records only. Do not commit or load protected CII in tests.
const row = (values, count = 6) => '  ' + Array.from({length: count}, (_, i) =>
  String(values[i] ?? 0).padStart(13)).join('');
const label = value => '       ' + String(value.length).padStart(5) + ' ' + value;
function element({from=901234, to=901235, pointer=0, temp='-0.0000E+00',
                  pressure='1.23D+04', density='1E-10'}={}) {
  const reals = Array.from({length: 9}, (_, n) => row(n === 0 ? [from, to] :
    n === 1 ? [0, 0, 0, temp, 0, 0] : n === 3 ? [pressure] :
    n === 5 ? [0, density] : [], n === 8 ? 5 : 6));
  return [...reals, label('PRIVATE_SYNTH_NAME_ABC'), label('/PRIVATE_SYNTH_BRANCH_XYZ'),
    row([], 2), row([0, pointer]), row([]), row([], 3)];
}
function makeCii({pointers=[0,1], weight='-0.0000E+00',
                  type='2E+00', newline='\r\n'}={}) {
  const count = pointers.some(Boolean) ? 1 : 0;
  const lines = ['#$ VERSION', '    5.00000      14.0000        1256',
    '#$ CONTROL', row([pointers.length,0,0,0,0,0]), row([0,count]),
    row([]), row([],1), '#$ ELEMENTS',
    ...pointers.flatMap(pointer => element({pointer})),
    '#$ RIGID', ...(count ? [row([weight,type],2)] : [])];
  return new Uint8Array(Buffer.from(lines.join(newline)+newline, 'ascii'));
}
const inspect = (bytes, index=0) => inspectFiveFieldEvidence(bytes, {elementIndex:index});
const field = (result, name) => result.fields.find(f=>f.field===name);

test('positive attached explicit zero-weight RIGID is not an absent pointer', () => {
  const e=inspect(makeCii(),1);
  assert.equal(e.rigidAssociation.association,'PRESENT');
  assert.equal(e.rigidAssociation.referencedRecordOrdinal,1);
  assert.equal(field(e,'RIGID.WEIGHT').presence,'STORED_RECORD');
  assert(Object.is(field(e,'RIGID.WEIGHT').source.numericValue,-0));
  assert.equal(field(e,'RIGID.WEIGHT').effective,'EFFECTIVE_UNKNOWN');
});

test('deliberately wrong pointer-zero dereference cannot attach last record', () => {
  const e=inspect(makeCii(),0);
  assert.equal(e.rigidAssociation.association,'ABSENT');
  assert.equal(e.rigidAssociation.pointerValue,0);
  assert.equal(e.rigidAssociation.record,null);
  assert.equal(field(e,'RIGID.WEIGHT').source,null);
  assert.equal(field(e,'RIGID.TYPE').presence,'ABSENT_ASSOCIATED_RECORD');
});

test('shared RIGID ownership is explicit, including both physical ordinals', () => {
  const bytes=makeCii({pointers:[1,1]});
  for (const index of [0,1]) {
    const e=inspect(bytes,index);
    assert.equal(e.rigidAssociation.shared,true);
    assert.deepEqual(e.rigidAssociation.owners,[0,1]);
    assert(e.limitations.includes('SHARED_RIGID_OWNERSHIP'));
  }
});

test('duplicate FROM/TO endpoint numbers never identify the physical occurrence', () => {
  const e=inspect(makeCii(),1);
  const first=inspect(makeCii(),0);
  assert.equal(first.occurrence.fromNode,e.occurrence.fromNode);
  assert.equal(first.occurrence.toNode,e.occurrence.toNode);
  assert.notEqual(first.occurrence.indexZeroBased,e.occurrence.indexZeroBased);
  assert.equal(first.rigidAssociation.association,'ABSENT');
  assert.equal(e.rigidAssociation.association,'PRESENT');
});

test('original signed-zero and D/exponent lexemes survive fixed-width recovery', () => {
  const e=inspect(makeCii(),1);
  assert(Object.is(field(e,'TEMPERATURE_1').source.numericValue,-0));
  assert.match(field(e,'TEMPERATURE_1').source.lexeme,/-0.0000E\+00/);
  assert.match(field(e,'PRESSURE_1').source.lexeme,/1.23D\+04/);
  assert.equal(field(e,'PRESSURE_1').source.numericValue,12300);
  assert.match(field(e,'FLUID_DENSITY').source.lexeme,/1E-10/);
});

test('every source and pointer byte span round-trips for LF and CRLF', () => {
  for (const newline of ['\r\n','\n']) {
    const bytes=makeCii({newline}), e=inspect(bytes,1);
    for(const f of e.fields) {
      const s=f.source.byteSpan;
      assert.equal(Buffer.from(bytes.subarray(s.start,s.end)).toString('latin1'),f.source.lexeme);
      assert.equal(s.end-s.start,13);
    }
    const s=e.rigidAssociation.pointerByteSpan;
    assert.equal(Buffer.from(bytes.subarray(s.start,s.end)).toString('latin1'),
      e.rigidAssociation.pointerLexeme);
  }
});

test('invalid RIGID pointer and invalid occurrence fail closed', () => {
  const bad=makeCii({pointers:[2,1]});
  assert.throws(()=>inspect(bad),/WBS4_RIGID_POINTER_RANGE/);
  assert.throws(()=>inspect(makeCii(),2),/FIVE_FIELD_OCCURRENCE_RANGE/);
  assert.throws(()=>inspect(makeCii(),-1),/FIVE_FIELD_OCCURRENCE_RANGE/);
});

test('no effective inference from candidate alpha, units or FDM; each field has blockers', () => {
  const e=inspect(makeCii(),1);
  assert.deepEqual(e.fields.map(f=>f.effective),Array(5).fill('EFFECTIVE_UNKNOWN'));
  assert(field(e,'TEMPERATURE_1').missingEvidence.includes('ACTIVE_ALPHA_TOLERANCE'));
  assert(field(e,'FLUID_DENSITY').missingEvidence.includes('BASIC_LOAD_CASE_FDM'));
  assert(field(e,'RIGID.WEIGHT').missingEvidence.includes('NATIVE_V14_RIGID_UNIT_SELECTOR'));
  assert.equal(e.transferAuthority,'NONE');
  assert.equal(e.nativeCaesarValidation,'NOT_RUN');
});

test('caller input remains byte-identical after inspection and summary', () => {
  const bytes=makeCii(), copy=Buffer.from(bytes);
  const e=inspect(bytes,1), summary=publicFiveFieldSummary(e);
  assert.deepEqual(Buffer.from(bytes),copy);
  assert.equal(summary.transferAuthority,'NONE');
});

test('public summary whitelists no model data, physical indices, hashes or lexemes', () => {
  const e=inspect(makeCii(),1), pub=JSON.stringify(publicFiveFieldSummary(e));
  for (const forbidden of ['PRIVATE_SYNTH', '901234', '/PRIVATE', e.sourceSha256,
    '1.23D+04', '-0.0000E+00', 'pointerByteSpan', 'numericValue', 'byteSpan', 'owners']) {
    assert(!pub.includes(forbidden),`privacy leak: ${forbidden}`);
  }
  assert.throws(()=>publicFiveFieldSummary({classification:'LOCAL_ONLY_PRIVATE_EVIDENCE',fields:[]}),
    /FIVE_FIELD_UNQUALIFIED_REPORT/);
});

test('CLI makes a report with native private access and a distinct safe summary', () => {
  const sourceDir=mkdtempSync(join(tmpdir(),'ciifr-five-field-input-'));
  let outputDir;
  try {
    const input=join(sourceDir,'sample.CII');writeFileSync(input,makeCii());
    const cli=fileURLToPath(new URL('../tools/ciifr-wbs4/five-field-cli.mjs',import.meta.url));
    const stdout=execFileSync(process.execPath,[cli,input,'2'],{encoding:'utf8'}).trim();
    assert(stdout.startsWith(`LOCAL_ONLY_DIRECTORY=${join(tmpdir(), 'ciifr-five-field-')}`));
    outputDir=stdout.slice('LOCAL_ONLY_DIRECTORY='.length);
    const privateFile=join(outputDir,'private-report.json');
    const publicFile=join(outputDir,'public-summary.json');
    assertPrivateOutputSecurity(outputDir);
    const privateData=JSON.parse(readFileSync(privateFile,'utf8'));
    const publicData=JSON.parse(readFileSync(publicFile,'utf8'));
    assert.equal(privateData.occurrence.ordinalOneBased,2);
    assert(!JSON.stringify(publicData).includes('PRIVATE_SYNTH'));
  } finally {
    rmSync(sourceDir,{recursive:true,force:true});
    if(outputDir)rmSync(outputDir,{recursive:true,force:true});
  }
});


// These extra cases are deliberate independent regression oracles for #188,
// not copies of the producer's 11 earlier positive-case fixtures.
function rewriteRigidI13(bytes, elementIndex, token) {
  const candidate = Buffer.from(bytes);
  const ref = inspect(bytes, elementIndex).rigidAssociation.pointerByteSpan;
  const replacement = String(token).padStart(13);
  assert.equal(Buffer.byteLength(replacement), 13);
  candidate.write(replacement, ref.start, 13, 'ascii');
  return candidate;
}

function runCli(input, ordinal = '1') {
  const cli = fileURLToPath(new URL('../tools/ciifr-wbs4/five-field-cli.mjs', import.meta.url));
  return spawnSync(process.execPath, [cli, input, ordinal], {encoding:'utf8'});
}

test('F2 selected I13 pointer disallows decimal or exponent, not just noninteger values', () => {
  const bytes = makeCii({pointers:[1,1]});
  for (const invalid of ['1.0','1E0','+1.000','01E+0']) {
    const candidate = rewriteRigidI13(bytes, 1, invalid);
    assert.throws(() => inspect(candidate,1), /^Error: FIVE_FIELD_RIGID_POINTER_I13$/);
  }
  assert.equal(inspect(bytes, 1).rigidAssociation.pointerValue,1);
});

test('F2 poisoned unselected shared owner is rejected before selected association', () => {
  const bytes=makeCii({pointers:[1,1]});
  for(const malformed of ['1.0','1E0']) {
    const candidate=rewriteRigidI13(bytes,0,malformed);
    assert.throws(() => inspect(candidate,1),/FIVE_FIELD_RIGID_POINTER_I13/);
  }
  assert.deepEqual(inspect(bytes,1).rigidAssociation.owners,[0,1]);
});

test('F2 source integral zero / signed integral value preserve legitimate absent/present', () => {
  const bytes=makeCii({pointers:[0,1]});
  const plus=rewriteRigidI13(bytes,1,'+1');
  const zero=rewriteRigidI13(bytes,0,'0');
  assert.equal(inspect(plus,1).rigidAssociation.pointerValue,1);
  assert.equal(inspect(zero,0).rigidAssociation.association,'ABSENT');
  assert.match(inspect(plus,1).rigidAssociation.pointerLexeme,/\+1$/);
});

test('F1 all public CLI error paths redact private paths, pointer tokens and coordinates', () => {
  const temp=mkdtempSync(join(tmpdir(),'ciifr-private-reject-'));
  try {
    const privateName='DO_NOT_LOG_PRIVATE_MODEL_PATH_978321.CII';
    const missing=join(temp,privateName);
    const invalidPointer=join(temp,'DO_NOT_LOG_RIGID_POINTER_92761.CII');
    const invalidLexeme=join(temp,'DO_NOT_LOG_I13_1E0.CII');
    const malformed=join(temp,'DO_NOT_LOG_BAD_SECTIONS.CII');
    writeFileSync(invalidPointer,makeCii({pointers:[92761,1]}));
    writeFileSync(invalidLexeme,rewriteRigidI13(makeCii({pointers:[1,1]}),0,'1E0'));
    writeFileSync(malformed,'CUSTOMER_PRIVATE_SECTION_CONTENT_NOT_VALID');
    const attempts=[runCli(missing),runCli(invalidPointer),runCli(invalidLexeme),
      runCli(malformed),runCli(invalidLexeme,'700'),runCli(missing,'BAD_PRIVATE_ARGUMENT')];
    for (const result of attempts) {
      assert.equal(result.status,1);
      assert.equal(result.stdout,'');
      assert.equal(result.stderr.trim(),'FIVE_FIELD_INSPECTOR_ERROR=SOURCE_REJECTED');
      for (const secret of [privateName,'DO_NOT_LOG_','pointer=92761','byteStart=',
        'element=','1E0','978321','700','CUSTOMER_PRIVATE']) {
        assert(!result.stderr.includes(secret),'leaked synthetic marker: '+secret);
      }
    }
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('independent serialized endpoint/occurrence oracle catches seeded FROM +1', () => {
  for (const index of [0,1]) {
    const original=makeCii({pointers:[0,1]});
    const report=inspect(original,index);
    assert.equal(report.occurrence.indexZeroBased,index);
    assert.equal(report.occurrence.ordinalOneBased,index+1);
    assert.equal(report.occurrence.fromNode,901234);
    assert.equal(report.occurrence.toNode,901235);
    assert.equal(report.rigidAssociation.pointerValue,index===0?0:1);
    // Separate physical source oracle: find ELEMENTS then skip exactly 15 rows/occurrence.
    const lines=Buffer.from(original).toString('ascii').split('\r\n');
    const first=lines.indexOf('#$ ELEMENTS')+1+15*index;
    assert.equal(Number(lines[first].slice(2,15).trim()),report.occurrence.fromNode);
    assert.equal(Number(lines[first].slice(15,28).trim()),report.occurrence.toNode);
  }
});

test('CLI uses the platform temporary root with space-containing paths and cleanable outputs', () => {
  const tmp=mkdtempSync(join(tmpdir(),'private source with spaces-'));
  const outputRoot=join(tmp,'custom temporary root');
  let resultPath;
  try {
    mkdirSync(outputRoot);
    const source=join(tmp,'private model with spaces.CII');
    writeFileSync(source,makeCii());
    const cli=fileURLToPath(new URL('../tools/ciifr-wbs4/five-field-cli.mjs',import.meta.url));
    const tempEnv=process.platform==='win32'?{TEMP:outputRoot,TMP:tmp,TMPDIR:tmp}:
      {TMPDIR:outputRoot,TMP:tmp,TEMP:tmp};
    const options={encoding:'utf8',env:{...process.env,...tempEnv}};
    const probe=spawnSync(process.execPath,['-p',"require('node:os').tmpdir()"],options);
    assert.equal(probe.status,0,probe.stderr);
    assert.equal(probe.stdout.trim(),outputRoot);
    const result=spawnSync(process.execPath,[cli,source,'2'],options);
    assert.equal(result.status,0,result.stderr);
    assert.equal(result.stderr,'');
    assert(result.stdout.trim().startsWith('LOCAL_ONLY_DIRECTORY='+join(outputRoot,'ciifr-five-field-')));
    resultPath=result.stdout.trim().slice('LOCAL_ONLY_DIRECTORY='.length);
    assert.equal(JSON.parse(readFileSync(join(resultPath,'private-report.json'),'utf8')).occurrence.ordinalOneBased,2);
    const publicData=JSON.parse(readFileSync(join(resultPath,'public-summary.json'),'utf8'));
    assert.equal(publicData.classification,'PUBLIC_SAFE_NO_MODEL_DATA');
    assert.equal(publicData.transferAuthority,'NONE');
    rmSync(resultPath,{recursive:true});resultPath=undefined;
    assert.deepEqual(readdirSync(outputRoot),[]);
  } finally { if(resultPath)rmSync(resultPath,{recursive:true,force:true});rmSync(tmp,{recursive:true,force:true}); }
});
