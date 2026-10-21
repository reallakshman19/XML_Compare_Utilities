// [SIMULATED] Original test expectations are specified here, not derived from planner output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planLineNodeRules } from '../tabs/cii-workspace/cii-fnr-vnext/line-node/index.js';
import { sha256Hex } from '../tabs/cii-workspace/cii-fnr-vnext/line-node/bytes.js';
const enc = new TextEncoder();

function element(from,to,line,{pointer=0,width=35,linePrefix=null}={}) {
  const fmt = vals => vals.map((x,i)=>String(x).padStart(i?13:15,' ')).join('');
  const rows = Array.from({length:15},()=>fmt([0,0,0,0,0,0]));
  rows[0] = fmt([from,to,0,0,0,0]);
  rows[9] = '           0 ';
  rows[10] = linePrefix ?? (' '.repeat(7)+String(line.length).padStart(5)+' '+line.padEnd(width));
  rows[13] = fmt([0,0,0,0,0,pointer]);
  return rows;
}
function fixture(blocks, names, {eol='\n', version=14}={}) {
  const pairs = names.map(n=>'  '+n.from.padEnd(26,' ') + n.to.padEnd(25,' '));
  const lines = ['#$ VERSION','    5.00000      '+version+'.0000        1256',
    '#$ ELEMENTS',...blocks.flat(),'#$ NODENAME',...pairs,'#$ BEND'];
  return enc.encode(lines.join(eol)+eol);
}
const base = () => fixture([
  element(10,20,'PL-001/B2',{pointer:1}),
  element(20,30,'PL-001/B2',{pointer:2}),
  element(50,60,'OTHER/B2',{pointer:3}),
], [{from:'F-A',to:'X'}, {from:'X',to:'T-A'}, {from:'F-C',to:'T-C'}]);
function run(bytes,rules,options={},other={}) {
  return planLineNodeRules({tab:'LINE_NODE',targetBytes:bytes,
    originalTargetSha256:createHash('sha256').update(bytes).digest('hex'),
    rules,options,...other});
}
const literal = (value,replace) => ({mode:'literal',value,...replace===undefined?{}:{replace}});
const lineRule=(line,replace,id='line')=>({id,line:literal(line,replace)});
const nodeRule=(value,endpoint,replace,id='node')=>({id,node:{...literal(value,replace),endpoint}});
const proposed = plan=>plan.claims.filter(c=>c.status==='PROPOSED');
const code = (plan,name)=>plan.diagnostics.some(d=>d.code===name);

test('independent Node crypto SHA256 check, and frozen output',()=>{
  const bytes=base(), expect=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256Hex(bytes),expect);
  const p=run(bytes,[lineRule('PL-001/B2','PL-002/B2')]);
  assert.equal(p.targetSha256,expect);assert.equal(Object.isFrozen(p.claims[0].evidence),true);
  assert.equal(proposed(p).length,2);
  assert.equal(p.claims[0].after.length,p.claims[0].before.length);
  assert.equal(p.claims[0].byteEnd-p.claims[0].byteStart,p.claims[0].before.length);
  assert.match(p.claims[0].after,/^ {7} {4}9 PL-002\/B2 +$/);
  assert.notEqual(p.claims[0].before,p.claims[0].after);
});

test('shuffled complete blocks preserve semantic selection, not raw byte index',()=>{
  const a=base();const b=fixture([
    element(50,60,'OTHER/B2',{pointer:3}),
    element(20,30,'PL-001/B2',{pointer:2}),
    element(10,20,'PL-001/B2',{pointer:1}),
  ],[{from:'F-A',to:'X'},{from:'X',to:'T-A'},{from:'F-C',to:'T-C'}]);
  const rule=lineRule('PL-001/B2','PL-002/B2');
  const x=run(a,[rule]),y=run(b,[rule]);
  assert.deepEqual(x.claims.map(c=>c.status),['PROPOSED','PROPOSED']);
  assert.deepEqual(y.claims.map(c=>c.status),['PROPOSED','PROPOSED']);
  assert.notDeepEqual(x.claims.map(c=>c.byteStart).sort(),y.claims.map(c=>c.byteStart).sort());
  assert.deepEqual(y.claims.map(c=>c.evidence.fullLineIdentity),['PL-001/B2','PL-001/B2']);
});

test('consistently renumbered target IDs do not affect field matches',()=>{
  const renumbered=fixture([
    element(9010,9020,'PL-001/B2',{pointer:1}),
    element(9020,9030,'PL-001/B2',{pointer:2}),
    element(9050,9060,'OTHER/B2',{pointer:3}),
  ],[{from:'F-A',to:'X'},{from:'X',to:'T-A'},{from:'F-C',to:'T-C'}]);
  assert.equal(proposed(run(renumbered,[nodeRule('F-A','FROM','NEW')])).length,1);
  assert.equal(proposed(run(renumbered,[lineRule('PL-001/B2','PL-002/B2')])).length,2);
});

test('disconnected same full line HOLD, connected repetition allowed',()=>{
  const bytes=fixture([element(1,2,'DUP/B2'),element(2,3,'DUP/B2'),element(80,81,'DUP/B2')],[]);
  const p=run(bytes,[lineRule('DUP/B2','NEW/B2')]);
  assert.equal(proposed(p).length,0);
  assert.equal(p.claims.filter(c=>c.status==='HOLD').length,3);
  assert.ok(code(p,'DISCONNECTED_COMPETING_MATCHES'));
});

test('same /B2 suffix does not identify a full line',()=>{
  const p=run(base(),[lineRule('PL-001/B2','PL-002/B2')]);
  assert.equal(proposed(p).length,2);
  assert.equal(p.observations.filter(x=>x.outcome==='NO_MATCH').length,1);
  assert.equal(p.observations.at(-1).lineFamily.suffix,'B2');
});

test('blank 0 labels never match; malformed declared prefix refuses entire search',()=>{
  const blank=fixture([element(1,2,'',{pointer:1,width:0,linePrefix:'           0 '})],[{from:'F',to:'T'}]);
  const p=run(blank,[lineRule('DUP/B2','NEW/B2')]);
  assert.equal(p.claims.length,0);assert.equal(p.observations[1].lineState,'BLANK');
  const bad=fixture([element(1,2,'BAD',{linePrefix:'          10 BAD'})],[]);
  const q=run(bad,[lineRule('BAD','NEW')]);
  assert.equal(q.incompleteSearch,true);assert.ok(code(q,'LINE_LENGTH_INVALID'));
});

test('FROM versus TO exact Node Name selection distinguishes spans',()=>{
  const p=run(base(),[nodeRule('F-A','FROM','Z-F')]);
  assert.equal(proposed(p).length,1);
  assert.equal(p.claims[0].fieldIdentity,'NODENAME_FROM');
  assert.equal(p.claims[0].before.length,26);
  assert.equal(p.claims[0].after,'Z-F'.padEnd(26));
  const t=run(base(),[nodeRule('T-A','TO','Z-T')]);
  assert.equal(proposed(t).length,1);
  assert.equal(t.claims[0].fieldIdentity,'NODENAME_TO');
  assert.equal(t.claims[0].before.length,25);
  assert.notEqual(t.claims[0].byteStart,p.claims[0].byteStart);
});

test('shared pointer partial selection HOLD; all alias owners qualify one claim',()=>{
  const names=[{from:'COMMON',to:'SAME'}];
  const bytes=fixture([element(1,2,'ONE/B2',{pointer:1}),element(1,3,'TWO/B2',{pointer:1})],names);
  const selected=run(bytes,[{id:'alias',line:literal('ONE/B2'),node:{...literal('COMMON','NEW'),endpoint:'FROM'}}]);
  assert.equal(proposed(selected).length,0);assert.ok(code(selected,'SHARED_POINTER_PARTIAL_SCOPE'));
  assert.equal(selected.claims[0].evidence.aliasCount,2);
  const full=run(bytes,[nodeRule('COMMON','FROM','NEW')]);
  assert.equal(proposed(full).length,1);
  assert.equal(full.claims[0].evidence.aliasScopePreserved,true);
  assert.equal(full.claims[0].evidence.affectedRecords.length,2);
});

test('regex full field captures and updated prefix; invalid, unsafe and overflow HOLD',()=>{
  const bytes=base();const rule={id:'regexp',line:{mode:'regex',pattern:'^(PL)-(\\d{3})/B2$',flags:'i',replace:'$1-$2/B3'}};
  const p=run(bytes,[rule]);
  assert.equal(proposed(p).length,2);
  assert.deepEqual(p.claims[0].evidence.captures,['PL','001']);
  assert.ok(p.claims[0].after.includes('PL-001/B3'));
  const bad=run(bytes,[{id:'bad',line:{mode:'regex',pattern:'(',flags:'',replace:'x'}}]);
  assert.equal(bad.incompleteSearch,true);assert.ok(code(bad,'LINE_REGEX_INVALID'));
  const unsafe=run(bytes,[{id:'unsafe',line:{mode:'regex',pattern:'(a+)+$',flags:'',replace:'x'}}]);
  assert.ok(code(unsafe,'LINE_REGEX_UNSAFE_OR_FLAGS'));
  const over=run(bytes,[lineRule('PL-001/B2','LONG-REPLACEMENT-FIELD-THAT-OVERFLOWS-ALL-CAPACITY')]);
  assert.equal(over.claims.filter(c=>c.status==='HOLD').length,2);
  assert.ok(code(over,'LINE_REPLACEMENT_OVERFLOW'));
});

test('both selectors mandatory despite 70/30; failed side emits held claim',()=>{
  const l=run(base(),[{id:'lineGood',line:literal('PL-001/B2','PL-002/B2'),node:{...literal('ABSENT'),endpoint:'TO'}}]);
  assert.equal(proposed(l).length,0);assert.equal(l.claims.filter(c=>c.status==='HOLD').length,2);
  assert.equal(l.claims[0].evidence.score,70);assert.equal(l.claims[0].evidence.reason,'NODE_SELECTOR_FAILED');
  const n=run(base(),[{id:'nodeGood',line:literal('ABSENT'),node:{...literal('F-A','Z-F'),endpoint:'FROM'}}]);
  assert.equal(proposed(n).length,0);assert.equal(n.claims[0].status,'HOLD');
  assert.equal(n.claims[0].evidence.score,30);assert.equal(n.claims[0].evidence.reason,'LINE_SELECTOR_FAILED');
});

test('multi-node identities and competing rules HOLD/CONFLICT',()=>{
  const multi=fixture([element(1,2,'S/B2',{pointer:1}),element(2,3,'S/B2',{pointer:2})],
    [{from:'DUP',to:'A'},{from:'DUP',to:'B'}]);
  const result=run(multi,[nodeRule('DUP','FROM','NEW')]);
  assert.equal(proposed(result).length,0);assert.ok(code(result,'COMPETING_NODE_IDENTITIES'));
  const colliding=run(base(),[lineRule('PL-001/B2','NEW/B2','first'),lineRule('PL-001/B2','ALT/B2','second')]);
  assert.equal(proposed(colliding).length,0);
  assert.equal(colliding.claims.filter(c=>c.status==='CONFLICT').length,4);
  assert.ok(code(colliding,'OVERLAPPING_RULE_CLAIMS'));
});

test('byte spans, CRLF preservation, mismatch digest, unknown layouts',()=>{
  const bytes=fixture([element(1,2,'S/B2',{pointer:1,width:12})],[{from:'LEFT',to:'RIGHT'}],{eol:'\r\n',version:11});
  const p=run(bytes,[lineRule('S/B2','R/B2'),nodeRule('LEFT','FROM','CHANGED')]);
  assert.equal(proposed(p).length,2);assert.equal(p.incompleteSearch,false);
  for(const c of proposed(p)) {
    const raw=Buffer.from(bytes.subarray(c.byteStart,c.byteEnd)).toString('ascii');
    assert.equal(c.before,raw);assert.equal(c.after.length,c.before.length);
    assert.doesNotMatch(raw,/\r|\n/);
  }
  const mismatch=planLineNodeRules({tab:'LINE_NODE',targetBytes:bytes,originalTargetSha256:'0'.repeat(64),rules:[]});
  assert.equal(mismatch.incompleteSearch,true);assert.ok(code(mismatch,'TARGET0_SHA256_MISMATCH'));
  const unsupported=fixture([element(1,2,'S/B2')],[],{version:12});
  assert.ok(code(run(unsupported,[lineRule('S/B2','R/B2')]),'UNSUPPORTED_CII_VERSION'));
});

test('Node Name regex captures, independent flags, and width overflow',()=>{
  const rule={id:'nodeRegex',node:{mode:'regex',pattern:'^(f)-(a)$',flags:'i',endpoint:'FROM',replace:'$1-$2-2'}};
  const p=run(base(),[rule]);
  assert.equal(proposed(p).length,1);
  assert.equal(p.claims[0].after,'F-A-2'.padEnd(26));
  assert.deepEqual(p.claims[0].evidence.captures,['F','A']);
  const long=run(base(),[nodeRule('F-A','FROM','Z'.repeat(27))]);
  assert.equal(long.claims[0].status,'HOLD');assert.ok(code(long,'NODE_REPLACEMENT_OVERFLOW'));
  const unsafe=run(base(),[{id:'unsafeNode',node:{mode:'regex',pattern:'(a|aa)+',flags:'',endpoint:'FROM',replace:'Z'}}]);
  assert.ok(code(unsafe,'NODE_REGEX_UNSAFE_OR_FLAGS'));
});

test('full line family comparison is mandatory when requested; substring regex not full match',()=>{
  const p=run(base(),[{id:'fam',line:{...literal('PL-001/B2','PL-002/B2'),family:'OTHER'}}]);
  assert.equal(p.claims.length,0);
  assert.equal(p.observations.filter(o=>o.outcome==='NO_MATCH').length,3);
  const regex=run(base(),[{id:'partial',line:{mode:'regex',pattern:'B2',flags:'',replace:'B3'}}]);
  assert.equal(regex.claims.length,0);
});

test('shared pointer two distinct node identities held even with complete alias selection',()=>{
  const bytes=fixture([element(1,2,'L/B2',{pointer:1}),element(2,3,'L/B2',{pointer:1})],
    [{from:'SHARED',to:'OTHER'}]);
  const p=run(bytes,[nodeRule('SHARED','FROM','NEW')]);
  assert.equal(proposed(p).length,0);
  assert.ok(code(p,'COMPETING_NODE_IDENTITIES'));
});

test('tee connectivity and combined selector positive control',()=>{
  const bytes=fixture([element(1,2,'T/B2',{pointer:1}),element(2,3,'T/B2',{pointer:2}),
    element(2,4,'OTHER/B3',{pointer:3})],[{from:'F',to:'J'},{from:'J',to:'T'},
    {from:'J',to:'OUT'}]);
  const p=run(bytes,[{id:'joint',line:literal('T/B2','R/B2'),node:{...literal('T'),endpoint:'TO'}}]);
  assert.equal(proposed(p).length,1);
  assert.equal(proposed(p)[0].evidence.selectors.line.matched,true);
  assert.equal(proposed(p)[0].evidence.selectors.node.matched,true);
  assert.equal(proposed(p)[0].evidence.score,100);
});
