import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const identity = source(
  'tabs/sequential-sketcher/scoped-edit/sequential-editable-topology-identity.js',
);
const projection = source(
  'tabs/sequential-sketcher/scoped-edit/sequential-editable-topology-projection.js',
);
const index = source(
  'tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-index.js',
);

for (const [name, value] of [['identity', identity], ['projection', projection]]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} module must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
  assert.doesNotMatch(value,
    /querySelector|addEventListener|publishCandidate|localStorage|sessionStorage|indexedDB|raycast|canvas/);
}

assert.match(identity, /resolveSequentialPortTopology/);
assert.match(identity, /PORT_POSITION_CONFLICT/);
assert.match(identity, /sameSequentialTopologyPoint/);
assert.match(projection, /resolveSequentialPortTopology/);
assert.match(projection, /Editable topology cannot omit unresolved support families/);
assert.match(projection, /carrierIds\.has\(glyph\.carrierId\)/);
assert.match(index, /sequential-editable-topology-identity/);

console.log('Sequential editable topology identity containment: ok');
