import assert from 'node:assert/strict';
import { createPipelineGreCaesarBendFieldMapping,
  buildPipelineGreCaesarBendFieldMatrixTsv } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-bend-field-mapping.js';
import { qualifiedFixture, qualifiedFieldMapping } from './pipeline-gre-caesar-test-fixtures.js';

const fixture = qualifiedFixture();
const mapping = qualifiedFieldMapping(fixture);
assert.equal(mapping.ready, true);
assert.equal(mapping.bendTypeDisposition, 'EMIT_NUMERIC');
assert.equal(mapping.bendTypeCode, 3);
assert.equal(mapping.numMiterDisposition, 'OMIT_ATTRIBUTE');
assert.equal(mapping.numMiterValue, null);
assert.equal(mapping.curvatureNodeDisposition, 'NO_CURVATURE_NODES_REQUIRED');
assert.deepEqual(mapping.curvatureNodes, []);
assert.equal(mapping.overallTurnAngleDisposition, 'OVERALL_ANGLE_EVIDENCE_ONLY');
assert.equal(Object.isFrozen(mapping), true);
assert.doesNotMatch(JSON.stringify(mapping), /turnAngleDeg|ANGLE1|NODE1/);
const tsv = buildPipelineGreCaesarBendFieldMatrixTsv([mapping]);
assert.equal(tsv, buildPipelineGreCaesarBendFieldMatrixTsv([structuredClone(mapping)]));

const typeConflict = qualifiedFieldMapping(qualifiedFixture({ typeValue: 1 }));
assert.equal(typeConflict.ready, false);
assert.ok(typeConflict.blockerCodes.includes('PIPELINE_GRE_CAESAR_BEND_TYPE_UNRESOLVED'));
const miterConflict = qualifiedFieldMapping(qualifiedFixture({ numMiterAttributePresent: true, numMiterValue: 0 }));
assert.equal(miterConflict.ready, false);
assert.ok(miterConflict.blockerCodes.includes('PIPELINE_GRE_CAESAR_NUM_MITER_UNRESOLVED'));

const sentinelFixture = qualifiedFixture({ numMiterAttributePresent: true, numMiterValue: -1.0101 });
const sentinel = qualifiedFieldMapping(sentinelFixture, {
  numMiterDisposition: 'PRESERVE_QUALIFIED_SENTINEL', numMiterValue: -1.0101,
});
assert.equal(sentinel.ready, true);
const wrongSentinel = qualifiedFieldMapping(sentinelFixture, {
  numMiterDisposition: 'PRESERVE_QUALIFIED_SENTINEL', numMiterValue: -9,
});
assert.equal(wrongSentinel.ready, false);

const curvatureFixture = qualifiedFixture({ curvatureNodes: [{ angle: 45, node: 109 }] });
const curvature = qualifiedFieldMapping(curvatureFixture, {
  curvatureNodeDisposition: 'EXACT_CURVATURE_NODES_REQUIRED', curvatureNodes: [{ angle: 45, node: 109 }],
});
assert.equal(curvature.ready, true);
const forged = createPipelineGreCaesarBendFieldMapping({ ...structuredClone(curvature),
  fixtureIds: [fixture.fixtureId], fixtures: [fixture], curvatureNodes: [{ angle: 90, node: 110 }] });
assert.equal(forged.ready, false);
assert.ok(forged.blockerCodes.includes('PIPELINE_GRE_CAESAR_CURVATURE_NODE_POLICY_UNRESOLVED'));
console.log('pipeline GRE CAESAR bend field mapping: PASS');
