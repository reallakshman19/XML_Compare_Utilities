import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decodeCiiNumericRow } from '../parser/fixed-field.js';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { ciiPhysicalSectionRows } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { applyCiiWriter2CompositeWithRestraintDelete } from '../tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js';
import { createCiiWriter2V14LosslessShadow } from '../tabs/cii-workspace/cii-workspace-v14-writer2-shadow.js';
import { applyCiiWorkspaceTargetWriter2 } from '../tabs/cii-workspace/cii-workspace-core.js';
import { bindCiiTransferScopeToPreview, ciiTransferScopeCandidateOperations, createCiiTransferScopeSelection } from '../tabs/cii-workspace/cii-workspace-transfer-scope.js';
import { applyCiiWorkspaceTargetWriter2WithVersionBridge, createCiiWorkspacePreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';
import { ciiByteStringToBytes, ciiBytesEqual, ciiSha256, convertCiiNeutralVersionLossless, detectCiiNeutralVersion } from '../tabs/cii-workspace/cii-workspace-v11-v14-converter.js';

import fs from 'node:fs';
import { createCiiPhysicalFile } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { extractCiiNodeNameEvidence } from '../tabs/cii-workspace/cii-workspace-nodename.js';
import {
  applyCiiWriter2NodeNamePlanContract, ciiWriter2NodeNameReadiness,
} from '../tabs/cii-workspace/cii-workspace-writer2-routing.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';

const WIDTHS = [15, 13, 13, 13, 13, 13];
function numericRow(values) { return values.map((value, index) => String(value ?? 0).padStart(WIDTHS[index], ' ')).join(''); }
function elementBlock(from, to, pointer) {
  const rows = Array.from({ length: 15 }, () => numericRow([0, 0, 0, 0, 0, 0]));
  rows[0] = numericRow([from, to, 0, 0, 0, 100]);
  rows[13] = numericRow([0, 0, 0, 0, 0, pointer]);
  return rows;
}
function operation({ id, family = 'NODE_NAME', property = 'Node name / to-name', source = '', target = '', action = 'COPY', status = 'PREVIEW_READY', blockers = [], evidenceAuthority = 'CII_NODENAME_FIXED_LAYOUT' }) {
  return Object.freeze({
    operationId: id, family, property, action, status, blockers: Object.freeze(blockers), evidenceAuthority,
    sourceEvidence: Object.freeze({ identity: '20', value: source, authority: evidenceAuthority }),
    targetEvidence: Object.freeze({ identity: '20', value: target }), before: target, proposed: source,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function rawPlan(operations, blockers = []) {
  return Object.freeze({
    status: blockers.length ? 'BLOCKED' : 'PREVIEW_READY', blockers: Object.freeze(blockers),
    mutationAuthority: 'WRITER_1B_CONDITIONAL',
    sourceDocument: Object.freeze({ contentSha256: 'source' }), targetDocument: Object.freeze({ contentSha256: 'target' }),
    operations: Object.freeze(operations), policy: Object.freeze({ processDefault: 'WRITER_1B_EXACT_FIXED_FIELDS_ONLY' }),
  });
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'CREATE-20', source: 'P-20', target: '' }),
  ]));
  assert.equal(routed.status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].action, 'CREATE');
  assert.equal(routed.operations[0].status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].policyAuthority, CII_WRITER_2_NODENAME_RELOCATION_POLICY);
  assert.equal(routed.summary.writer2MutationCount, 1);
  assert.equal(routed.policy.nodeNameMutation, 'CREATE_DELETE_RELOCATION_ONLY');
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'DELETE-20', source: '', target: 'P-20', action: 'DELETE', status: 'BLOCKED', blockers: ['NODE_NAME_DELETE_REQUIRES_EXPLICIT_POLICY'] }),
  ], ['NO_TRANSFERABLE_PREVIEW_OPERATIONS']));
  assert.equal(routed.status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].action, 'DELETE');
  assert.equal(routed.operations[0].status, 'PREVIEW_READY');
  assert.equal(routed.summary.writer2MutationCount, 1);
  assert(!routed.blockers.includes('NO_TRANSFERABLE_PREVIEW_OPERATIONS'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'OVERWRITE-20', source: 'NEW', target: 'OLD', status: 'BLOCKED', blockers: ['TARGET_NODENAME_NONBLANK'] }),
  ]));
  assert.equal(routed.status, 'BLOCKED');
  assert.equal(routed.operations[0].action, 'BLOCKED');
  assert.equal(routed.summary.writer2MutationCount, 0);
  assert(routed.operations[0].blockers.includes('WRITER_2_NODENAME_OVERWRITE_USE_WRITER_1C'));
  assert(routed.blockers.includes('NO_WRITER_2_NODENAME_TRANSFERABLE_OPERATIONS'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'P3', family: 'PROCESS', property: 'P3', source: 10, target: 5, evidenceAuthority: 'PROTECTED_WRITER_ELEMENT_ROW4_P3_FIXED_FIELD' }),
  ]));
  assert.equal(routed.status, 'BLOCKED');
  assert.equal(routed.operations[0].action, 'BLOCKED');
  assert.equal(routed.summary.writer2MutationCount, 0);
  assert(routed.operations[0].blockers.includes('WRITER_2_PHASE1_NODENAME_ONLY'));
  assert(routed.blockers.includes('NO_WRITER_2_NODENAME_TRANSFERABLE_OPERATIONS'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'KEEP-20', source: 'P-20', target: 'P-20', action: 'KEEP', status: 'PREVIEW_READY' }),
    operation({ id: 'GEOM', family: 'GEOMETRY', property: 'Node location', source: 0, target: 0, action: 'KEEP', status: 'PROTECTED', evidenceAuthority: 'PARSED_NATIVE_NODE_COORDINATES' }),
  ]));
  assert.equal(routed.summary.previewReadyCount, 1);
  assert.equal(routed.summary.protectedCount, 1);
  assert.equal(routed.summary.writer2MutationCount, 0);
  assert.equal(routed.status, 'BLOCKED');
  assert(routed.blockers.includes('NO_WRITER_2_NODENAME_TRANSFERABLE_OPERATIONS'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'CREATE-20', source: 'P-20', target: '' }),
  ], ['CORRESPONDENCE_NOT_READY']));
  assert.equal(routed.status, 'BLOCKED');
  assert(routed.blockers.includes('CORRESPONDENCE_NOT_READY'));
}

{
  const body = [
    '#$ CONTROL', numericRow([1, 0, 0, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    '#$ ELEMENTS', ...elementBlock(10, 20, 0), '#$ NODENAME', '#$ BEND',
  ].join('\r\n');
  const physicalFile = createCiiPhysicalFile(new TextEncoder().encode(body));
  const parsed = Object.freeze({ nodes: Object.freeze({ 10: Object.freeze({}), 20: Object.freeze({}) }),
    elements: Object.freeze([Object.freeze({ index: 0, from: 10, to: 20 })]) });
  const nodeNameEvidence = extractCiiNodeNameEvidence(physicalFile.text, parsed, { physicalFile });
  const targetDocument = Object.freeze({ physicalFile, writer1CByteEligible: true, nodeNameEvidence, nodeNames: Object.freeze({}) });
  const contracted = applyCiiWriter2NodeNamePlanContract(rawPlan([operation({ id: 'CREATE-20', source: 'P-20', target: '' })]));
  const unbound = ciiWriter2NodeNameReadiness(contracted, targetDocument);
  assert.equal(unbound.ready, false);
  assert(unbound.blockers.includes('WRITER_2_NODENAME_BOUND_TRANSFER_SCOPE_REQUIRED'));
  const bound = Object.freeze({ ...contracted, transferScope: Object.freeze({ status: 'BOUND' }),
    operations: Object.freeze(contracted.operations.map((item) => Object.freeze({ ...item, scopeDecision: 'APPLY' }))) });
  const ready = ciiWriter2NodeNameReadiness(bound, targetDocument);
  assert.equal(ready.ready, true);
  assert.equal(ready.mutationCount, 1);
  assert.equal(ready.relocationPlan.appendedRows[0].toName, 'P-20');
}

{
  const core = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-core.js', import.meta.url), 'utf8');
  const scope = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope.js', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope-ui.js', import.meta.url), 'utf8');
  const shell = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-shell.js', import.meta.url), 'utf8');
  const engineeringUi = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-engineering-ui.js', import.meta.url), 'utf8');
  const bridge = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-writer-version-bridge.js', import.meta.url), 'utf8');
  const tab = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
  assert(core.includes("['1A', '1B', '1C', '2']"));
  assert(core.includes("? options.writerVersion : '1B'"), 'production default must remain Writer 1B');
  assert(core.includes('applyCiiWorkspaceTargetWriter2'));
  assert(core.includes("version === '2' ? applyCiiWriter2CompositePlanContract"));
  assert(core.includes("['1C', '2'].includes(version)"));
  assert(core.includes('writer2HasRestraintApply(preview.transferPlan)'));
  assert(core.includes('applyCiiWriter2CompositeWithRestraintDelete({ targetDocument: currentTarget, targetGraph, transferPlan: preview.transferPlan })'));
  assert(core.includes('applyCiiWriter2CompositeWithHangerDeleteAll({ targetDocument: currentTarget, targetGraph, transferPlan: preview.transferPlan })'));
  assert(core.includes('validateCiiWriter2ProductRoundTrip(currentTarget, modifiedTarget, targetGraph, preview.transferPlan, writerResult)'));
  assert(!core.includes('validateCiiWriter2CompositeRoundTrip(currentTarget, modifiedTarget, targetGraph, preview.transferPlan, writerResult)'));
  assert(scope.includes("preview?.writerVersion === '2'"));
  assert(scope.includes('ciiWriter2CompositeReadiness(transferPlan, preview.targetDocument, targetGraph)'));
  assert(scope.includes("['1A', '1B', '1C', '2']"));

  assert(shell.includes('inspectCiiWorkspaceModelsWithVersionBridge'));
  assert(shell.includes('createCiiWorkspacePreviewWithVersionBridge'));
  assert(shell.includes('applyCiiWorkspaceTargetWriter2WithVersionBridge'));
  assert(shell.includes("options?.writerVersion === '2'"));
  assert(shell.includes("applied?.writer === 'WRITER_2'"));
  assert(shell.includes('CII_WRITER_2_VERSION_BRIDGE_VALIDATION_REQUIRED'));
  assert(shell.includes('CII_WRITER_2_BYTE_STRING_REQUIRED'));
  assert(shell.includes("applied?.writer === 'WRITER_1C'"));
  assert(!shell.includes("['WRITER_1C', 'WRITER_2'].includes(applied?.writer)"));
  assert(!shell.includes("if (version === '2') return applyCiiWorkspaceTargetWriter2;"));

  assert(engineeringUi.includes('inspectCiiWorkspaceModelsWithVersionBridge'));
  assert(engineeringUi.includes("options?.writerVersion === '2' ? inspectCiiWorkspaceModelsWithVersionBridge"));
  assert(engineeringUi.includes('new Uint8Array(await sourceFile.arrayBuffer())'));
  assert(engineeringUi.includes('new Uint8Array(await targetFile.arrayBuffer())'));
  assert(engineeringUi.includes("current?.writerVersion || options?.writerVersion || '1B'"));

  assert(ui.includes('applyCiiWorkspaceTargetWriter2WithVersionBridge'));
  assert(ui.includes('writer2BridgeReady'));
  assert(ui.includes('Boolean(preview?.versionBridge)'));
  assert(ui.includes('Writer 2 version-bridge evidence is missing'));
  assert(ui.includes("applied?.writer === 'WRITER_2'"));
  assert(ui.includes('CII_WRITER_2_VERSION_BRIDGE_VALIDATION_REQUIRED'));
  assert(ui.includes('CII_WRITER_2_BYTE_STRING_REQUIRED'));
  assert(ui.includes("applied?.writer === 'WRITER_1C'"));
  assert(!ui.includes("['WRITER_1C', 'WRITER_2'].includes(applied?.writer)"));
  assert(!ui.includes("if (version === '2') return applyCiiWorkspaceTargetWriter2;"));

  assert(bridge.includes('inspectCiiWorkspaceModelsWithVersionBridge'));
  assert(bridge.includes('createCiiWorkspacePreviewWithVersionBridge'));
  assert(bridge.includes('applyCiiWorkspaceTargetWriter2WithVersionBridge'));
  assert(bridge.includes("path: 'DIRECT_V11'"));
  assert(bridge.includes("path: bridge.target?.writer2Shadow?.enabled ? 'V14_TARGET_SHADOW_CHANGE_ISOLATED_VIA_V11' : 'V14_CHANGE_ISOLATED_VIA_V11'"));
  // Return path requires an executed qualified mutation: the literal in source is insufficient.

  assert(tab.includes('mountCiiWorkspaceScopedEngineeringShell'));
  assert(tab.includes('const writerVersion = writerVersionOverride || context.writerVersion || null;'));
  assert(tab.includes('...(writerVersion ? { writerVersion } : {})'));
  assert(tab.includes("const openWriter2 = () => open('2');"));
  assert(!tab.includes("writerVersion: '2'"), 'product tile must not silently switch the default to Writer 2');
}


// Execute real, scope-bound Writer2 V14 mutation cases. Reuse the frozen V11
// benchmark and the native original T.V14 nonzero-SIF conversion shadow.
function validRestraintDelete(target) {
  const rows=ciiPhysicalSectionRows(target.physicalFile,'RESTRANT');
  assert.equal(rows.length%24,0,'native 24-row block custody');
  for(let pointer=1;pointer<=rows.length/24;pointer++){
    const states=Array.from({length:6},(_,idx)=>{
      const start=(pointer-1)*24+idx*4;
      const first=decodeCiiNumericRow(rows[start].text),second=decodeCiiNumericRow(rows[start+1].text);
      const s=rows[start+2].text,g=rows[start+3].text;
      const named=[s,g].map(text=>/^\s*(\d+)\s?(.*)$/.exec(text));
      if(!first||!second||named.some(m=>!m||m[2].slice(0,Number(m[1]))))return null;
      return {pointer,slot:idx+1,line1:first.slice(0,6).map(Number),
        line2:second.slice(0,3).map(Number),tag:'',guid:'',
        occupied:Math.abs(Number(first[0]))>1e-12||Math.abs(Number(first[1]))>1e-12};
    });
    if(states.some(s=>!s))continue;
    const occupied=states.filter(s=>s.occupied);if(occupied.length!==1)continue;
    const entry=occupied[0],node=String(Math.round(entry.line1[0]));
    const owners=Object.values(target.auxiliaryEvidence?.elements||{})
      .filter(e=>Number(e.pointers?.restraint||0)===pointer);
    if(owners.length!==1||![String(owners[0].from),String(owners[0].to)].includes(node))continue;
    if((target.auxiliaryEvidence?.restraints?.byNode?.[node]||[]).length!==1)continue;
    return {pointer,slot:entry.slot,targetNode:node,beforeSlot:entry};
  }
  throw new Error('WRITER2_REAL_SINGLE_RESTRAINT_DELETE_CANDIDATE_REQUIRED');
}
function boundDeletePlan(document,candidate){
 const mutation=Object.freeze({schema:'CIIWorkspaceRestraintSlotMutation.v1',status:'QUALIFIED',
  mode:'CLEAR',authority:'PROTECTED_WRITER_EXISTING_24_ROW_BLOCK_EMPTY_SLOT_TEMPLATE',
  pointer:candidate.pointer,slot:candidate.slot,targetNode:candidate.targetNode,beforeSlot:candidate.beforeSlot});
 const operation=Object.freeze({operationId:'WP7-RUNTIME-RESTRAINT-DELETE',family:'RESTRAINT',
  property:'Qualified restraint slot mutation',action:'DELETE',status:'PREVIEW_READY',
  scopeDecision:'APPLY',policyAuthority:'CII_WRITER_1B_EXISTING_BLOCK_FIXED_SLOT',
  matchAuthority:Object.freeze({status:'REVIEWED'}),
  sourceEvidence:Object.freeze({value:mutation}),proposed:mutation});
 return Object.freeze({status:'PREVIEW_READY',blockers:[],
  sourceDocument:{fileName:'WP7_CONTROLLED_SOURCE',contentSha256:'3'.repeat(64)},
  targetDocument:{fileName:document.fileName,contentSha256:document.contentSha256},
  operations:[operation],excludedOperations:[],transferScope:Object.freeze({
    schema:'CIIWorkspaceTransferScope.v1',mode:'EXPLICIT_APPLY_EXCLUDE',
    status:'BOUND',authority:'USER_EXPLICIT_OPERATION_SCOPE',scopeId:'WP7-BOUND-RESTRAINT',
    sourceSha256:'3'.repeat(64),targetSha256:document.contentSha256,
    candidateOperationIds:[operation.operationId],appliedOperationIds:[operation.operationId],
    excludedOperationIds:[],appliedOperationCount:1,excludedOperationCount:0})});
}
async function executeRealV14Path(v11Original,originalV14,expectedPath){
 const policy={writerVersion:'2',cryptoRef:webcrypto,spatialToleranceMm:1,
  diameterToleranceRatio:0.01,wallToleranceRatio:0.01,identityWeight:50,
  diameterWeight:30,wallWeight:30,winnerGap:8};
 const target=await intakeCiiWorkspaceDocument(v11Original,'WP7_TARGET_V11.CII',
  {side:'TARGET',cryptoRef:webcrypto});
 const graph=adaptCiiDocumentToTopologyGraph(target);
 const candidate=validRestraintDelete(target);
 const seed=applyCiiWriter2CompositeWithRestraintDelete({
  targetDocument:target,targetGraph:graph,transferPlan:boundDeletePlan(target,candidate)});
 assert.equal(seed.status,'APPLIED');
 const src=await convertCiiNeutralVersionLossless(seed.bytes,14,
  {fileName:'WP7_SOURCE_GENERATED_V14.CII',cryptoRef:webcrypto});
 const originalHash=await ciiSha256(originalV14,webcrypto);
 const first=await createCiiWorkspacePreviewWithVersionBridge({
  sourceBytes:src.outputBytes,sourceFileName:'WP7_SOURCE_V14.CII',
  targetBytes:originalV14,targetFileName:'WP7_TARGET_V14.CII',
  anchorPairs:[{sourceNodeId:candidate.targetNode,targetNodeId:candidate.targetNode}]},policy);
 assert.equal(first.versionBridge.target.originalSha256,originalHash);
 const productOp=first.transferPlan.operations.find(op=>op.family==='RESTRAINT'&&
  op.property==='Qualified restraint slot mutation'&&op.action==='DELETE');
 assert(productOp&&productOp.status==='PREVIEW_READY','real Writer2 operation must be eligible');
 const decisions=Object.fromEntries(ciiTransferScopeCandidateOperations(first.transferPlan)
  .filter(op=>op.action!=='KEEP').map(op=>[op.operationId,
  op.operationId===productOp.operationId?'APPLY':'EXCLUDE']));
 const preview=bindCiiTransferScopeToPreview(first,createCiiTransferScopeSelection(first.transferPlan,decisions));
 assert.equal(preview.transferScope.status,'BOUND');
 console.log('WP7_WRITER2_READY_PROBE '+JSON.stringify({path:expectedPath,candidate,
  previewStatus:first.status,correspondence:first.correspondence?.status,
  sourceSummary:first.sourceDocument?.summary?.neutralVersionMajor,
  targetSummary:first.targetDocument?.summary?.neutralVersionMajor,
  planStatus:first.transferPlan?.status,planBlockers:first.transferPlan?.blockers,
  selectedOperation:productOp.operationId,
  scopeStatus:preview.transferScope?.status,
  readiness:preview.writerReadiness}));
 assert.equal(preview.writerReadiness.ready,true,preview.writerReadiness.blockers?.join('|'));
 await assert.rejects(()=>applyCiiWorkspaceTargetWriter2WithVersionBridge(
  {...preview,versionBridge:null},originalV14,{cryptoRef:webcrypto}),/PREVIEW_REQUIRED/);
 const canonicalV11=await applyCiiWorkspaceTargetWriter2(preview,v11Original,{cryptoRef:webcrypto});
 assert.equal(canonicalV11.status,'PASS');
 const result=await applyCiiWorkspaceTargetWriter2WithVersionBridge(preview,originalV14,{cryptoRef:webcrypto});
 const proof=result.versionBridgeValidation;
 assert.equal(result.status,'PASS');
 assert.equal(proof.status,'PASS');
 assert.equal(proof.path,expectedPath);
 assert.equal(proof.originalTargetSha256,originalHash);
 assert.equal(proof.normalizedTargetSha256,preview.versionBridge.target.normalizedSha256);
 assert.equal(proof.canonicalModifiedRoundTripExact,true);
 assert.equal(proof.projectedNormalizedPostimageExact,true);
 assert.equal(proof.fixedFieldAuthority.status,'PASS');
 assert.equal(result.sourceTargetSha256,originalHash);
 assert.equal(result.modifiedTargetSha256,await ciiSha256(ciiByteStringToBytes(result.byteString),webcrypto));
 const final=ciiByteStringToBytes(result.byteString);
 assert.equal(detectCiiNeutralVersion(final),14);
 let projected=final;
 if(expectedPath==='V14_TARGET_SHADOW_CHANGE_ISOLATED_VIA_V11'){
  assert(preview.versionBridge.target.writer2Shadow?.enabled);
  assert(!proof.changedV14Sections.includes('SIF&TEES'),'no protected SIF writes');
  projected=createCiiWriter2V14LosslessShadow(final).outputBytes;
 }else assert.equal(preview.versionBridge.target.writer2Shadow,null);
 const downgrade=await convertCiiNeutralVersionLossless(projected,11,
  {fileName:'WP7_POSTIMAGE_V14.CII',cryptoRef:webcrypto});
 assert(ciiBytesEqual(downgrade.outputBytes,ciiByteStringToBytes(canonicalV11.byteString)));
 const tampered=new Uint8Array(originalV14);tampered[30]^=1;
 await assert.rejects(()=>applyCiiWorkspaceTargetWriter2WithVersionBridge(
  preview,tampered,{cryptoRef:webcrypto}),/STALE_ORIGINAL_V14_TARGET_HASH/);
 return {path:proof.path,original:originalHash,after:result.modifiedTargetSha256,
  changedSections:proof.changedV14Sections};
}
const benchmarkV11=new Uint8Array(await readFile(new URL('../Benchmark/CIICompare/BM_CII_SOURCE.CII',import.meta.url)));
const generatedV14=await convertCiiNeutralVersionLossless(benchmarkV11,14,
 {fileName:'WP7_BM_GENERATED_V14.CII',cryptoRef:webcrypto});
const nonshadow=await executeRealV14Path(benchmarkV11,generatedV14.outputBytes,'V14_CHANGE_ISOLATED_VIA_V11');
const originalT=new Uint8Array(await readFile(new URL('../Benchmark/T.CII',import.meta.url)));
assert.equal(createHash('sha256').update(originalT).digest('hex'),
 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060');
const normalizedT=await convertCiiNeutralVersionLossless(
 createCiiWriter2V14LosslessShadow(originalT).outputBytes,11,
 {fileName:'WP7_T_SHADOW_V11.CII',cryptoRef:webcrypto});
const shadow=await executeRealV14Path(normalizedT.outputBytes,originalT,
 'V14_TARGET_SHADOW_CHANGE_ISOLATED_VIA_V11');
assert.notEqual(nonshadow.original,shadow.original);
console.log('WP7_V14_WRITER2_EXECUTED_ROUTES '+JSON.stringify({nonshadow,shadow}));

console.log('Writer 2 product routing is bridge-bound for V11/V14 and Writer2 export is byte/proof-authoritative while the production default remains Writer 1B.');
