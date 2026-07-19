import assert from 'node:assert/strict';
import { projectEngineeringGeometry } from '../core/engineering-svg/index.js';
import { runEngineeringSvgAdapterConformance } from '../core/engineering-svg/engineering-svg-adapter-conformance.js';
import { parseTable1 } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';
import {
  framesFromTable1,
  parseTable2Paste,
  parseTable3Paste,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-parser.js';
import {
  SAMPLE_TABLE_2_PASTE_MULTISHEET,
  SAMPLE_TABLE_3_PASTE_MULTISHEET,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-samples.js';
import { SAMPLE_TABLE_1_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-samples.js';
import { buildPipelineProjectOutputs } from '../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js';
import { createPipelineEngineeringSvgAdapter } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-adapter.js';
import { buildPipelineEngineeringSvgScene } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-scene.js';
import { createPipelineEngineeringRevisionToken } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-view-model.js';

function fixture() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  const branchInfo = Object.freeze({
    branchName: 'PL-ESVG', lineNo: 'PL-ESVG', boreMm: '914.4', wallThickness: '12.7',
    p1: '55', t1: '80', t2: '40', t3: '20', fluidDensity: '850', materialCode: '106',
    corrosionAllowance: '3', insulationThickness: '50', insulationDensity: '120', hydroPressure: '82.5',
  });
  const output = buildPipelineProjectOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET, table2Text: '', table3Text: '',
    profileRaw: { table2a: table2.rawText, table3a: table3.table3ARaw, table3b: table3.table3BRaw, table3c: table3.table3CRaw },
    branchInfo,
  });
  const revision = createPipelineEngineeringRevisionToken({
    projectRevision: 'fixture-project-r1', geometryRevision: 'fixture-propagation-r1', processConfigRevision: 'fixture-process-r1',
  });
  return Object.freeze({ output, branchInfo, revision });
}

function plainPoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}

const snapshot = fixture();
const before = JSON.stringify(snapshot);
const built = buildPipelineEngineeringSvgScene(snapshot, { sceneId: 'pipeline-fixture' });
const { scene, parity } = built;
assert.equal(JSON.stringify(snapshot), before, 'scene mapping must not mutate Pipeline output or process configuration');
assert.equal(parity.passed, true);
assert.equal(parity.totalMapped, parity.totalExpected);
assert.equal(scene.coordinateSystem.unit, 'mm');
assert.equal(scene.coordinateSystem.verticalAxis, 'Z');
assert.equal(scene.coordinateSystem.frame, 'GLOBAL');
assert.equal(scene.capabilities.editing, false);
assert.deepEqual(scene.revision.value, {
  schema: 'PipelineEngineeringRevision.v1', owner: 'pipeline-3d-model',
  projectRevision: 'fixture-project-r1', geometryRevision: 'fixture-propagation-r1', processConfigRevision: 'fixture-process-r1',
});

const rowEntities = scene.entities.filter((entity) => entity.geometry.kind === 'point')
  .sort((left, right) => left.metadata.pipeline.sourceIndex - right.metadata.pipeline.sourceIndex);
assert.equal(rowEntities.length, snapshot.output.coordinateRows.length);
rowEntities.forEach((entity, index) => {
  const row = snapshot.output.coordinateRows[index];
  assert.deepEqual(plainPoint(entity.geometry.position), { x: row.x, y: row.y, z: row.z });
  assert.equal(entity.id, `pipeline:${row.branchName}:node:${row.nodeNumber}`);
});

const segmentEntities = scene.entities.filter((entity) => entity.geometry.kind === 'segment')
  .sort((left, right) => left.metadata.pipeline.sourceIndex - right.metadata.pipeline.sourceIndex);
assert.equal(segmentEntities.length, snapshot.output.coordinateRows.length - 1);
segmentEntities.forEach((entity, index) => {
  assert.deepEqual(plainPoint(entity.geometry.start), plainPoint(rowEntities[index].geometry.position));
  assert.deepEqual(plainPoint(entity.geometry.end), plainPoint(rowEntities[index + 1].geometry.position));
});

assert(snapshot.output.combined.every((point) => point.z === point.grade));
const markerEntities = rowEntities.filter((entity) => entity.domainRef.category === 'markers');
const depthEntities = rowEntities.filter((entity) => entity.domainRef.category === 'depthEvents');
assert(markerEntities.length >= 4, 'representative fixture must retain PMS markers');
assert(depthEntities.length >= 4, 'representative fixture must retain Table 3 depth marker boundaries');
for (const entity of [...markerEntities, ...depthEntities]) {
  const row = snapshot.output.coordinateRows[entity.metadata.pipeline.sourceIndex];
  assert.deepEqual(plainPoint(entity.geometry.position), { x: row.x, y: row.y, z: row.z });
  assert.equal(entity.metadata.pipeline.elevationAuthority, 'TABLE_2');
}

const ids = scene.entities.map((entity) => entity.id);
for (const projection of scene.projections) {
  const projected = scene.entities.map((entity) => ({ id: entity.id, geometry: projectEngineeringGeometry(entity.geometry, projection) }));
  assert.deepEqual(projected.map((entry) => entry.id), ids, `${projection} must preserve Pipeline identity`);
}
assert.deepEqual(buildPipelineEngineeringSvgScene(snapshot, { sceneId: 'pipeline-fixture' }).scene, scene);
assert.throws(() => createPipelineEngineeringRevisionToken({ projectRevision: 'r1', geometryRevision: 'r1' }), /processConfigRevision/);
assert.throws(() => buildPipelineEngineeringSvgScene({ ...snapshot, revision: null }, { sceneId: 'pipeline-fixture' }), /revision/);

let currentSnapshot = snapshot;
const listeners = new Set();
const source = createPipelineEngineeringSvgAdapter({
  adapterId: 'pipeline-fixture-adapter', sceneId: 'pipeline-fixture',
  getSnapshot: () => currentSnapshot,
  subscribeSnapshot(listener) { listeners.add(listener); return () => listeners.delete(listener); },
});
assert.equal(source.adapter.descriptor.accessMode, 'read-only');
assert.equal(source.adapter.descriptor.capabilities.editing, false);
assert.equal(source.adapter.commandGateway, null);
assert.equal(source.adapter.snapProviders.length, 0);
const conformance = await runEngineeringSvgAdapterConformance(source.adapter);
assert.equal(conformance.passed, true);
assert.equal(listeners.size, 0);

const propertySets = await source.adapter.propertyProvider.getPropertySets(ids.slice(0, 5), scene.revision);
const sceneSet = propertySets.find((set) => set.ownerIds.includes(scene.sceneId));
assert(sceneSet);
assert(sceneSet.fields.every((field) => field.scope === 'SCENE' && field.editable === false));
const entitySets = propertySets.filter((set) => !set.ownerIds.includes(scene.sceneId));
assert(entitySets.every((set) => set.fields.every((field) => field.scope === 'ENTITY' && field.editable === false)));
const forbiddenEntityProcessKeys = new Set(['p1', 't1', 't2', 't3', 'fluidDensity', 'materialCode', 'insulationDensity', 'hydroPressure']);
assert(entitySets.every((set) => set.fields.every((field) => !forbiddenEntityProcessKeys.has(field.key))));
assert(sceneSet.fields.some((field) => field.key === 'p1' && field.value === '55'));

const events = [];
const unsubscribe = source.adapter.subscribeScene((event) => events.push(event));
currentSnapshot = Object.freeze({
  ...snapshot,
  revision: createPipelineEngineeringRevisionToken({
    projectRevision: 'fixture-project-r2', geometryRevision: 'fixture-propagation-r1', processConfigRevision: 'fixture-process-r1',
  }),
});
for (const listener of listeners) listener({ snapshot: currentSnapshot, reason: 'project-revision-changed' });
assert.equal(events.length, 1);
assert.equal(events[0].reason, 'project-revision-changed');
assert.equal(events[0].scene.revision.value.projectRevision, 'fixture-project-r2');
unsubscribe();
assert.equal(listeners.size, 0);

console.log('Pipeline engineering SVG adapter parity and conformance: ok');
