import assert from 'node:assert/strict';
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
import { createPipelineEngineeringSvgShadowWorkspace } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-shadow-workspace.js';
import { createPipelineEngineeringRevisionToken } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-view-model.js';

function fixtureSnapshot() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  const branchInfo = Object.freeze({
    branchName: 'PL-SHADOW', lineNo: 'PL-SHADOW', boreMm: '914.4', wallThickness: '12.7',
    p1: '55', t1: '80', t2: '40', t3: '20', fluidDensity: '850', materialCode: '106',
    corrosionAllowance: '3', insulationThickness: '50', insulationDensity: '120', hydroPressure: '82.5',
  });
  const output = buildPipelineProjectOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET,
    table2Text: '',
    table3Text: '',
    profileRaw: {
      table2a: table2.rawText,
      table3a: table3.table3ARaw,
      table3b: table3.table3BRaw,
      table3c: table3.table3CRaw,
    },
    branchInfo,
  });
  const revision = createPipelineEngineeringRevisionToken({
    projectRevision: 'shadow-project-r1',
    geometryRevision: 'shadow-geometry-r1',
    processConfigRevision: 'shadow-process-r1',
  });
  return Object.freeze({ output, branchInfo, revision });
}

const snapshot = fixtureSnapshot();
const unreachableHost = {
  ownerDocument: {
    createElement() { throw new Error('DOM creation must not be reached.'); },
  },
};
const valid = {
  host: unreachableHost,
  adapterId: 'pipeline-shadow-adapter',
  sceneId: 'pipeline-shadow-scene',
  shellId: 'pipeline-shadow-shell',
  getSnapshot: () => snapshot,
  subscribeSnapshot: () => () => true,
};

await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, host: null }), /requires a DOM host/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, adapterId: '' }), /requires adapterId/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, sceneId: '' }), /requires sceneId/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, shellId: '' }), /requires shellId/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, getSnapshot: null }), /requires getSnapshot/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({ ...valid, subscribeSnapshot: null }), /requires subscribeSnapshot/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  getSnapshot: () => null,
}), /owner snapshot must be an object/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  getSnapshot: () => [],
}), /owner snapshot must be an object/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  getSnapshot: () => ({ output: snapshot.output, branchInfo: snapshot.branchInfo }),
}), /owner snapshot requires revision/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  getSnapshot: () => ({ ...snapshot, revision: { schema: 'MalformedRevision.v1', value: 1 } }),
}), /owner snapshot revision must use schema "EngineeringRevisionToken.v1"/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  subscribeSnapshot(listener) {
    listener(null);
    return () => true;
  },
}), /owner event must be an object/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  subscribeSnapshot(listener) {
    listener({ reason: 'missing-snapshot' });
    return () => true;
  },
}), /owner event requires snapshot/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  subscribeSnapshot(listener) {
    listener({ snapshot });
    return () => true;
  },
}), /owner event requires reason/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  subscribeSnapshot(listener) {
    listener({ snapshot: { ...snapshot, revision: null }, reason: 'bad-revision' });
    return () => true;
  },
}), /owner event snapshot revision must use schema "EngineeringRevisionToken.v1"/);
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  subscribeSnapshot: () => null,
}), /owner subscription must return an unsubscribe function/);

let subscriptions = 0;
let unsubscriptions = 0;
const failingHost = {
  ownerDocument: {
    createElement() { throw new Error('shadow-shell-mount-failure'); },
  },
};
await assert.rejects(() => createPipelineEngineeringSvgShadowWorkspace({
  ...valid,
  host: failingHost,
  subscribeSnapshot() {
    subscriptions += 1;
    return () => {
      subscriptions -= 1;
      unsubscriptions += 1;
    };
  },
}), /shadow-shell-mount-failure/);
assert.equal(subscriptions, 0, 'shell mount failure must dispose the adapter bridge subscription');
assert.equal(unsubscriptions, 1, 'shell mount failure must unsubscribe exactly once');

console.log('Pipeline engineering SVG shadow ownership contracts: ok');
