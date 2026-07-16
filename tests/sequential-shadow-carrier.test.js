import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import {
  createSequentialConstructionSession,
  runConstructionUntilBlocked,
} from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { createConfirmedSequentialConstruction } from '../tabs/sequential-sketcher/construction/sequential-construction-acceptance.js';
import { buildConfirmedConstructionSupportProjection } from '../tabs/sequential-sketcher/support/sequential-confirmed-support-projection.js';

const branchId = '/SHADOW/B1';
const shadowCarrierName = `PIPE AUTO ${branchId} 1`;
const records = [{ type: 'BRANCH', name: branchId, attributes: { NAME: branchId, HPOS: { x: 0, y: 0, z: 0 } }, children: [
  { type: 'PIPE', name: 'P0', attributes: { APOS: { x: 0, y: 0, z: 0 }, LPOS: { x: 100, y: 0, z: 0 } } },
  { type: 'PIPE', name: shadowCarrierName, attributes: { NAME: shadowCarrierName, REF: '=SHADOW/PIPE1', APOS: { x: 100, y: 0, z: 0 }, LPOS: { x: 200, y: 0, z: 0 }, LBORE: '150mm' } },
  { type: 'INST', name: 'INST /XV-1', attributes: { NAME: '/XV-1', REF: '=REF/XV1', APOS: { x: 100, y: 0, z: 0 }, LPOS: { x: 200, y: 0, z: 0 }, POS: { x: 150, y: 0, z: 0 }, ABORE: '150mm', LBORE: '150mm' } },
  { type: 'SUPPORT', name: 'SUPPORT SHADOW', attributes: { NAME: '/PS-SHADOW/DATUM', TYPE: 'ATTA', RAW_TYPE: 'ATTA', OWNER: branchId, POS: { x: 150, y: 0, z: 0 }, CARRIERREF: '=SHADOW/PIPE1', SUPPORT_TAG: 'PS-SHADOW', CMPSUPTYPE: 'REST', DTXR: 'PIPE REST' } },
  { type: 'PIPE', name: 'P2', attributes: { APOS: { x: 200, y: 0, z: 0 }, LPOS: { x: 300, y: 0, z: 0 } } },
  { type: 'INST', name: 'INST /FI-2', attributes: { NAME: '/FI-2', REF: '=REF/FI2', APOS: { x: 300, y: 0, z: 0 }, LPOS: { x: 350, y: 0, z: 0 }, POS: { x: 325, y: 0, z: 0 }, ABORE: '80mm', LBORE: '80mm' } },
  { type: 'PIPE', name: `PIPE AUTO ${branchId} TAIL`, attributes: { APOS: { x: 300, y: 0, z: 0 }, LPOS: { x: 350, y: 0, z: 0 }, LBORE: '80mm' } },
  { type: 'CAP', name: 'C1', attributes: { APOS: { x: 350, y: 0, z: 0 } } },
] }];

const evidence = buildSequentialEvidenceModel(records);
const indexes = indexSequentialEvidence(evidence);
const branch = indexes.branches.get(branchId);
const xv = branch?.components.find((component) => component.sourceComponentId === '/XV-1') || null;
const fi = branch?.components.find((component) => component.sourceComponentId === '/FI-2') || null;
let result = null;
let constructionError = null;
try {
  result = runConstructionUntilBlocked(
    createSequentialConstructionSession(branchId),
    evidence,
    indexes,
    {},
  );
} catch (error) {
  constructionError = { name: error.name, message: error.message, stack: error.stack };
}
let confirmed = null;
let supportProjection = null;
let downstreamError = null;
if (result) {
  try {
    confirmed = createConfirmedSequentialConstruction(result.session, indexes);
    supportProjection = buildConfirmedConstructionSupportProjection(confirmed, indexes, {});
  } catch (error) {
    downstreamError = { name: error.name, message: error.message, stack: error.stack };
  }
}

mkdirSync('artifacts/sequential-sketcher', { recursive: true });
writeFileSync('artifacts/sequential-sketcher/shadow-carrier-probe.json', `${JSON.stringify({
  branch: branch ? {
    sourceRouteComponentCount: branch.sourceRouteComponentCount,
    shadowCarrierCount: branch.shadowCarrierCount,
    componentIds: branch.components.map((component) => ({
      sourceComponentId: component.sourceComponentId,
      canonicalType: component.canonicalType,
      sourceIndex: component.sourceIndex,
      shadowCarrierEvidence: component.shadowCarrierEvidence,
    })),
  } : null,
  evidenceAudit: evidence.audit,
  aliases: {
    primary: indexes.componentReferences.get('=REF/XV1')?.map((component) => component.sourceComponentId) || [],
    shadowName: indexes.componentReferences.get(shadowCarrierName)?.map((component) => component.sourceComponentId) || [],
    shadowRef: indexes.componentReferences.get('=SHADOW/PIPE1')?.map((component) => component.sourceComponentId) || [],
  },
  construction: result ? {
    state: result.session.state,
    outcomes: result.outcomes,
    confirmedComponents: result.session.confirmedComponentIds.map((id) => indexes.components.get(id)?.sourceComponentId),
    operations: result.session.strokeLedger.map((row) => ({ op: row.op, sourceComponentId: row.sourceComponentId, hasShadow: Boolean(row.shadowCarrierEvidence) })),
    connections: result.session.committedConnections,
    decision: result.session.currentDecisionRequest,
  } : null,
  constructionError,
  confirmedAudit: confirmed?.audit || null,
  supportProjection: supportProjection ? {
    glyphs: supportProjection.supportGlyphs,
    unresolved: supportProjection.unresolvedSupportFamilies,
    diagnostics: supportProjection.diagnostics,
    audit: supportProjection.audit,
    carriers: supportProjection.branchBundles.flatMap((bundle) => bundle.carriers),
  } : null,
  downstreamError,
}, null, 2)}\n`, 'utf8');

assert.equal(constructionError, null);
assert.ok(branch);
assert.ok(xv);
assert.ok(fi);
assert.equal(branch.sourceRouteComponentCount, 7);
assert.equal(branch.shadowCarrierCount, 2);
assert.equal(branch.components.length, 5);
assert.deepEqual(branch.components.map((component) => component.sourceComponentId), ['P0', '/XV-1', 'P2', '/FI-2', 'C1']);
assert.equal(evidence.audit.shadowCarrierCount, 2);
assert.equal(xv.shadowCarrierEvidence.sourceName, shadowCarrierName);
assert.equal(xv.shadowCarrierEvidence.orientation, 'SAME_DIRECTION');
assert.equal(fi.shadowCarrierEvidence.sourceName, `PIPE AUTO ${branchId} TAIL`);
assert.equal(fi.shadowCarrierEvidence.orientation, 'SAME_DIRECTION');
assert.equal(indexes.componentReferences.get('=REF/XV1')[0].componentId, xv.componentId);
assert.equal(indexes.componentReferences.get(shadowCarrierName)[0].componentId, xv.componentId);
assert.equal(indexes.componentReferences.get('=SHADOW/PIPE1')[0].componentId, xv.componentId);
assert.equal(result.session.state, 'ROUTE_COMPLETE');
assert.deepEqual(result.session.confirmedComponentIds.map((id) => indexes.components.get(id)?.sourceComponentId), ['P0', '/XV-1', 'P2', '/FI-2', 'C1']);
assert.equal(result.session.strokeLedger.filter((row) => row.op === 'DRAW_INSTRUMENT').length, 2);
assert.equal(result.session.strokeLedger.filter((row) => row.op === 'DRAW_PIPE').length, 2);
assert.equal(result.session.strokeLedger.some((row) => row.sourceComponentId?.startsWith('PIPE AUTO')), false);
assert.ok(result.session.strokeLedger.filter((row) => row.op === 'DRAW_INSTRUMENT').every((row) => row.shadowCarrierEvidence));
assert.equal(downstreamError, null);
assert.equal(confirmed.audit.shadowCarrierCount, 2);
assert.equal(supportProjection.supportGlyphs.length, 1);
assert.equal(supportProjection.unresolvedSupportFamilies.length, 0);
assert.equal(supportProjection.supportGlyphs[0].familyId, '/PS-SHADOW');
assert.equal(supportProjection.supportGlyphs[0].carrierId, xv.componentId, 'shadow pipe reference must resolve onto the primary instrument carrier');
assert.equal(supportProjection.audit.shadowCarrierCount, 2);
const carrier = supportProjection.branchBundles[0].carriers.find((row) => row.carrierId === xv.componentId);
assert.equal(carrier.supportFamilies.length, 1);

console.log('sequential shadow carrier tests passed');
