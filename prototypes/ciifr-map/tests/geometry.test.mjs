import test from 'node:test';
import assert from 'node:assert/strict';
import {buildXmlGraph} from '../xml-graph.js';
import {registerMethodC, registeredMethodCPoint} from '../../../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {findMethodCCandidates} from '../../../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import {methodCSvgScene} from '../../../tabs/cii-workspace/cii-workspace-method-c-svg.js';

function graph(points, links, seeds = [], member = 'SOURCE:test') {
  const byId = new Map(points.map(([id, xyz]) => [String(id), xyz]));
  const elements = links.map(([from, to], index) => ({index, from:String(from), to:String(to),
    delta: byId.get(String(to)).map((value, axis) => value - byId.get(String(from))[axis]),
    od:100, wall:5, witness:'INDEPENDENT_TEST_EDGE_' + index}));
  return buildXmlGraph({elements, seeds, profile:'INDEPENDENT_MATH_TEST', units:{length:'mm'},
    claimedCii:{status:'NOT_PRESENT'}}, {member, sha256:(member.startsWith('SOURCE') ? '1' : '2').repeat(64), byteLength:1});
}
const near = (actual, expected, tolerance = 1e-8) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= tolerance));

test('independently constructed 90-degree rigid transform is recovered without numerical rewrite', () => {
  const points = [[1,[0,0,0]],[2,[100,0,0]],[3,[100,70,0]],[4,[100,70,30]]];
  const expected = ([x,y,z]) => [-y+40,x-20,z+30];
  const source = graph(points, [[1,2],[2,3],[3,4]]);
  const target = graph(points.map(([id, xyz]) => [id+100,expected(xyz)]), [[101,102],[102,103],[103,104]],
    [{node:'101',xyz:expected(points[0][1])}], 'TARGET:test');
  const pose = registerMethodC(source,target,[1,2,3].map(id => ({source:String(id),target:String(id+100)})));
  assert.equal(pose.scale,1); assert.ok(Math.abs(pose.determinant-1) < 1e-10);
  assert.equal(pose.numericFitAcceptable,true); assert.equal(pose.qualified,false);
  source.nodes.forEach(node => near(registeredMethodCPoint(pose,node.xyz),expected(node.xyz)));
  const candidates = findMethodCCandidates(source,target,pose,{x:.001,y:.001,z:.001});
  assert.equal(candidates.nearSourceCount,4);
  candidates.rows.forEach(row => near(row.residual,[0,0,0]));
});

test('contradictory signed cycle and seeds fail closed, seedless components remain relative', () => {
  const points = [[1,[0,0,0]],[2,[10,0,0]],[3,[10,10,0]]];
  const valid = graph(points,[[1,2],[2,3],[3,1]]);
  assert.equal(valid.nodes.length,3);
  const edges = valid.edges.map(edge => ({...edge,delta:[...edge.delta]})); edges[2].delta[0] -= 1;
  assert.throws(() => buildXmlGraph({elements:edges,seeds:[]}, {member:'SOURCE',sha256:'1'.repeat(64)}), /CYCLE_CONFLICT/);
  assert.throws(() => graph(points,[[1,2],[2,3]], [{node:'1',xyz:[0,0,0]},{node:'3',xyz:[99,10,0]}]), /INCONSISTENT_COORDS_SEEDS/);
  assert.throws(() => graph(points,[[1,2],[2,3]], [{node:'999',xyz:[0,0,0]}]), /SEED_NOT_ENDPOINT/);
  const separate = graph([...points,[9,[100,0,0]],[10,[110,0,0]]],[[1,2],[2,3],[9,10]]);
  assert.equal(separate.components.length,2);
  assert(separate.coordinateFrames.every(frame => frame.coordinateFrame === 'RELATIVE_NO_XML_SEED'));
  assert.throws(() => registerMethodC(separate,separate,[{source:'1',target:'1'},{source:'9',target:'9'}]), /CROSS_DISCONNECTED_COMPONENTS/);
});

test('collinear and incompatible anchor geometry retains limitations', () => {
  const source = graph([[1,[0,0,0]],[2,[10,0,0]],[3,[20,0,0]]],[[1,2],[2,3]]);
  const degenerate = registerMethodC(source,source,[1,2,3].map(id => ({source:String(id),target:String(id)})));
  assert.equal(degenerate.status,'DEGENERATE_NONCOLLINEAR_BASIS');
  const target = graph([[101,[0,0,0]],[102,[12,0,0]]],[[101,102]],[], 'TARGET:test');
  const pose = registerMethodC(source,target,[{source:'1',target:'101'},{source:'2',target:'102'}]);
  assert.equal(pose.status,'INCOMPATIBLE_EXACT_TWO_ANCHORS'); assert.equal(pose.numericFitAcceptable,false);
});

test('all alternatives and contested target nodes are retained, even at a manual anchor', () => {
  const source = graph([[1,[0,0,0]],[2,[.05,0,0]]],[[1,2]]);
  const target = graph([[101,[0,0,0]],[102,[.1,0,0]]],[[101,102]],[],'TARGET:test');
  const pose = registerMethodC(source,target,[{source:'1',target:'101'}]);
  const alternatives = findMethodCCandidates(source,target,pose,{x:1,y:1,z:1});
  assert(alternatives.rows.every(row => row.alternatives.length === 2 && row.status === 'AMBIGUOUS'));
  assert.deepEqual(alternatives.collisionTargets,['101','102']);
  const collision = findMethodCCandidates(source,target,pose,{x:.06,y:0,z:0});
  assert.equal(collision.rows[0].status,'TARGET_COLLISION');
});

test('element-interior observation never creates a TARGET physical node', () => {
  const source = graph([[1,[0,0,0]],[2,[5,0,0]]],[[1,2]]);
  const target = graph([[101,[0,0,0]],[102,[10,0,0]]],[[101,102]],[],'TARGET:test');
  const pose = registerMethodC(source,target,[{source:'1',target:'101'}]);
  const candidates = findMethodCCandidates(source,target,pose,{x:.01,y:.01,z:.01});
  const row = candidates.rows.find(item => item.source === '2');
  assert.equal(row.status,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
  assert.equal(row.alternatives.length,0); assert.equal(row.segment.t,.5);
  assert.equal(target.nodes.length,2); assert.equal(row.writerEligible,false);
  const scene = methodCSvgScene({source,target,transform:pose,candidates,selectedSource:'2'});
  assert.match(scene.svg,/data-layer="segment-projection"/);
});
