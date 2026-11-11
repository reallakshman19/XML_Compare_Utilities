/** PR127: production Method C AUTO over untouched original S1/T neutral CII bytes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import { createMethodCASidecar, assertMethodCASidecarCurrent } from '../tabs/cii-workspace/cii-workspace-method-c-a-sidecar.js';
import { methodCAReviewMarkup } from '../tabs/cii-workspace/cii-workspace-method-c-a-review-markup.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const SOURCE_SHA = '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b';
const TARGET_SHA = 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';
const readOriginal = async id => new Uint8Array(await readFile(path.join(repo, 'Benchmark', id + '.CII')));

test('I126 genuine S1 3910→T875 signed AUTO evidence stays A-only; 4060 is T ELEMENT 900–905, not T NODE',
  { timeout: 180000 }, async () => {
    const [source, target] = await Promise.all([
      buildOriginalGraphFromBytes({bytes: await readOriginal('S1'), member: 'S1', expectedSha256: SOURCE_SHA}),
      buildOriginalGraphFromBytes({bytes: await readOriginal('T'), member: 'T', expectedSha256: TARGET_SHA}),
    ]);
    assert.equal(source.byteAuthority, 'ORIGINAL_BYTES');
    assert.equal(target.byteAuthority, 'ORIGINAL_BYTES');
    assert.equal(source.nodes.length, 57);
    assert.equal(target.components[target.nodeIndex.get('875').component].length, 767);
    const pose = registerMethodC(source, target,
      [{source: '3910', target: '875', member: 'S1', sourceSha: SOURCE_SHA,
        targetSha: TARGET_SHA, role: 'experimental-unverified'}],
      {orientationMode: 'AUTO_GEOMETRIC_PREVIEW'});
    assert.equal(pose.status, 'UNVERIFIED_GEOMETRIC_PREVIEW', pose.reason || 'AUTO HOLD');
    assert.equal(pose.originalDiscovery.counts.possible, 300);
    assert.equal(pose.originalDiscovery.counts.visited, 300);
    assert.equal(pose.originalDiscovery.admissiblePoseIds.length, 1);
    assert.ok(pose.originalDiscovery.hypotheses.some(h =>
      h.admissible && h.heldOut?.independent && h.heldOut?.signedOutOfPlaneWitness));
    assert.equal(pose.qualified, false);
    assert.equal(pose.ownerAnchorAuthenticated, false);
    assert.equal(pose.writerEligible, false);
    assert.equal(pose.applyAuthorized, false);
    const candidates = findMethodCCandidates(source, target, pose, {x: 100, y: 100, z: 100});
    assert.equal(candidates.rows.length, 57);
    assert.equal(candidates.nearSourceCount, 41);
    assert.equal(candidates.qualifiedIdentityCount, 0);
    assert.ok(candidates.rows.every(row =>
      row.writerEligible === false && row.physicalNodeCorrespondenceQualified === false));
    const node4060 = candidates.rows.find(row => row.source === '4060');
    assert.equal(node4060.status, 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
    assert.equal(node4060.target, null);
    assert.deepEqual(node4060.alternatives, []);
    assert.deepEqual(node4060.segment.between, ['900', '905']);
    assert.equal(node4060.segment.witness, 'ELEMENTS#179:15rows:2671-2685');
    assert.ok(Math.abs(node4060.segment.t - 0.76175) < 1e-7);
    assert.ok(node4060.segment.distance < 0.01);
    const context = {
      sourceSetSha256: '5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3',
      sourceId: 'S1', sessionEpoch: 1, sourceGraph: source, targetGraph: target,
      registration: pose, candidates, tolerance: {x: 100, y: 100, z: 100},
    };
    const evidence = createMethodCASidecar(context);
    const sidecar4060 = evidence.rows.find(row => row.sourceNode === '4060');
    assert.equal(evidence.rows.length, 57);
    assert.equal(evidence.qualifiedPhysicalIdentityCount, 0);
    assert.equal(evidence.writerEligible, false);
    assert.equal(evidence.applyAuthorized, false);
    assert.deepEqual(evidence.mutationOperations, []);
    assert.equal(Object.isFrozen(evidence), true);
    assert.equal(sidecar4060.selectedPhysicalTarget, null);
    assert.deepEqual(sidecar4060.segmentOnly.endpoints, ['900', '905']);
    assert.equal(sidecar4060.segmentOnly.originalWitness, 'ELEMENTS#179:15rows:2671-2685');
    const html = methodCAReviewMarkup(evidence);
    assert.match(html, /4060/);
    assert.match(html, /ELEMENTS#179:15rows:2671-2685/);
    assert.doesNotMatch(html, /data-ciiw-method-c-apply/);
    assertMethodCASidecarCurrent(evidence, {
      sourceSetSha256: context.sourceSetSha256, sourceId: 'S1', sessionEpoch: 1,
      sourceOriginalSha256: SOURCE_SHA, targetOriginalSha256: TARGET_SHA,
    });
    assert.throws(() => assertMethodCASidecarCurrent(evidence, {
      sourceSetSha256: context.sourceSetSha256, sourceId: 'S1', sessionEpoch: 2,
      sourceOriginalSha256: SOURCE_SHA, targetOriginalSha256: TARGET_SHA,
    }), /STALE_EVIDENCE/);
    const forgedCandidates = {...candidates, rows: candidates.rows.map((row, i) =>
      i === 0 ? {...row, identityBound: true} : row)};
    assert.throws(() => createMethodCASidecar({...context, candidates: forgedCandidates}),
      /UNAUTHORIZED_CANDIDATE/);
  });
