/**
 * ARCH-01 A2-SHADOW-01: additive physical correspondence hypotheses, NEVER a Writer.
 *
 * Consumes independently reproduced AUTO and manual-base projection snapshots
 * bound to the same frozen original SOURCE/TARGET hashes. A BOUND product row is
 * a hypothesis here, NOT an independently certified physical equivalence.
 *
 * No production imports, no output CII, no readiness gate, no Writer dispatch.
 */
import { createHash } from 'node:crypto';
import {
  ciiTransferPhysicalEntityRef,
  CII_TRANSFER_ARCH_A1_CATALOG,
} from '../tabs/cii-workspace/architecture/cii-transfer-capability-contracts.js';

const HASH = /^[a-f\d]{64}$/i;
const text = (v) => String(v ?? '').trim();
function frozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(frozen));
  if (value && typeof value === 'object') return Object.freeze(
    Object.fromEntries(Object.entries(value).map(([key, item]) => [key, frozen(item)])));
  return value;
}
function sha(x) {
  const s = text(x).toLowerCase();
  if (!HASH.test(s)) throw new Error('A2_ORIGINAL_SHA256_REQUIRED');
  return s;
}
function id(x) {
  const s = text(x);
  if (!s) throw new Error('A2_PHYSICAL_ID_REQUIRED');
  return s;
}
const compare = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const nodeKey = (sourceId, sourceNodeId) => id(sourceId) + ':' + id(sourceNodeId);
const physicalClaimKey = (s, n, t) => JSON.stringify([s, n, t]);
function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function canonicalSnapshot(input) {
  const sourceSetSha256 = sha(input.sourceSetSha256);
  const originalTargetSha256 = sha(input.originalTargetSha256);
  const originalSourceShaById = {};
  const entries = Object.entries(input.originalSourceShaById || {}).sort(([a], [b]) => compare(a,b));
  if (entries.length < 2 || new Set(entries.map(([s]) => s)).size !== entries.length)
    throw new Error('A2_TWO_OR_MORE_UNIQUE_SOURCE_MEMBERS_REQUIRED');
  for (const [s,h] of entries) originalSourceShaById[id(s)] = sha(h);
  const physicalOriginalSnapshotDigest = digest({ sourceSetSha256, originalTargetSha256, originalSourceShaById });
  return frozen({ sourceSetSha256, originalTargetSha256, originalSourceShaById, physicalOriginalSnapshotDigest });
}
function exactRowKey(row) {
  const expected = nodeKey(row.sourceId, row.sourceNodeId || text(row.rowKey).split(':')[1]);
  if (text(row.rowKey) !== expected) throw new Error('A2_AUDIT_ROW_IDENTITY_NAMESPACE_MISMATCH:' + text(row.rowKey));
  return expected;
}
function validatedSnapshot(snapshot, authority) {
  const mode = id(snapshot.mode);
  const audit = snapshot.audit;
  if (sha(snapshot.sourceSetSha256) !== authority.sourceSetSha256
    || sha(snapshot.originalTargetSha256) !== authority.originalTargetSha256)
    throw new Error('A2_REPLAY_INPUT_CUSTODY_DIFFERENCE:' + mode);
  if (!Array.isArray(audit?.rows) || audit.summary?.totalSourceNodes !== audit.rows.length
    || !audit.summary.totalSourceNodes)
    throw new Error('A2_SOURCE_CENSUS_REQUIRED:' + mode);
  const keys = new Set();
  for (const row of audit.rows) {
    const key = exactRowKey(row);
    if (keys.has(key)) throw new Error('A2_DUPLICATE_PHYSICAL_NODE:' + key);
    keys.add(key);
    if (!authority.originalSourceShaById[row.sourceId])
      throw new Error('A2_SOURCE_MEMBER_NOT_IN_ORIGINAL_SNAPSHOT:' + row.sourceId);
    if (!['BOUND','UNRESOLVED','AMBIGUOUS','UNEMITTED'].includes(row.state))
      throw new Error('A2_SOURCE_ROW_STATE_UNKNOWN:' + key);
    if (row.state === 'BOUND' && !text(row.targetNodeId))
      throw new Error('A2_BOUND_ROW_TARGET_REQUIRED:' + key);
  }
  if ((audit.summary.bySource || []).length !== Object.keys(authority.originalSourceShaById).length)
    throw new Error('A2_SOURCE_CENSUS_MEMBER_COUNT_MISMATCH:' + mode);
  for (const member of audit.summary.bySource) {
    const count = audit.rows.filter((row) => row.sourceId === member.sourceId).length;
    if (count !== member.enumeratedNodeCount || member.populationStatus !== 'MATCH')
      throw new Error('A2_SOURCE_MEMBER_CENSUS_INCOMPLETE:' + member.sourceId);
  }
  return { mode, rows: audit.rows, keys };
}
function localAdvisory(sourceGraph, targetGraph, sourceNodeId, targetNodeId) {
  const source = sourceGraph?.adjacency?.get?.(sourceNodeId) || [];
  const target = targetGraph?.adjacency?.get?.(targetNodeId) || [];
  const valid = (rows, field) => rows.map((e) => Number(e[field]))
    .filter((v) => Number.isFinite(v) && v > 0).sort((a,b)=>a-b);
  const sd = valid(source, 'diameter'), td = valid(target, 'diameter');
  const sl = valid(source, 'lengthMm'), tl = valid(target, 'lengthMm');
  const error = sd.length && td.length
    ? Math.max(...sd.map(a=>Math.min(...td.map(b=>100*Math.abs(a-b)/a)))) : null;
  const lengthDelta = sl.length && sl.length===tl.length
    ? Math.max(...sl.map((a,i)=>Math.abs(a-tl[i]))) : null;
  const rounded = (value) => value == null ? null : Number(value.toFixed(2));
  const warnings = [];
  if (error !== null && error>50) warnings.push('ONE_HOP_INCIDENT_OD_OVER_50_PERCENT');
  if (lengthDelta !== null && lengthDelta>250) warnings.push('ONE_HOP_EDGE_LENGTH_DELTA_OVER_250MM');
  return frozen({
    status: !source.length || !target.length ? 'NOT_AVAILABLE' : warnings.length ? 'ADVISORY_CONTRADICTION' : 'NO_LOCAL_WARNING',
    sourceDegree: source.length, targetDegree: target.length, incidentOdErrorPercent: rounded(error),
    oneHopLengthDeltaMm: rounded(lengthDelta), warnings,
    identityQualified: false,
    qualificationCaveat: 'LOCAL_ONE_HOP_IS_NOT_GLOBAL_GRAPH_OR_SUBDIVISION_PROOF',
  });
}
function replayMethod(mode) {
  if (mode === 'AUTO_ONLY') return 'AUTOMATIC_BASE_REPLAY';
  if (mode === 'UI_MIXED_BASE_PROXY') return 'MANUAL_BASE_REPLAY_NOT_INDEPENDENT_PHYSICAL_PROOF';
  return 'INDEPENDENT_REPLAY_' + mode;
}

/** Returns an immutable, all-candidates-visible, non-certifying shadow graph. */
export function buildCiiA2ShadowJointEvidence({
  authority, snapshots, manualClaims = [], sourceGraphsById = {}, targetGraph = null,
} = {}) {
  const custody = canonicalSnapshot(authority || {});
  if (!Array.isArray(snapshots) || snapshots.length < 2)
    throw new Error('A2_TWO_REPLAY_MODES_REQUIRED');
  const checked = snapshots.map(s=>validatedSnapshot(s,custody));
  const modes = checked.map(c=>c.mode);
  if (new Set(modes).size !== modes.length) throw new Error('A2_DUPLICATE_REPLAY_MODE');
  const sourceKeys = [...checked[0].keys].sort(compare);
  for (const replay of checked.slice(1)) {
    if (replay.keys.size !== sourceKeys.length ||
      sourceKeys.some(key=>!replay.keys.has(key)))
      throw new Error('A2_CANNOT_COMPARE_DIFFERENT_SOURCE_POPULATIONS');
  }
  const originalNodeCount = sourceKeys.length;
  const members = new Set(Object.keys(custody.originalSourceShaById));
  const rawClaims = [];
  for (const replay of checked) {
    for (const row of replay.rows) {
      if (row.state !== 'BOUND') continue;
      rawClaims.push({
        sourceId: row.sourceId, sourceNodeId: id(row.sourceNodeId || row.rowKey.split(':')[1]),
        targetNodeId: id(row.targetNodeId),
        origin: replayMethod(replay.mode), replayMode: replay.mode,
        observedStatus: row.state, confidence: text(row.confidence),
        reviewDecisions: row.reviewDecisions || [], physicalQualification: 'UNVERIFIED_REPLAY_BOUND_ROW',
      });
    }
  }
  for (const pair of manualClaims) {
    const sourceId = id(pair.sourceId), sourceNodeId=id(pair.sourceNodeId), targetNodeId=id(pair.targetNodeId);
    const key=nodeKey(sourceId,sourceNodeId);
    if (!members.has(sourceId) || !checked[0].keys.has(key))
      throw new Error('A2_MANUAL_CLAIM_OUTSIDE_ORIGINAL_SOURCE_CENSUS:' + key);
    if (!checked.some(replay=>replay.rows.some(row=>row.rowKey===key
      && row.state==='BOUND' && row.targetNodeId===targetNodeId
      && (row.reviewDecisions||[]).includes('LOCKED'))))
      throw new Error('A2_UNATTESTED_MANUAL_LOCK:' + key + '=>' + targetNodeId);
    rawClaims.push({
      sourceId,sourceNodeId,targetNodeId,origin:'USER_MANUAL_ASSERTION',
      replayMode:'MANUAL_LEDGER',observedStatus:'LOCKED',confidence:'LOCKED',
      reviewDecisions:['LOCKED'],physicalQualification:'USER_ASSERTION_ONLY',
    });
  }
  const grouped = new Map();
  for (const row of rawClaims) {
    const claimKey=physicalClaimKey(row.sourceId,row.sourceNodeId,row.targetNodeId);
    if (!grouped.has(claimKey)) {
      const source=ciiTransferPhysicalEntityRef({
        side:'SOURCE',sourceId:row.sourceId,originalSha256:custody.originalSourceShaById[row.sourceId],
        entityKind:'NODE',physicalId:row.sourceNodeId,
      });
      const target=ciiTransferPhysicalEntityRef({
        side:'TARGET',originalSha256:custody.originalTargetSha256,entityKind:'NODE',physicalId:row.targetNodeId,
      });
      grouped.set(claimKey, {sourceId:row.sourceId,sourceNodeId:row.sourceNodeId,
        targetNodeId:row.targetNodeId,sourceRef:source,targetRef:target,evidence:[]});
    }
    grouped.get(claimKey).evidence.push({
      origin:row.origin,replayMode:row.replayMode,observedStatus:row.observedStatus,
      confidence:row.confidence,reviewDecisions:row.reviewDecisions,physicalQualification:row.physicalQualification,
    });
  }
  const bySource=new Map(sourceKeys.map(key=>[key,[]]));
  const byTarget=new Map();
  const claims=[...grouped.values()].sort((a,b)=>compare(nodeKey(a.sourceId,a.sourceNodeId),nodeKey(b.sourceId,b.sourceNodeId))
    ||compare(a.targetNodeId,b.targetNodeId)).map(row=>{
      const sKey=nodeKey(row.sourceId,row.sourceNodeId);
      const advisory=localAdvisory(sourceGraphsById[row.sourceId],targetGraph,row.sourceNodeId,row.targetNodeId);
      const evidence=[...row.evidence].sort((a,b)=>compare(a.origin,b.origin)||compare(a.replayMode,b.replayMode));
      const result=frozen({
        claimId:digest({physicalOriginalSnapshotDigest:custody.physicalOriginalSnapshotDigest,
          source:row.sourceRef,target:row.targetRef}).slice(0,32),
        sourceRef:row.sourceRef,targetRef:row.targetRef,
        sourceNodeKey:sKey,targetNodeId:row.targetNodeId,
        evidence,evidenceDigest:digest(evidence),physicalAdvisory:advisory,
        claimStatus:'UNCERTIFIED_HYPOTHESIS',canBindScope:false,
      });
      bySource.get(sKey).push(result);
      if (!byTarget.has(row.targetNodeId)) byTarget.set(row.targetNodeId,new Set());
      byTarget.get(row.targetNodeId).add(sKey);
      return result;
    });
  const nodeRows=sourceKeys.map(key=>{
    const options=bySource.get(key)||[];
    const targets=options.map(op=>op.targetNodeId).sort(compare);
    const conflictReasons=[];
    if (targets.length>1) conflictReasons.push('COMPETING_TARGET_IDENTITIES');
    if (options.some(op=>(byTarget.get(op.targetNodeId)?.size||0)>1))
      conflictReasons.push('SHARED_TARGET_CUSTODY_NOT_QUALIFIED');
    const warnings=[...new Set(options.flatMap(op=>op.physicalAdvisory.warnings))].sort();
    const state=options.length===0?'UNMAPPED':conflictReasons.length?'CONFLICT':'REVIEW_REQUIRED';
    const [sourceId,sourceNodeId]=key.split(':');
    return frozen({
      sourceNodeKey:key,sourceId,sourceNodeId,
      targets,claimIds:options.map(op=>op.claimId),state,
      reasons:conflictReasons.length?conflictReasons:
        options.length?['GLOBAL_PHYSICAL_CERTIFICATION_NOT_IMPLEMENTED']:['NO_QUALIFIED_CANDIDATE_EMITTED'],
      advisoryWarnings:warnings,
      certified:false,certificationId:null,writerReady:false,scopeApplyIds:[],
    });
  });
  const summary={
    originalPhysicalSourceNodes:originalNodeCount,
    rawEvidenceRows:rawClaims.length,distinctSourceTargetHypotheses:claims.length,
    replayModes:modes.slice().sort(compare),
    byState:Object.fromEntries(['UNMAPPED','REVIEW_REQUIRED','CONFLICT'].map(state=>
      [state,nodeRows.filter(row=>row.state===state).length])),
    directlyCompetingSourceNodes:nodeRows.filter(row=>row.reasons.includes('COMPETING_TARGET_IDENTITIES')).map(row=>row.sourceNodeKey),
    sharedTargetCustodyNodes:nodeRows.filter(row=>row.reasons.includes('SHARED_TARGET_CUSTODY_NOT_QUALIFIED')).map(row=>row.sourceNodeKey),
    physicallyCertifiedNodeCount:0,writerReadyOperationCount:0,
  };
  if (Object.values(summary.byState).reduce((a,b)=>a+b,0)!==originalNodeCount)
    throw new Error('A2_PHYSICAL_NODE_PARTITION_INVALID');
  return frozen({
    schema:'CiiArchitectureA2ShadowJointEvidence.v1',
    status:'SHADOW_REVIEW_ONLY',authority:'COUNTERFACTUAL_REPLAY_EVIDENCE_NOT_CERTIFICATION',
    provenance: custody, requiredFamilyCatalog:CII_TRANSFER_ARCH_A1_CATALOG.catalogVersion,
    hypotheses:claims,nodeRows,summary,
    matchingAlgorithmStatus:'JOINT_RESOLUTION_AND_INDEPENDENT_CERTIFICATION_NOT_YET_IMPLEMENTED',
    writerDispatchInstalled:false,transferPlan:null,writeScope:null,
    limitations:[
      'AUTOMATIC_AND_MANUAL_SNAPSHOTS_ARE_HYPOTHESES_NOT_CONCURRENT_EXECUTION',
      'ONE_HOP_CONTEXT_CANNOT_CERTIFY_OR_EXCLUDE_SUBDIVISION',
      'MANUAL_LOCK_NOT_INDEPENDENT_PHYSICAL_IDENTITY',
      'M1_M2_OD_REGISTRATION_AND_PATH_ENDPOINT_CERTIFICATION_NOT_IMPLEMENTED',
      'TARGET_CUSTODY_CONFLICTS_REQUIRE_CROSS_SOURCE_PROOF_BEFORE_DEDUPLICATION',
      'NO_NEW_MUTATION_OR_WRITER_RIGHTS',
    ],
  });
}

/** Deliberately impossible to elevate a shadow graph to a production writer. */
export function assertCiiA2ShadowNoWrite(result) {
  if (result?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1')
    throw new Error('A2_SHADOW_SCHEMA_REQUIRED');
  throw new Error('A2_SHADOW_CORRESPONDENCE_NOT_WRITER_CERTIFIED');
}
