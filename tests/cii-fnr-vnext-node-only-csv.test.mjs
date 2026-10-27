import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { sha256 } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { parseNodalCsv, planNodalTransfer, validateNodalTransfer }
  from '../tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js';

const row = values => values.map((v,i) => String(v).padStart(i ? 13 : 15)).join('');
const elem = (from,to,pointer) => Array.from({ length: 15 }, (_,i) =>
  i===0 ? row([from,to,100,0,0,0]) :
  i===13 ? row([0,0,0,0,0,pointer]) : row([0,0,0,0,0,0]));
const name = (from,to) => '  '+from.padEnd(26)+to.padEnd(25);
const fixture = () => new Uint8Array(Buffer.from([
  '#$ VERSION',row([5,14,1252]),
  '#$ CONTROL',row([4,0,0,2,0,0]),
  '#$ ELEMENTS',...elem(280,285,1),...elem(285,290,2),
  ...elem(560,565,0),...elem(565,570,0),
  '#$ NODENAME',name('','PS02393.1'),name('PS02393.1',''),
  '#$ BEND',row([1,2,3,4,5,6])
].join('\r\n')+'\r\n','ascii'));

test('F1: Node and Replace are the only mandatory CSV columns', () => {
  const only = parseNodalCsv('Node,Replace\n285,SL-173.11\n565,PS-T1\n');
  assert.deepEqual(only.map(r => [r.findInfo,r.findNode,r.replaceName]), [
    ['','285','SL-173.11'],['','565','PS-T1']
  ]);
  const reordered = parseNodalCsv(' Replace , Find (Info only) , Node \nSL-173.11,WRONG,285');
  assert.deepEqual([reordered[0].findInfo,reordered[0].findNode,reordered[0].replaceName],
    ['WRONG','285','SL-173.11']);
  const aliases = parseNodalCsv('\uFEFFFind (Info only),FindNode,ReplaceName\n,565,PS-T1');
  assert.equal(aliases[0].findNode,'565');
  assert.equal(aliases[0].findInfo,'');
});

test('F1: missing required headers, ambiguous headers and malformed CSV fail closed', () => {
  for (const csv of [
    'Find,Replace\nOLD,NAME',
    'Find,Node\nOLD,285',
    'Node,FindNode,Replace\n285,285,NAME',
    'Node,Replace,ReplaceName\n285,NAME,NAME',
    'Node,Replace\n285,NAME,EXTRA',
    'Node,Replace\n285',
    'Node,Replace\n285,"unterminated',
    'Node,,Replace\n285,unused,NAME'
  ]) assert.throws(() => parseNodalCsv(csv), /NODAL_CSV_/);
  const quoted = parseNodalCsv('Find,Node,Replace\n"OLD,INFO",285,RENAMED');
  assert.equal(quoted[0].findInfo,'OLD,INFO');
});

test('F1: optional Find mismatch affects audit only; TARGET1 bytes are identical', async () => {
  const bytes = fixture(), parsed = parseCii(bytes), originalHash = await sha256(bytes);
  const minimal = planNodalTransfer(parsed,parseNodalCsv(
    'Node,Replace\n285,SL-173.11\n565,PS-T1'));
  const optional = planNodalTransfer(parsed,parseNodalCsv(
    'Find,Node,Replace\nWRONG,285,SL-173.11\n,565,PS-T1'));
  const legacy = planNodalTransfer(parsed,parseNodalCsv(
    'Find (Info only),FindNode,ReplaceName\nWRONG,285,SL-173.11\n,565,PS-T1'));
  assert.equal(minimal.records[0].status,'READY');
  assert.equal(minimal.records[0].infoMismatch,false);
  assert.equal(optional.records[0].infoMismatch,true);
  assert.equal(legacy.records[0].infoMismatch,true);
  for (const p of [optional,legacy]) {
    assert.deepEqual(p.records.map(r=>[r.node,r.requestedName,r.status,r.writeFields,r.createRecords]),
      minimal.records.map(r=>[r.node,r.requestedName,r.status,r.writeFields,r.createRecords]));
  }
  const writes = [];
  for (const plan of [minimal,optional,legacy]) {
    writes.push(await validateNodalTransfer({
      targetBytes:bytes,originalHash,plan,approvedIds:['N1','N2']
    }));
  }
  for (const result of writes.slice(1)) {
    assert.equal(result.target1Hash,writes[0].target1Hash);
    assert.deepEqual(result.bytes,writes[0].bytes);
  }
  assert.equal(await sha256(bytes),originalHash,'TARGET0 is immutable');
});
