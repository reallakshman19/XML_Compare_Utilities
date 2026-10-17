import test from 'node:test';
import assert from 'node:assert/strict';
import { methodCProperFrameProposal } from '../tabs/cii-workspace/cii-workspace-method-c-proper-frame.js';
import { readFileSync } from 'node:fs';
const source = [112, -343, 501];
const directions = [[1000, 0, 0], [0, 1400, 350]];
const mul = (m, p) => m.map(row => row.reduce((sum, c, i) => sum + c * p[i], 0));
const rads = degrees => degrees * Math.PI / 180;
function euler(x, y, z) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rads(x)), Math.sin(rads(x)),
    Math.cos(rads(y)), Math.sin(rads(y)), Math.cos(rads(z)), Math.sin(rads(z))];
  return [[cz*cy, cz*sy*sx-sz*cx, cz*sy*cx+sz*sx],
    [sz*cy, sz*sy*sx+cz*cx, sz*sy*cx-cz*sx], [-sy, cy*sx, cy*cx]];
}
function close(a, b, tol=1e-8) {
  assert.ok(Math.abs(a-b)<tol, `expected ${b}, actual ${a}`);
}
for (const e of [[-31,67,43],[125,41,-67]]) {
  test(`proper compound rotation without Euler input ${e.join(',')}`, () => {
    const R=euler(...e), t=[500,-200,1200];
    const target=mul(R,source).map((v,i)=>v+t[i]);
    const fit=methodCProperFrameProposal({sourceAnchor:source,targetAnchor:target,
      sourceVectors:directions,targetVectors:directions.map(d=>mul(R,d))});
    assert.equal(fit.status,'GEOMETRIC_FRAME_PROPOSAL_UNVERIFIED');
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(fit.rotation[i][j],R[i][j]);
    fit.translation.forEach((v,i)=>close(v,t[i]));
    close(fit.determinant,1);
    assert.equal(fit.qualified,false);assert.equal(fit.identified,false);
    assert.equal(fit.writerEligible,false);
  });
}
test('all XY / XZ / YZ noncollinear bases accepted',()=>{
  const bases=[[[1000,0,0],[0,500,0]],[[1000,0,0],[0,0,500]],
    [[0,1000,0],[0,0,500]]];
  for(const vectors of bases){
    const fit=methodCProperFrameProposal({sourceAnchor:[0,0,0],targetAnchor:[4,5,6],
      sourceVectors:vectors,targetVectors:vectors});
    assert.equal(fit.status,'GEOMETRIC_FRAME_PROPOSAL_UNVERIFIED');
  }
});
test('true collinearity, length/angle mismatches refuse pose',()=>{
  const args={sourceAnchor:[0,0,0],targetAnchor:[0,0,0],
    sourceVectors:[[1000,0,0],[0,1000,0]],targetVectors:[[1000,0,0],[0,1000,0]]};
  assert.equal(methodCProperFrameProposal({...args,targetVectors:[[1000,0,0],[2000,0,0]]}).rotation,null);
  assert.equal(methodCProperFrameProposal({...args,targetVectors:[[999,0,0],[0,1000,0]]}).rotation,null);
  assert.equal(methodCProperFrameProposal({...args,targetVectors:[[1000,0,0],[100,995,0]]}).rotation,null);
  assert.throws(()=>methodCProperFrameProposal({...args,sourceAnchor:[NaN,0,0]}));
});
test('exact source/docs deploy mirror',()=>{
  const a=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-method-c-proper-frame.js',import.meta.url));
  const b=readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-proper-frame.js',import.meta.url));
  assert.ok(a.equals(b));
});
