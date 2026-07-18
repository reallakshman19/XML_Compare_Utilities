/** RC-001 focused certification entrypoint retained for package-script compatibility. */

await import('./revision-compare-contracts.test.mjs');
await import('./revision-compare-load-service.test.mjs');
await import('./revision-compare-static.test.mjs');

console.log('revision-compare-foundation.test.mjs passed');
