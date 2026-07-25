import assert from 'node:assert/strict';
import { resolvePipelineGreBendMaterializationPlan } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-bend-materialization.js';
import {
  PIPELINE_INPUTXML_GRE_BEND_PROJECTION_SCHEMA,
  PIPELINE_INPUTXML_GRE_PROJECTED_ELEMENT_SCHEMA,
  PIPELINE_INPUTXML_GRE_PROJECTION_PLAN_SCHEMA,
  buildPipelineInputXmlGreProjectionPlan,
  buildPipelineInputXmlGreProjectionPlanJson,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-inputxml-gre-projection.js';
import { createPipelineGreMaterializationFixture } from './pipeline-3d-model-gre-bend-materialization-fixtures.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const project = (options = {}) => {
  const fixture = createPipelineGreMaterializationFixture(options);
  const materializationPlan = resolvePipelineGreBendMaterializationPlan(fixture.input);
  assert.equal(materializationPlan.ready, true, materializationPlan.blockerCodes.join(', '));
  return { materializationPlan, projection: buildPipelineInputXmlGreProjectionPlan({ materializationPlan }) };
};

for (const applicationValue of ['EACH_LEG_FROM_CORNER', 'EACH_LEG_FROM_TANGENCY']) {
  const { materializationPlan, projection } = project({ applicationValue,
    breakLengthMm: applicationValue === 'EACH_LEG_FROM_TANGENCY' ? 200 : 400 });
  assert.equal(projection.schema, PIPELINE_INPUTXML_GRE_PROJECTION_PLAN_SCHEMA);
  assert.equal(projection.ready, true, `${applicationValue}: ${projection.blockerCodes.join(', ')}`);
  assert.equal(projection.writerAdmission, 'READY');
  assert.equal(projection.coordinateRouteAdopted, false);
  assert.equal(projection.canvasAdopted, false);
  assert.equal(projection.projectedElements.length, materializationPlan.materializedModel.elements.length);
  assert.equal(projection.bendProjections.length, 1);
  assert.equal(Object.isFrozen(projection), true);

  const bend = projection.bendProjections[0];
  assert.equal(bend.schema, PIPELINE_INPUTXML_GRE_BEND_PROJECTION_SCHEMA);
  const owner = projection.projectedElements.find((item) => item.id === bend.ownerProjectionElementId);
  assert.equal(owner.schema, PIPELINE_INPUTXML_GRE_PROJECTED_ELEMENT_SCHEMA);
  assert.equal(owner.elementKind, 'GRE_BEND');
  assert.deepEqual(owner.bend, bend);
  assert.equal(owner.fromNode, bend.incomingTangencyNodeNumber);
  assert.equal(owner.toNode, bend.outgoingTangencyNodeNumber);
  assert.equal(bend.outgoingSourceElementIndex, bend.incomingSourceElementIndex + 1);
  assert.equal(bend.bendBreakLengthApplication, applicationValue);

  const inactive = new Set(projection.inactiveCornerReferences);
  assert.equal(projection.projectedElements.some((item) => inactive.has(item.fromMaterializedNodeId)
    || inactive.has(item.toMaterializedNodeId)), false);
  for (const sourceIndex of [bend.incomingSourceElementIndex, bend.outgoingSourceElementIndex]) {
    const conservation = projection.sourceElementConservation.find((item) =>
      item.sourceElementIndex === sourceIndex);
    assert.ok(conservation.successorMaterializedElementIds.includes(bend.ownerMaterializedElementId));
    assert.ok(conservation.emittedElementIds.includes(bend.ownerProjectionElementId));
  }
}

{
  const forward = project({ twoBends: true, breakLengthMm: 500 });
  const reverse = project({ twoBends: true, breakLengthMm: 500, reverse: true });
  assert.equal(buildPipelineInputXmlGreProjectionPlanJson(forward.projection),
    buildPipelineInputXmlGreProjectionPlanJson(reverse.projection));
  assert.equal(forward.projection.bendProjections.length, 2);
  assert.equal(forward.projection.projectedElements.some((item) =>
    item.lineageDisposition === 'COINCIDENT_ENVELOPE_CONTACT'), true);
}

{
  const { materializationPlan } = project();
  const forged = clone(materializationPlan);
  forged.materializedModel.bendComponents[0].inactiveCornerReferenceId = 'route-node:100';
  const projection = buildPipelineInputXmlGreProjectionPlan({ materializationPlan: forged });
  assert.equal(projection.ready, false);
  assert.ok(projection.blockerCodes.includes('PIPELINE_INPUTXML_GRE_BEND_OWNERSHIP_INVALID'));
  assert.deepEqual(projection.projectedElements, []);
  assert.deepEqual(projection.bendProjections, []);
}

{
  const { materializationPlan } = project();
  const forged = clone(materializationPlan);
  forged.materializedModel.elements[1].materializedElementId =
    forged.materializedModel.elements[0].materializedElementId;
  const projection = buildPipelineInputXmlGreProjectionPlan({ materializationPlan: forged });
  assert.equal(projection.ready, false);
  assert.ok(projection.blockerCodes.includes('PIPELINE_INPUTXML_GRE_ELEMENT_IDENTITY_INVALID'));
  assert.deepEqual(projection.projectedElements, []);
}

{
  const projection = buildPipelineInputXmlGreProjectionPlan({ materializationPlan: {
    schema: 'PipelineGreBendMaterializationPlan.v1', ready: false,
    diagnostics: [{ severity: 'BLOCKING', code: 'TEST_BLOCKER', message: 'TEST_BLOCKER', details: {} }],
    blockerCodes: ['TEST_BLOCKER'], materializedModel: null,
  } });
  assert.equal(projection.ready, false);
  assert.equal(projection.writerAdmission, 'BLOCKED');
  assert.ok(projection.blockerCodes.includes('PIPELINE_INPUTXML_GRE_MATERIALIZATION_UNAUTHENTICATED'));
  assert.deepEqual(projection.projectedElements, []);
  assert.deepEqual(projection.bendProjections, []);
}

console.log('pipeline-3d-model InputXML GRE projection: PASS');
