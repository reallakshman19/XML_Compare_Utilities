import assert from 'node:assert/strict';
import {
  buildSequentialEvidenceModel,
  indexSequentialEvidence,
} from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import {
  createSequentialConstructionSession,
  runConstructionUntilBlocked,
} from '../tabs/sequential-sketcher/construction/sequential-construction-engine.js';

const SOURCE_COMMIT = 'd5fda9c95fda9bba9b6b05171628ba16778a7667';
const SOURCE_URL = `https://raw.githubusercontent.com/reallaksh19/3D_Converters/${SOURCE_COMMIT}/Benchmarks/1885_NC/1885_NC.json`;
const ROOT_BRANCH = '/ASIM-1885-6"-S8811951-91261M7-HC-01/B3';
const MAX_REFERENCE_DEPTH = 2;
const MAX_BRANCHES = 40;

function branchId(record) {
  return String(record?.attributes?.NAME || record?.name || '').trim();
}

function references(record) {
  const values = [record?.attributes?.HREF, record?.attributes?.TREF];
  for (const child of Array.isArray(record?.children) ? record.children : []) {
    values.push(child?.attributes?.CREF);
  }
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function collectReferenceClosure(records, rootId) {
  const index = new Map(records.map((record) => [branchId(record), record]).filter(([id]) => id));
  const queue = [{ id: rootId, depth: 0 }];
  const selected = [];
  const seen = new Set();
  const missingReferences = [];

  while (queue.length && selected.length < MAX_BRANCHES) {
    const current = queue.shift();
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    const record = index.get(current.id);
    if (!record) {
      missingReferences.push({ source: current.source || null, target: current.id, depth: current.depth });
      continue;
    }
    selected.push(record);
    if (current.depth >= MAX_REFERENCE_DEPTH) continue;
    for (const target of references(record)) {
      queue.push({ id: target, depth: current.depth + 1, source: current.id });
    }
  }

  return { selected, missingReferences };
}

function countTypes(branches) {
  const counts = new Map();
  for (const branch of branches) {
    for (const child of Array.isArray(branch?.children) ? branch.children : []) {
      const type = String(child?.type || child?.attributes?.TYPE || 'UNKNOWN').toUpperCase();
      counts.set(type, (counts.get(type) || 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function summarizeMissingPorts(evidence) {
  return evidence.components
    .filter((component) => !component.ports.length || component.ports.some((port) => !port.sourcePosition))
    .map((component) => ({
      branchId: component.branchId,
      sourceComponentId: component.sourceComponentId,
      canonicalType: component.canonicalType,
      portRoles: component.ports.map((port) => port.role),
      positionedPortCount: component.ports.filter((port) => port.sourcePosition).length,
    }));
}

const response = await fetch(SOURCE_URL, { headers: { 'user-agent': 'sequential-sketcher-regression' } });
assert.equal(response.ok, true, `Unable to fetch pinned 1885_NC fixture: ${response.status}`);
const records = await response.json();
assert.ok(Array.isArray(records), '1885_NC fixture must be a JSON array');

const root = records.find((record) => branchId(record) === ROOT_BRANCH);
assert.ok(root, `Pinned fixture must contain ${ROOT_BRANCH}`);

const { selected, missingReferences } = collectReferenceClosure(records, ROOT_BRANCH);
assert.ok(selected.length >= 1, 'reference closure must contain the root branch');
const immutableSnapshot = JSON.stringify(selected);
const evidence = buildSequentialEvidenceModel(selected);
const indexes = indexSequentialEvidence(evidence);
const session = createSequentialConstructionSession(ROOT_BRANCH);
const result = runConstructionUntilBlocked(session, evidence, indexes, {
  exactToleranceMm: 1,
  autoRepairToleranceMm: 25,
  candidateSearchRadiusMm: 250,
});

assert.equal(JSON.stringify(selected), immutableSnapshot, 'construction must not mutate pinned source evidence');
assert.notEqual(result.session.state, 'FAILED', 'real fixture construction must stop safely rather than fail');
assert.ok(result.session.confirmedComponentIds.length > 0, 'real fixture must confirm at least the first component');
assert.equal(result.session.strokeLedger.some((command) => command.op === 'DISCONNECTED_FRAGMENT'), false);
if (result.session.state === 'USER_DECISION_REQUIRED') {
  assert.ok(result.session.currentDecisionRequest, 'blocked construction must expose one decision request');
}

const rootEvidence = indexes.branches.get(ROOT_BRANCH);
const report = {
  schema: 'Sequential1885NcProbe.v1',
  sourceCommit: SOURCE_COMMIT,
  rootBranchId: ROOT_BRANCH,
  selectedBranchIds: evidence.branches.map((branch) => branch.branchId),
  missingReferences,
  rawChildTypeCounts: countTypes(selected),
  rootSourceChildCount: Array.isArray(root.children) ? root.children.length : 0,
  rootRecognizedComponentCount: rootEvidence?.components.length || 0,
  rootRecognizedTypes: Object.fromEntries(
    [...new Set((rootEvidence?.components || []).map((component) => component.canonicalType))]
      .sort()
      .map((type) => [type, rootEvidence.components.filter((component) => component.canonicalType === type).length]),
  ),
  missingOrPartialPorts: summarizeMissingPorts(evidence),
  finalState: result.session.state,
  outcomes: result.outcomes,
  confirmedComponentCount: result.session.confirmedComponentIds.length,
  committedConnectionCount: result.session.committedConnections.length,
  repairCount: result.session.repairLedger.length,
  pendingJunctionCount: result.session.pendingBranchJunctions.length,
  blockedReason: result.session.currentDecisionRequest?.reason || null,
  candidateCount: result.session.currentDecisionRequest?.candidates?.length || 0,
  candidateSummary: (result.session.currentDecisionRequest?.candidates || []).slice(0, 10).map((candidate) => ({
    targetBranchId: candidate.targetBranchId,
    targetSourceComponentId: candidate.targetSourceComponentId,
    gapMm: Number(candidate.gapMm.toFixed(3)),
    directionAngleDeg: candidate.directionAngleDeg === null ? null : Number(candidate.directionAngleDeg.toFixed(3)),
    boreCompatibility: candidate.boreCompatibility,
    sourceAdjacent: candidate.sourceAdjacent,
    referenceMatch: candidate.referenceMatch,
    eligible: candidate.eligible,
  })),
  committedOperations: result.session.strokeLedger.map((command) => command.op),
};

console.log(JSON.stringify(report, null, 2));
