import test from 'node:test';
import assert from 'node:assert/strict';
import {methodCAReviewMarkup} from '../docs/tabs/cii-workspace/cii-workspace-method-c-a-review-markup.js';
const sha = '1'.repeat(64);
const data = {sourceId:'S1',sourceSetSha256:sha,sourceOriginalSha256:sha,targetOriginalSha256:sha,
  sessionEpoch:1,registration:{status:'UNVERIFIED_GEOMETRIC_PREVIEW',selectedPoseId:'A'},rows:[
    {sourceNode:'3910',status:'OWNER_ANCHOR_EXPERIMENT',alternatives:[{target:'875',distanceMm:0}],segmentOnly:null,
     explanation:'Experiment only'},
    {sourceNode:'4060',status:'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT',alternatives:[],
     segmentOnly:{endpoints:['900','905'],originalWitness:'ELEMENT 900→905',fraction:.76175},
     explanation:'Original TARGET segment is not a physical NODE'},
  ]};
test('Method C A is shown in existing review without decision or Apply controls',()=>{
  const html=methodCAReviewMarkup(data);
  assert.match(html,/data-ciiw-method-c-review/);
  assert.match(html,/data-source-node="4060"/);
  assert.match(html,/MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT/);
  assert.match(html,/900.*905/);
  assert.match(html,/BOUND or authorize Writer2 Apply/);
  assert.doesNotMatch(html,/data-ciiw-(?:ms-decision|ms-apply|apply-target)/);
});
test('escapes hostile witness data, never imports raw markup',()=>{
  const hostile=structuredClone(data);
  hostile.rows[1].segmentOnly.originalWitness='<img src=x onerror=alert(1)>';
  const html=methodCAReviewMarkup(hostile);
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
});
test('HOLD does not fabricate identity or candidate results',()=>{
  assert.match(methodCAReviewMarkup(null,'STALE_ORIGINAL_SHA'),/HOLD/);
  assert.doesNotMatch(methodCAReviewMarkup(null,'STALE_ORIGINAL_SHA'),/data-ciiw-method-c-candidate/);
});
