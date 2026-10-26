import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
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

test('CLI makes private 0600 report in local temp folder and distinct safe summary', () => {
  const sourceDir=mkdtempSync(join(tmpdir(),'ciifr-five-field-input-'));
  let outputDir;
  try {
    const input=join(sourceDir,'sample.CII');writeFileSync(input,makeCii());
    const cli=new URL('../tools/ciifr-wbs4/five-field-cli.mjs',import.meta.url).pathname;
    const stdout=execFileSync(process.execPath,[cli,input,'2'],{encoding:'utf8'}).trim();
    assert.match(stdout,/^LOCAL_ONLY_DIRECTORY=\/tmp\/ciifr-five-field-/);
    outputDir=stdout.slice('LOCAL_ONLY_DIRECTORY='.length);
    const privateFile=join(outputDir,'private-report.json');
    const publicFile=join(outputDir,'public-summary.json');
    assert.equal(statSync(privateFile).mode&0o777,0o600);
    const privateData=JSON.parse(readFileSync(privateFile,'utf8'));
    const publicData=JSON.parse(readFileSync(publicFile,'utf8'));
    assert.equal(privateData.occurrence.ordinalOneBased,2);
    assert(!JSON.stringify(publicData).includes('PRIVATE_SYNTH'));
  } finally {
    rmSync(sourceDir,{recursive:true,force:true});
    if(outputDir)rmSync(outputDir,{recursive:true,force:true});
  }
});
