import assert from 'node:assert/strict';
import { createTopologyScopedEditReadOnlyHostFixture } from './fixtures/topology-scoped-edit-read-only-host-fixture.js';
import { buildTopologyScopedEditEngineeringScene } from '../tabs/topology-trace-validator/topology-scoped-edit-scene-adapter.js';
import { resolveTopologyScopedEditScope, TOPOLOGY_SECTIONAL_SCOPE_UNSUPPORTED, TOPOLOGY_SCOPED_EDIT_SCOPE_REJECTION } from '../tabs/topology-trace-validator/topology-scoped-edit-scope-adapter.js';
const f=createTopologyScopedEditReadOnlyHostFixture(),scene=buildTopologyScopedEditEngineeringScene(f.readModelA0);
function check(request){const r=resolveTopologyScopedEditScope({readModel:f.readModelA0,scene,request});const all=[...r.editableEntityIds,...r.boundaryEntityIds,...r.excludedEntityIds];assert.equal(new Set(all).size,48);assert.equal(all.length,48);assert(r.editableEntityIds.every(id=>f.readModelA0.commandScopeBasis.editableEntityIds.includes(id)));return r;}
const selection=check(f.selectionRequests[0]);assert(selection.editableEntityIds.includes('N01'));const structural=check(f.structuralRequests[0]);assert.equal(structural.editableEntityIds.length,15);assert.equal(structural.boundaryEntityIds.length,12);assert.equal(structural.excludedEntityIds.length,21);assert(f.readModelA0.commandScopeBasis.editableEntityIds.includes('N04'));assert(structural.excludedEntityIds.includes('N04'));
assert.throws(()=>resolveTopologyScopedEditScope({readModel:f.readModelA0,scene,request:f.sectionalRequest}),e=>e.code===TOPOLOGY_SECTIONAL_SCOPE_UNSUPPORTED);
const overflow={...f.structuralRequests[0],elementBudget:10};assert.throws(()=>resolveTopologyScopedEditScope({readModel:f.readModelA0,scene,request:overflow}),e=>e.code===TOPOLOGY_SCOPED_EDIT_SCOPE_REJECTION.BUDGET_EXCEEDED&&e.requestedBudget===10);
const unknown={...f.selectionRequests[0],selection:{entityIds:['MISSING'],closureDepth:0}};assert.throws(()=>resolveTopologyScopedEditScope({readModel:f.readModelA0,scene,request:unknown}),e=>e.code===TOPOLOGY_SCOPED_EDIT_SCOPE_REJECTION.UNKNOWN_ENTITY);
console.log('[PASS] selection and structural scope complete; sectional rejected');
