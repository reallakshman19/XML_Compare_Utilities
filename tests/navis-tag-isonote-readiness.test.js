import assert from 'node:assert/strict';
import { buildNavisTagIsonoteReadiness } from '../tabs/navis-tag-isonote/navis-tag-readiness.js';

const empty = buildNavisTagIsonoteReadiness({
  config: { supportCoordinateSource: 'json-only' },
  tableBuild: { records: [] }, tree: { summary: { nodeCount: 0 } }, stagedIndex: { entries: [] },
  identityTrace: { rows: [], summary: {} }, navisParse: { tags: [], summary: {} },
});
assert.equal(empty.status, 'BLOCKED');
assert.equal(empty.canResolve, false);
assert.ok(empty.blockers.some((item) => item.code === 'TABLE_ROWS_MISSING'));
assert.ok(empty.blockers.some((item) => item.code === 'STAGED_JSON_REQUIRED'));
assert.ok(empty.blockers.some((item) => item.code === 'NAVIS_VALID_TAGS_MISSING'));

const tableOnly = buildNavisTagIsonoteReadiness({
  config: { supportCoordinateSource: 'table-only' },
  tableBuild: { records: [{ identity: 'PS-1.1', position: { x: 1, y: 2, z: 3 } }] },
  tree: { summary: { nodeCount: 0 } }, stagedIndex: { entries: [] }, identityTrace: { rows: [], summary: {} },
  navisParse: { tags: [{ commentBody: 'Note', position: { x: 1, y: 2, z: 3 } }], summary: { tagCount: 1 } },
});
assert.equal(tableOnly.status, 'READY');
assert.equal(tableOnly.canResolve, true);
assert.equal(tableOnly.summary.stagedJsonRequired, false);

const partial = buildNavisTagIsonoteReadiness({
  config: { supportCoordinateSource: 'prefer-table-fallback-json' },
  tableBuild: { records: [{ identity: 'PS-1.1', position: { x: 1, y: 2, z: 3 } }, { identity: '', position: null }] },
  tree: { summary: { nodeCount: 1 } }, stagedIndex: { entries: [{ position: { x: 1, y: 2, z: 3 } }] },
  identityTrace: { rows: [{ position: { x: 1, y: 2, z: 3 }, tableRecord: { position: null } }], summary: { ambiguousCount: 1 } },
  navisParse: { tags: [{ commentBody: 'Note', position: { x: 1, y: 2, z: 3 } }], summary: { tagCount: 1 } },
});
assert.equal(partial.status, 'READY_WITH_WARNINGS');
assert.ok(partial.warnings.some((item) => item.code === 'TABLE_IDENTITIES_PARTIAL'));
assert.ok(partial.warnings.some((item) => item.code === 'IDENTITY_AMBIGUITIES_PRESENT'));

console.log('navis-tag-isonote readiness tests passed');
