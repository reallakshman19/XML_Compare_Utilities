import assert from 'assert';
import {
  BEND_GEOMETRY_AUDIT_CONTRACT,
  BEND_GEOMETRY_SIGNATURE_ALGORITHM,
  buildBendGeometryAudit,
  serializeBendGeometryAudit,
} from '../workbench3d/adapters/bend-geometry-audit.js';
import {
  bendDiagnosticsPanelHtml, buildBendDiagnosticsModel,
} from '../workbench3d/ui/bend-diagnostics-panel.js';

function arc(prefix, objectId, incomingObjectId, outgoingObjectId, radiusMm) {
  return {
    objectId: `${prefix}:${objectId}`,
    incomingObjectId: `${prefix}:${incomingObjectId}`,
    outgoingObjectId: `${prefix}:${outgoingObjectId}`,
    cornerNode: '20',
    radiusMm,
    angleDeg: 90,
    tangentMm: radiusMm,
    center: [800, 200, 0],
    points: [[800, 0, 0], [941.421356, 58.578644, 0], [1000, 200, 0]],
    directionEvidence: 'SOURCE_ORIENTATION_V1',
    packetSource: 'HOST_ELEMENT',
  };
}

function diagnostic(prefix, detailOrder = 'normal') {
  const details = detailOrder === 'normal'
    ? { cornerNode: '40', incomingCount: 2, outgoingCount: 1 }
    : { outgoingCount: 1, incomingCount: 2, cornerNode: '40' };
  return {
    objectId: `${prefix}:E9`,
    packetIndex: 0,
    severity: 'BLOCKED',
    code: 'BEND_CONSUMED_LEGS_AMBIGUOUS',
    message: 'Consumed bend requires one incoming and one outgoing source leg.',
    ...details,
  };
}

function plan(prefix, reverse = false, radiusMm = 200) {
  const arcs = [
    arc(prefix, 'E2', 'E1', 'E3', radiusMm),
    { ...arc(prefix, 'E6', 'E5', 'E7', 300), cornerNode: '60' },
  ];
  const diagnostics = [diagnostic(prefix, reverse ? 'reversed' : 'normal')];
  if (reverse) arcs.reverse();
  return {
    summary: { requested: 3, resolved: 2, blocked: 1, arcSegments: 4 },
    arcs,
    diagnostics,
  };
}

const source = buildBendGeometryAudit(
  { contract: 'CanonicalObjectGraph.v1', modelId: 'source' },
  plan('source'),
);
const target = buildBendGeometryAudit(
  { contract: 'CanonicalObjectGraph.v1', modelId: 'target' },
  plan('target', true),
);

assert.strictEqual(source.contract, BEND_GEOMETRY_AUDIT_CONTRACT);
assert.strictEqual(source.signatureAlgorithm, BEND_GEOMETRY_SIGNATURE_ALGORITHM);
assert.match(source.signature, /^wb3d-bend-[0-9a-f]{8}$/);
assert.strictEqual(source.signature, target.signature, 'model prefix and row order do not affect semantic signature');
assert.deepStrictEqual(source.payload, target.payload, 'canonical payload is model-neutral and order-stable');
assert.strictEqual(source.payload.summaryConsistent, true);
assert.strictEqual(source.payload.arcs.length, 2);
assert.strictEqual(source.payload.diagnostics.length, 1);

const serialized = serializeBendGeometryAudit(source);
assert.strictEqual(serialized, serializeBendGeometryAudit(source), 'audit serialization is deterministic');
assert.strictEqual(JSON.parse(serialized).signature, source.signature);
assert.strictEqual(JSON.parse(serialized).modelId, 'source');

const changed = buildBendGeometryAudit(
  { contract: 'CanonicalObjectGraph.v1', modelId: 'source' },
  plan('source', false, 201),
);
assert.notStrictEqual(changed.signature, source.signature, 'material bend geometry changes the signature');

const visual = (audit) => ({
  bendSummary: audit.payload.declaredSummary,
  geometryDiagnostics: audit.payload.diagnostics,
  bendAudit: audit,
});
const state = {
  sourceName: 'source.xml',
  targetName: 'target.xml',
  visuals: { A: visual(source), B: visual(target) },
};
const model = buildBendDiagnosticsModel(state);
assert.strictEqual(model.auditParity, 'MATCH');
assert.strictEqual(model.source.signature, source.signature);
const html = bendDiagnosticsPanelHtml(state);
assert.match(html, /audit MATCH/);
assert.match(html, /Export audit JSON/);
assert.match(html, /data:application\/json;charset=utf-8/);
assert.match(html, new RegExp(source.signature));

const differentModel = buildBendDiagnosticsModel({
  ...state,
  visuals: { A: visual(source), B: visual(changed) },
});
assert.strictEqual(differentModel.auditParity, 'DIFFERENT');

console.log('workbench3d-bend-geometry-audit.test.js passed');
