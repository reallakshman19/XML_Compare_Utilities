import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}
function functionLengths(value) {
  const lines = value.split(/\r?\n/);
  return lines.flatMap((line, index) => {
    const match = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
    if (!match) return [];
    let depth = 0; let started = false;
    for (let end = index; end < lines.length; end += 1) {
      for (const character of lines[end]) {
        if (character === '{') { depth += 1; started = true; }
        if (character === '}') depth -= 1;
      }
      if (started && depth === 0) return [{ name: match[1], lines: end - index + 1 }];
    }
    return [{ name: match[1], lines: Number.POSITIVE_INFINITY }];
  });
}

const paths = [
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-target.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-geometry.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-draft.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-drag.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-panel.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-feature.js',
];
const modules = Object.fromEntries(paths.map((path) => [path, source(path)]));
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const index = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-index.js');

for (const [path, value] of [...Object.entries(modules), ['controller', controller], ['visual', visual]]) {
  assert(value.split(/\r?\n/).length <= 300, `${path} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
  for (const row of functionLengths(value)) {
    assert(row.lines <= 40, `${path} function ${row.name} must remain at or below 40 lines`);
  }
}

const production = Object.values(modules).join('\n');
assert.doesNotMatch(production,
  /publishCandidate|commandGateway|createSequentialCommandService|commandJournal|transactionLedger|localStorage|sessionStorage|indexedDB/);
assert.doesNotMatch(production,
  /acquireEngineeringSvgSnap|snapProviders|nearest|screenTolerance|worldTolerance/,
  'SSK-TS-3L must not add snap or hidden inference');
assert.match(modules[paths[0]], /SequentialSingleEntityMoveTarget\.v1/);
assert.match(modules[paths[0]], /targetIdentity/);
assert.match(modules[paths[1]], /WOULD_DISCONNECT/);
assert.match(modules[paths[1]], /REPAIR_BOUNDARY_LOCKED/);
assert.match(modules[paths[2]], /publicationState: 'NOT_PUBLISHED'/);
assert.match(modules[paths[3]], /acquireNavigationLock/);
assert.match(modules[paths[4]], /Preview numeric/);
assert.match(modules[paths[4]], /Cancel preview/);
assert.match(modules[paths[5]], /pointerdown/);
assert.match(modules[paths[5]], /pointerup/);
assert.match(modules[paths[5]], /setTransient/);
assert.match(visual, /composeSequentialSingleEntityMoveDraftScene/);
assert.match(visual, /ORIGINAL COMPONENT/);
assert.match(visual, /DRAFT COMPONENT/);
assert.match(controller, /createSequentialSingleEntityMoveFeature/);
assert.match(controller, /category === 'confirmed'/);
assert.match(controller, /moveDraft: state\.movePreview\?\.getDraft\(\)/);
assert.match(controller, /movePreview: state\.movePreview\.getState\(\)/);
assert.doesNotMatch(controller, /movePreview.*publishCandidate|movePreview.*gateway/);
for (const name of paths.map((path) => path.split('/').at(-1).replace(/\.js$/, ''))) {
  assert.match(index, new RegExp(name));
}

console.log('Sequential SSK-TS-3L static containment: ok');
