/**
 * Directional restraint rendering contract.
 * Real CAESAR restraint semantics are projected into one REST arrow, two
 * lateral GUIDE arrows, and two axial LINESTOP arrows without browser state.
 */

import assert from 'node:assert/strict';
import { buildCanonicalRestraintGeometry } from '../tabs/topology-trace-validator/topology-3d-visual-model.js';

const canonical = {
  nodes: [
    { id: 'N1', position: { x: 0, y: 0, z: 0 } },
    { id: 'N2', position: { x: 1000, y: 0, z: 0 } },
  ],
  edges: [{ id: 'E1', fromNodeId: 'N1', toNodeId: 'N2' }],
  supports: [
    { id: 'S-REST', nodeId: 'N1', restraints: [{ kind: 'REST', type: '+Y', direction: '+Y' }] },
    { id: 'S-GUIDE', nodeId: 'N1', restraints: [{ kind: 'GUIDE', type: 'GUI', direction: 'GUI' }] },
    { id: 'S-LINESTOP', nodeId: 'N2', restraints: [{ kind: 'LINESTOP', type: 'LIM', direction: 'LIM' }] },
  ],
};

const geometry = buildCanonicalRestraintGeometry(canonical);
const arrows = geometry.markers.filter((marker) => marker.kind === 'RESTRAINT_ARROW');
assert.equal(geometry.segments.length, 5);
assert.equal(arrows.length, 5);
assert.deepEqual(arrows.filter((row) => row.objectId === 'S-REST').map((row) => row.direction), [[0, 1, 0]]);
assert.deepEqual(arrows.filter((row) => row.objectId === 'S-GUIDE').map((row) => row.direction), [[0, 0, 1], [0, 0, -1]]);
assert.deepEqual(arrows.filter((row) => row.objectId === 'S-LINESTOP').map((row) => row.direction), [[-1, 0, 0], [1, 0, 0]]);
assert(geometry.markers.filter((marker) => marker.kind === 'SUPPORT').every((marker) => marker.isObjectMarker));

console.log('topology 3D restraint geometry passed: REST, GUIDE, and LINESTOP arrows verified.');
