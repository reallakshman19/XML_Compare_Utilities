import test from 'node:test';
import assert from 'node:assert/strict';
import { fitProperRigidAnchors } from '../tabs/cii-workspace/cii-workspace-method-c-rigid-fit.js';
const axis = [1, 2, 3].map((v) => v / Math.sqrt(14));
const angle = 0.728, c = Math.cos(angle), s = Math.sin(angle);
const r = Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) =>
  (i === j ? c : 0) + (1 - c) * axis[i] * axis[j] + s * [[0,-axis[2],axis[1]],[axis[2],0,-axis[0]],[-axis[1],axis[0],0]][i][j]));
const source = [[0,0,0],[800,0,0],[0,450,0],[0,0,650],[200,300,500],[600,-100,380]];
const transform = (p) => r.map((row, i) => row.reduce((sum, v, j) => sum + v * p[j], 0) + [194,-303,87][i]);
const pairs = (target) => source.map((p, i) => ({ source: { xyz: p }, target: { xyz: target[i] } }));
const gap = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
test('six noncoplanar anchors produce exact proper unit-scale transform', () => {
  const fit = fitProperRigidAnchors(pairs(source.map(transform)));
  assert.ok(fit.rmsResidualMm < 1e-8);
  assert.ok(fit.maxResidualMm < 1e-8);
  assert.ok(gap(fit.translation, [194,-303,87]) < 1e-8);
  assert.ok(fit.rotation.every((row,i)=>gap(row,r[i])<1e-8));
});
test('least-squares fit remains order independent with measurement noise', () => {
  const measured = source.map((p,i) => transform(p).map((v,j)=>v+0.35*Math.sin(i*7+j*3)));
  const p = pairs(measured), a = fitProperRigidAnchors(p), b = fitProperRigidAnchors(p.toReversed());
  assert.ok(a.rmsResidualMm < 0.5);
  assert.ok(a.rmsResidualMm > 0.01);
  assert.ok(Math.abs(a.rmsResidualMm - b.rmsResidualMm) < 1e-9);
});
test('mirrored anchor configuration retains large residual', () => {
  const mirror = source.map(([x,y,z]) => [-x+400,y+300,z-20]);
  const fit = fitProperRigidAnchors(pairs(mirror));
  assert.ok(fit.maxResidualMm > 1);
  assert.ok(fit.rmsResidualMm > 1);
});
test('degenerate, underdetermined and invalid inputs fail closed', () => {
  const line = [[0,0,0],[100,0,0],[200,0,0]];
  assert.equal(fitProperRigidAnchors(line.map((p)=>({ source: {xyz:p}, target: {xyz:p} }))), null);
  assert.throws(()=>fitProperRigidAnchors([]), /RIGID_MINIMUM_THREE_ANCHORS/);
  assert.throws(()=>fitProperRigidAnchors(pairs(source.map(transform)), {minSinAngle:NaN}), /RIGID_MIN_SIN_POLICY_INVALID/);
});
