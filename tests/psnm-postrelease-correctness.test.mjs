import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PSNM_CORE_TEST } from '../tabs/psnm-utility-tab-v6.js';
import { psnmMakeAxisTransform, psnmTransformNodeToPs } from '../tabs/psnm-utility/psnm-axis-transform-core.js';
import { PSNM_transformNodeToPsPosition } from '../tabs/psnm-utility/psnm-match-engine.js';
import { PSNM_previewMasterTransformRows } from '../tabs/psnm-utility/psnm-transform-preview-core.js';

globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };

function rotatedFixture() {
  const state = PSNM_CORE_TEST.makeState();
  state.masterReady = true;
  state.sourceDirty = false;
  const points = [
    { name: 'PS-A', e: 21000, u: 101000, s: 7500, x: 2500, y: 1000, z: 1000 },
    { name: 'PS-B', e: 24500, u: 108000, s: 9900, x: 4900, y: 8000, z: 4500 },
    { name: 'PS-C', e: 32200, u: 112500, s: 12000, x: 7000, y: 12500, z: 12200 },
  ];
  state.master.psRows = points.map((p, i) => ({
    rowId: 'p' + i, psName: p.name, positionRaw: 'E ' + p.e + ' U ' + p.u + ' S ' + p.s,
    psE: p.e, psU: p.u, psS: p.s, p1bore: 150, status: 'OK', enabled: true,
  }));
  state.master.nodeRows = points.map((p, i) => ({
    rowId: 'n' + i, node: String(i + 1), occurrenceId: 'n#' + i,
    rawX: p.x, rawY: p.y, rawZ: p.z, finalNodeBore: 150, status: 'OK', enabled: true,
  }));
  PSNM_CORE_TEST.ensureAnchors(state);
  const transform = psnmMakeAxisTransform(
    { e: points[0].e, u: points[0].u, s: points[0].s },
    { x: points[0].x, y: points[0].y, z: points[0].z },
    ['z','y','x'], { e: 1, u: 1, s: 1 });
  return { state, transform, points };
}

test('missing and nonpositive bores never score as a PASS', () => {
  const testBore = PSNM_CORE_TEST.boreRelation;
  assert.equal(testBore({p1bore:null},{finalNodeBore:null}), 'MISSING');
  assert.equal(testBore({p1bore:''},{finalNodeBore:150}), 'MISSING');
  assert.equal(testBore({p1bore:150},{finalNodeBore:null}), 'MISSING');
  assert.equal(testBore({p1bore:0},{finalNodeBore:150}), 'MISSING');
  assert.equal(testBore({p1bore:150},{finalNodeBore:150}), 'PASS');
  assert.equal(testBore({p1bore:150},{finalNodeBore:200}), 'CONFLICT');
});

test('zero decimal coordinate rounding is honored by the match engine', () => {
  const result = PSNM_transformNodeToPsPosition(
    {x:12.345,y:25.6,z:10.1}, {datumE:0,datumU:0,datumS:0}, 0);
  assert.deepEqual(result, {e:12,u:26,s:10});
  assert.equal(PSNM_transformNodeToPsPosition({x:12.345,y:0,z:0}, {}, 2).e, 12.35);
});

test('a saved rotated axis transform restores into native state only if anchored to current Masters', () => {
  const {state,transform} = rotatedFixture();
  const payload = { psRowId:'p0',nodeRowId:'n0',axisTransform:transform };
  assert.equal(PSNM_CORE_TEST.restorePersistedAnchor(state,payload), true);
  assert.deepEqual(state.setup.anchorTransform.axes, {e:'z',u:'y',s:'x'});
  assert.deepEqual(psnmTransformNodeToPs({x:2500,y:1000,z:1000},state.setup.anchorTransform),
    {e:21000,u:101000,s:7500});
  const changed = { ...transform, offsets: { ...transform.offsets, e:transform.offsets.e+250 } };
  assert.equal(PSNM_CORE_TEST.restorePersistedAnchor(state,{...payload,axisTransform:changed}), false);
  assert.equal(PSNM_CORE_TEST.restorePersistedAnchor(state,{...payload,nodeRowId:'wrong'}), false);
  assert.deepEqual(state.setup.anchorTransform.offsets, transform.offsets);
});

test('preview uses same rotated Master transform as the matching engine and excludes raw-only rows', () => {
  const {state,transform,points} = rotatedFixture();
  const context = {
    masterReady:true, transform,
    masterRows:state.master.nodeRows.map(x=>({node:x.node,x:x.rawX,y:x.rawY,z:x.rawZ})),
  };
  const rows = PSNM_previewMasterTransformRows(context);
  assert.equal(rows.length,3);
  rows.forEach((row,i)=>assert.deepEqual(row.transformed,
    {e:points[i].e,u:points[i].u,s:points[i].s}));
  assert.equal(PSNM_previewMasterTransformRows({...context,masterReady:false}).length,0);
  assert.equal(PSNM_previewMasterTransformRows(context,1).length,1);
});

test('result invalidation clears rows and bumps revision after an input change', () => {
  const s=PSNM_CORE_TEST.makeState();
  s.result={rows:[{psName:'OLD'}],candidateRows:[{node:1}],mandatoryPsCoverageRows:[{}],
    mandatoryCoverageRows:[{}],userLog:[],debugLog:[]};
  s.resultStale=false;s.resultCalculated=true;
  PSNM_CORE_TEST.invalidateResults(s);
  assert.equal(s.runRevision,1);
  assert.equal(s.resultStale,true);
  assert.equal(s.resultCalculated,false);
  assert.equal(s.result.rows.length,0);
  assert.equal(s.result.candidateRows.length,0);
});

test('choosing a different Auto Anchor pair invalidates earlier matched results', () => {
  const {state,transform}=rotatedFixture();
  state.result.rows=[{psName:'OLD'}];
  state.resultStale=false;
  state.resultCalculated=true;
  state.autoAnchor.pairs=[{psRowId:'p0',nodeRowId:'n0',psName:'PS-A',node:'1',confidence:'HIGH',confidenceScore:99,transform}];
  PSNM_CORE_TEST.applyAutoAnchorPair(state,0);
  assert.equal(state.resultStale,true);
  assert.equal(state.result.rows.length,0);
  assert.deepEqual(state.setup.anchorTransform.axes, {e:'z',u:'y',s:'x'});
});

test('cooperative anchor ranking yields identical selections and supports cancellation', async () => {
  const {state}=rotatedFixture();
  PSNM_CORE_TEST.runAutoAnchorSearch(state);
  const baseline=state.autoAnchor.pairs.map(x=>[x.psRowId,x.nodeRowId,x.confidenceScore,x.score]);
  const asyncState=rotatedFixture().state;
  let updates=0;
  assert.equal(await PSNM_CORE_TEST.runAutoAnchorSearchCooperative(asyncState,()=>false,()=>updates++),true);
  assert.deepEqual(asyncState.autoAnchor.pairs.map(x=>[x.psRowId,x.nodeRowId,x.confidenceScore,x.score]),baseline);
  assert.ok(updates>0);
  const cancelled=rotatedFixture().state;
  let shouldStop=false;
  const ok=await PSNM_CORE_TEST.runAutoAnchorSearchCooperative(cancelled,()=>shouldStop,()=>{shouldStop=true});
  assert.equal(ok,false);
  assert.equal(cancelled.autoAnchor.pairs.length,0);
});

test('app and GitHub Pages copies of all changed modules are identical', () => {
  for (const p of [
    'psnm-utility-tab-v6.js',
    'psnm-utility/psnm-match-engine.js',
    'psnm-utility/psnm-anchor-persistence-addon.js',
    'psnm-utility/psnm-transform-preview-core.js',
    'psnm-utility/psnm-lite-persistence-transform-preview.js',
  ]) {
    const src=readFileSync(new URL('../tabs/'+p,import.meta.url),'utf8');
    const docs=readFileSync(new URL('../docs/tabs/'+p,import.meta.url),'utf8');
    assert.equal(src,docs,p);
  }
});
