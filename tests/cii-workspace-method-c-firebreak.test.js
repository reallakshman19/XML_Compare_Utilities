import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { graphFromSegments } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import { methodCSvgScene } from '../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import { methodCEvidence } from '../tabs/cii-workspace/cii-workspace-method-c-exports.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceFiles = [
  'cii-workspace-method-c-original-geometry.js','cii-workspace-method-c-rigid-fit.js',
  'cii-workspace-method-c-registration.js','cii-workspace-method-c-candidates.js',
  'cii-workspace-method-c-svg.js','cii-workspace-method-c-exports.js',
  'cii-workspace-method-c-ui.js','cii-workspace-method-c-native-adapter.js',
  'cii-workspace-method-c-tile.js',
];
const allowedPath=path=>/^(?:tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)|tabs\/cii-workspace\/cii-workspace-tab\.js|docs\/tabs\/cii-workspace\/cii-workspace-tab\.js|docs\/tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)|tests\/cii-workspace-method-c-[a-z-]+\.test\.js|tests\/fixtures\/cii-method-c\/[a-z0-9.-]+\.json|\.github\/workflows\/cii-method-c-wp2\.yml|docs\/METHOD_C_ENGINEERING\.md|docs\/METHOD_C_G2_REVIEW_(?:PACKET\.md|STATUS\.json)|agents\/WIP-method-c-geometry-review_workreport\.md|plans\/V36-108-PLAN-01\.yaml|agents\/(?:PR119_workreport|WIP-G3-MC-20261017_workreport)\.md)$/.test(path);
// Owner's 2026-10-17 exact two-test repair scope. Do not promote either
// test path to allowedPath(), which intentionally forbids unrelated writer edits.
const approvedProtectedTestBlob=Object.freeze({
  'tests/cii-workspace-multi-base-correspondence.test.js':'3a92e20b49d5383b9d6b45191c53b752eed623e7',
  'tests/cii-workspace-writer2-product-routing.test.js':'e84aa89035d449bca47fc8aca415efdaa4d53656',
});
const node=(id,xyz)=>({id:String(id),xyz,component:0,incident:[],od:273,wall:20});

test('WP7 red: Method C owned modules have no Writer2 imports, mutation/export grants or native Apply controls',()=>{
  for(const file of sourceFiles){
    const text=readFileSync(new URL('../tabs/cii-workspace/'+file,import.meta.url),'utf8');
    const imports=[...text.matchAll(/(?:^|\n)\s*(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
    assert.ok(imports.every(s=>!/(?:writer2|target-writer|mutation-plan|writer-version-bridge|writer-composite-routing)/i.test(s)),
      file+': forbidden direct Writer2/writer route');
    assert.doesNotMatch(text,/\b(?:applyCii(?:WorkspaceTargetWriter|Writer2Composite|TargetWriter|WriterComposite)\w*|ciiWriter2CompositeReadiness)\s*\(/,
      file+': direct Writer2 apply or readiness invocation');
    assert.doesNotMatch(text,/\bdata-ciiw-(?:apply-target|accept-high|accept-medium)\b/,
      file+': forbidden host Writer approval/apply controls');
  }
});
test('WP7 red: even synthetically perfectly fitted 3D anchors cannot authorize physical identity or Writer2',()=>{
  const source=graphFromSegments({member:'A',sha256:'a'.repeat(64),
    nodes:[node(10,[0,0,0]),node(20,[100,0,0]),node(30,[0,100,0]),node(40,[0,0,100])],edges:[]});
  const target=graphFromSegments({member:'B',sha256:'b'.repeat(64),
    nodes:[node(110,[4,6,8]),node(120,[104,6,8]),node(130,[4,106,8]),node(140,[4,6,108])],edges:[]});
  const anchors=[[10,110],[20,120],[30,130],[40,140]].map(([s,t])=>
    ({source:String(s),target:String(t),sourceSha:source.sha256,targetSha:target.sha256,
      role:'independently-accepted'}));
  const registration=registerMethodC(source,target,anchors);
  assert.equal(registration.qualified,false,'caller-controlled role cannot authenticate geometric fit');
  assert.equal(registration.identified,false);
  assert.equal(registration.numericFitAcceptable,true,'the geometry remains a valid numerical fit');
  assert.equal(registration.ownerAnchorAuthenticated,false);
  assert.equal(registration.writerEligible,false);
  const noRole=registerMethodC(source,target,anchors.map(({role,...rest})=>rest));
  assert.equal(noRole.qualified,false);
  assert.equal(noRole.identified,false);
  assert.equal(noRole.numericFitAcceptable,true);
  assert.deepEqual(noRole.rotation,registration.rotation,'roles must not influence geometric math');
  const candidates=findMethodCCandidates(source,target,registration);
  assert.equal(candidates.nearSourceCount,4);
  assert.equal(candidates.qualifiedIdentityCount,0);
  assert.ok(candidates.rows.every(r=>r.writerEligible===false&&r.physicalNodeCorrespondenceQualified===false));
  const scene=methodCSvgScene({source,target,transform:registration,candidates});
  const evidence=methodCEvidence({source,target,transform:registration,candidates,scene});
  assert.equal(evidence.registration.qualifiedForGeometricReview,false);
  assert.equal(evidence.registration.numericFitAcceptable,true);
  assert.equal(evidence.registration.ownerAnchorAuthenticated,false);
  assert.equal(evidence.qualifiedPhysicalIdentityCount,0);
  assert.equal(evidence.writerEligible,false);
  assert.ok(evidence.rows.every(r=>!r.writerEligible&&!r.physicalIdentityQualified));
});
test('WP7 red: scope policy rejects every existing shared/PR107 protected path, even without source changes',()=>{
  for(const forbidden of [
    'tabs/cii-workspace/cii-workspace-core.js',
    'tabs/cii-workspace/cii-workspace-multisource-review-only-router.js',
    'tabs/cii-workspace/cii-workspace-geometry.js',
    'tabs/cii-workspace/cii-workspace-target-writer.js',
    'Benchmark/S1.CII','Benchmark/T.CII',
    'tests/cii-workspace-writer2-product-routing.test.js',
  ])assert.equal(allowedPath(forbidden),false,'must reject '+forbidden);
  assert.equal(allowedPath('tabs/cii-workspace/cii-workspace-method-c-native-adapter.js'),true);
  assert.equal(allowedPath('tests/cii-workspace-method-c-firebreak.test.js'),true);
  assert.equal(allowedPath('tests/fixtures/cii-method-c/derived-reference-excerpt.v1.json'),true);
  assert.equal(allowedPath('tests/fixtures/cii-phase2/owner-phase2-original.txt'),false);
  assert.equal(allowedPath('docs/METHOD_C_G2_REVIEW_PACKET.md'),true);
  assert.equal(allowedPath('docs/METHOD_C_G2_REVIEW_STATUS.json'),true);
  assert.equal(allowedPath('docs/tabs/cii-workspace/cii-workspace-tab.js'),true);
});
test('WP7 actual diff boundary: candidate branch does not edit PR107/shared/fixtures',()=>{
  const base=process.env.CII_METHOD_C_BASE || '3a7c34cd1b8f2f88b36e55503a96378406ea0c71';
  const names=execFileSync('git',['diff','--name-only',base,'HEAD'],{cwd:repoRoot,encoding:'utf8'})
    .trim().split('\n').filter(Boolean);
  assert.ok(names.length>0,'actual committed scope must be inspectable');
  const approved=(name)=>approvedProtectedTestBlob[name]&&
    execFileSync('git',['rev-parse','HEAD:'+name],{cwd:repoRoot,encoding:'utf8'}).trim()===approvedProtectedTestBlob[name];
  assert.deepEqual(names.filter(name=>!allowedPath(name)&&!approved(name)),[],
    'UNAUTHORIZED_SHARED_PATH_IN_METHOD_C_PR_DIFF');
});

test('WP7 exact Owner grant: native tabs and deploy mirror only add read-only tile mount and cleanup',()=>{
 const base='3a7c34cd1b8f2f88b36e55503a96378406ea0c71';
 const rel='tabs/cii-workspace/cii-workspace-tab.js';
 const old=execFileSync('git',['show',base+':'+rel],{cwd:repoRoot,encoding:'utf8'});
 const newImport="import { installMethodCReviewTile } from './cii-workspace-method-c-tile.js';\n";
 const patch=old.replace(
  "import { mountCiiFindReplaceShell } from './cii-workspace-find-replace-ui.js?v=20260904-padded-find-scroll-1';\n",
  "import { mountCiiFindReplaceShell } from './cii-workspace-find-replace-ui.js?v=20260904-padded-find-scroll-1';\n"+newImport
 ).replace(
  "  if (findReplaceTile) container.appendChild(findReplaceTile);\n",
  "  if (findReplaceTile) container.appendChild(findReplaceTile);\n"+
  "  const methodCTile = installMethodCReviewTile(container, context.methodC || {});\n"
 ).replace(
  "    close(); tile.remove(); writer2Tile?.remove(); findReplaceTile?.remove();\n",
  "    methodCTile.destroy();\n"+
  "    close(); tile.remove(); writer2Tile?.remove(); findReplaceTile?.remove();\n"
 );
 assert.notEqual(patch,old,'grant hunk must actually be installed');
 assert.equal(readFileSync(new URL('../'+rel,import.meta.url),'utf8'),patch);
 assert.equal(readFileSync(new URL('../docs/'+rel,import.meta.url),'utf8'),patch);
 for(const name of sourceFiles){
  const src=readFileSync(new URL('../tabs/cii-workspace/'+name,import.meta.url));
  const deploy=readFileSync(new URL('../docs/tabs/cii-workspace/'+name,import.meta.url));
  assert.deepEqual(deploy,src,'docs must deploy exactly the owned source bytes '+name);
 }
});
