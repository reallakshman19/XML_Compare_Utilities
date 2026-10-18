/** PR127: production Method C AUTO over untouched original S1/T neutral CII bytes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';

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
  });
