/** RC-001 through RC-003 focused certification entrypoint retained for package-script compatibility. */

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

console.log('revision-compare-foundation.test.mjs passed');