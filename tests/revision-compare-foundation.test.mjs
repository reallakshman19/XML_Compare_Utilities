/** RC-001 through RC-004 focused certification entrypoint retained for package-script compatibility. */

await import('./revision-compare-contracts.test.mjs');
await import('./revision-compare-load-service.test.mjs');
await import('./revision-compare-owner-fixes.test.mjs');
await import('./revision-compare-static.test.mjs');
await import('./revision-compare-rc002-core.test.mjs');
await import('./revision-compare-rc002-worker.test.mjs');
await import('./revision-compare-rc002-owner-fixes.test.mjs');
await import('./revision-compare-rc002-static.test.mjs');
await import('./revision-compare-rc003-contracts.test.mjs');
await import('./revision-compare-rc003-priority.test.mjs');
await import('./revision-compare-rc003-owner-fixes.test.mjs');
await import('./revision-compare-rc003-static.test.mjs');
await import('./revision-compare-rc004-contracts.test.mjs');
await import('./revision-compare-rc004-scale.test.mjs');
await import('./revision-compare-rc004-owner-fixes.test.mjs');
await import('./revision-compare-rc004-static.test.mjs');
await import('./revision-compare-svg-scene.test.mjs');
await import('./revision-compare-svg-viewer-contract.test.mjs');
await import('./revision-compare-svg-backend.test.mjs');
await import('./revision-compare-svg-dependency-guard.test.mjs');

console.log('revision-compare-foundation.test.mjs passed');
