import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraPresentation} from '../camera-presentation.js';
import {workbenchSummary} from '../multibase-view.js';
test('actual camera direction distinguishes preset, custom orbit and evidence-independent projection type',()=>{
 const base={cameraTargetWorld:[1000,2000,3000],verticalAxis:'Z',cameraType:'Orthographic'};
 const front=cameraPresentation({...base,cameraPositionWorld:[1000,3000,3001]});
 assert.equal(front.preset,'front');assert.match(front.label,/Front.*Orthographic.*vertical Z/);
 assert.equal(cameraPresentation({...base,cameraPositionWorld:[1031,2037,3091]}).preset,'custom');
 assert.equal(cameraPresentation({...base,verticalAxis:'X',cameraPositionWorld:[2000,2001,3000]}).preset,'top');
 assert.match(cameraPresentation({...base,cameraType:'Perspective',cameraPositionWorld:[2000,3000,3800]}).label,/Isometric.*Perspective/);
 assert.match(workbenchSummary({active:'B'},null),/add manual anchors/);
});
