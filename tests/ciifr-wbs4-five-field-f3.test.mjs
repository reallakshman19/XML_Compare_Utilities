import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectFiveFieldEvidence, publicFiveFieldSummary } from '../tools/ciifr-wbs4/five-field-evidence.mjs';
const row = (values=[],count=6) => '  '+Array.from({length:count},(_,i)=>String(values[i]??0).padStart(13)).join('');
const label = value => '       '+String(value.length).padStart(5)+' '+value;
const branches=['/SYNTHETIC_BRANCH_A_00000','/SYNTHETIC_BRANCH_B_00000','/SYNTHETIC_BRANCH_C_00000'];
function original(newline='\r\n') {
  const element=(pointer, branch) => {
    const rows=Array.from({length:9},(_,j)=>row(j===0?[736291,736292]:j===1?[0,0,0,'-0.0000E+00']:[],j===8?5:6));
    return [...rows,label('SYNTH_NAME'),label(branch),row([],2),row([0,pointer]),row(),row([],3)];
  };
  const lines=['#$ VERSION','    5.00000      14.0000        1256','#$ CONTROL',row([3]),row([0,1]),row(),row([],1),'#$ ELEMENTS', ...element(1,branches[0]),...element(0,branches[1]),...element(1,branches[2]),'#$ RIGID',row(['-0.0000E+00','2E+00'],2)];
  // pointer first group is the second auxiliary field in physical pointer row 13.
  const starts=[];let p=0;for(const line of lines){starts.push(p);p+=Buffer.byteLength(line,'latin1')+Buffer.byteLength(newline)}
  return {bytes:Buffer.from(lines.join(newline)+newline,'latin1'), pointerOffsets:[0,1,2].map(i=>starts[8+15*i+12]+15), branchOffsets:[0,1,2].map(i=>starts[8+15*i+10]+13), newline};
}
function mutate(raw,index,token) {
  const bytes=Buffer.from(raw.bytes);const loc=raw.pointerOffsets[index];
  const enc=token instanceof Uint8Array?Buffer.from(token):Buffer.from(String(token).padStart(13),'latin1');
  assert.equal(enc.length,13);
  enc.copy(bytes,loc);return bytes;
}
function witness(bytes,index,newline) {
  const report=inspectFiveFieldEvidence(bytes,{elementIndex:index});
  const start=Buffer.from(bytes).indexOf(Buffer.from('#$ ELEMENTS'+newline,'latin1'))+('#$ ELEMENTS'+newline).length;
  const rows=Buffer.from(bytes).subarray(start).toString('latin1').split(newline);
  const nameRow=rows[index*15+10];
  const expected=nameRow.slice(13);
  assert.equal(report.occurrence.branchLabel.value,expected);
  const span=report.occurrence.branchLabel;
  assert.equal(Buffer.from(bytes).subarray(span.byteStart,span.byteEnd).toString('latin1'),expected);
  return report;
}
for(const newline of ['\n','\r\n']) {
  test('F3 wrong I13 whitespace selected/unselected '+JSON.stringify(newline),()=>{
    const raw=original(newline);
    for(const bad of [9,160,11,12,0,127,10]) {
      const positions=[
        Buffer.concat([Buffer.alloc(11,32),Buffer.from([bad,49])]),
        Buffer.concat([Buffer.alloc(11,32),Buffer.from([49,bad])]),
      ];
      for(const lex of positions) for(const owner of [0,2]) {
        const clone=mutate(raw,owner,lex);const h=createHash('sha256').update(clone).digest('hex');
        for(const selected of [owner,owner===0?2:0]) {
          assert.throws(()=>inspectFiveFieldEvidence(clone,{elementIndex:selected}),
            (bad===9||bad===160) ? /FIVE_FIELD_RIGID_POINTER_I13/ : /FIVE_FIELD_|WBS4_/);
        }
        assert.equal(createHash('sha256').update(clone).digest('hex'),h);
      }
    }
    for(const bad of ['1.0','1E0'])for(const owner of [0,2])assert.throws(()=>inspectFiveFieldEvidence(mutate(raw,owner,bad),{elementIndex:1}),/FIVE_FIELD_RIGID_POINTER_I13/);
  });
  test('F3 positive/source immutability/whitelist '+JSON.stringify(newline),()=>{
    const raw=original(newline),h=createHash('sha256').update(raw.bytes).digest('hex');
    const absent=inspectFiveFieldEvidence(raw.bytes,{elementIndex:1});
    assert.equal(absent.rigidAssociation.association,'ABSENT');
    const attached=inspectFiveFieldEvidence(raw.bytes,{elementIndex:2});
    assert.equal(attached.rigidAssociation.association,'PRESENT');
    assert.deepEqual(attached.rigidAssociation.owners,[0,2]);
    assert(Object.is(attached.fields.find(f=>f.field==='RIGID.WEIGHT').source.numericValue,-0));
    const signed=inspectFiveFieldEvidence(mutate(raw,2,'+1'),{elementIndex:2});
    assert.equal(signed.rigidAssociation.pointerValue,1);
    assert.equal(inspectFiveFieldEvidence(mutate(raw,1,'0'),{elementIndex:1}).rigidAssociation.association,'ABSENT');
    assert(attached.fields.every(f=>f.effective==='EFFECTIVE_UNKNOWN'));
    const pub=JSON.stringify(publicFiveFieldSummary(attached));
    assert(!pub.includes('SYNTHETIC_BRANCH')&&!pub.includes('736291')&&!pub.includes(h));
    assert.equal(createHash('sha256').update(raw.bytes).digest('hex'),h);
  });
  test('independent branch source oracle detects wrong label '+JSON.stringify(newline),()=>{
    const raw=original(newline);
    for(let index=0;index<3;index++){
      const report=witness(raw.bytes,index,newline);
      assert.equal(report.occurrence.branchLabel.value,branches[index]);
      assert.equal(report.occurrence.fromNode,736291);
      assert.equal(report.occurrence.toNode,736292);
    }
    // The plausible wrong-label mutation simulates an implementation reporting first-branch for all.
    assert.throws(()=>assert.equal(branches[0],witness(raw.bytes,1,newline).occurrence.branchLabel.value),assert.AssertionError);
  });
}
test('F1 rejected CLI source-neutral stderr from actual source',()=>{
  const raw=original(),t=mkdtempSync(join(tmpdir(),'F3_PRIVATE_SYNTH-'));
  try { const path=join(t,'SYNTH_ONLY_MARKER.CII');writeFileSync(path,mutate(raw,0,Buffer.concat([Buffer.alloc(11,32),Buffer.from([9,49])])));
    const cli=fileURLToPath(new URL('../tools/ciifr-wbs4/five-field-cli.mjs',import.meta.url));
    const result=spawnSync(process.execPath,[cli,path,'3'],{encoding:'utf8'});
    assert.equal(result.status,1);assert.equal(result.stdout,'');
    assert.equal(result.stderr.trim(),'FIVE_FIELD_INSPECTOR_ERROR=SOURCE_REJECTED');
  } finally {rmSync(t,{recursive:true,force:true})}
});
