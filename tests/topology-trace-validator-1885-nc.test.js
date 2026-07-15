import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readManagedTopologySource } from '../tabs/topology-trace-validator/topology-source-reader.js';

const fixtureUrl = new URL('../../3D_Converters/Benchmarks/1885_NC/1885_NC.json', import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);

if (!existsSync(fixturePath)) {
  console.log(`topology trace validator 1885_NC acceptance SKIPPED: fixture not found at ${fixturePath}`);
} else {
  const source = readManagedTopologySource(JSON.parse(readFileSync(fixturePath, 'utf8')));
  const metrics = source.metrics;
  assert.equal(metrics.branchCount, 278);
  assert.equal(metrics.sourceComponentCount, 4320);
  assert.equal(metrics.routeComponentCount, 2939);
  assert.equal(metrics.routeTypeTotal, 2939);
  assert.equal(metrics.deferredSupportCount, 1381);
  assert.equal(metrics.syntheticPipeCount, 880);
  assert.equal(metrics.crefCount, 203);
  assert.equal(metrics.resolvedCrefCount, 203);
  assert.equal(metrics.hrefTrefCount, 416);
  assert.equal(metrics.resolvedHrefTrefCount, 391);
  assert.equal(metrics.externalReferenceCount, 25);
  const expectedTypes = { PIPE: 880, GASK: 599, FLAN: 571, ELBO: 351, VALV: 203, TEE: 148, INST: 77, OLET: 58, REDU: 52 };
  for (const [type, expected] of Object.entries(expectedTypes)) assert.equal(metrics.typeCounts[type], expected, `${type} source inventory mismatch`);
  assert.equal(Object.values(expectedTypes).reduce((sum, count) => sum + count, 0), metrics.routeComponentCount, 'component type totals must reconcile to 2,939');
  assert.deepEqual(metrics.componentCategoryCounts, { PIPE: 880, 'ELBO/BEND': 351, OLET: 58, SUPPORT: 1381, FLANGE: 571, GASK: 599, VALVE: 203, INST: 77, REDUCER: 52, TEE: 148 });
  const instruments = source.components.filter((row) => row.componentCategory === 'INST');
  const instrumentGeometry = {
    inline: instruments.filter((row) => row.geometryClassification === 'FINITE').length,
    point: instruments.filter((row) => row.geometryClassification === 'POINT').length,
    unknown: instruments.filter((row) => row.geometryClassification === 'UNKNOWN').length,
  };
  assert.equal(instrumentGeometry.inline + instrumentGeometry.point + instrumentGeometry.unknown, 77);
  const identityInventory = {
    sourceEntities: source.entities.length,
    sourceEntitiesWithId: source.entities.filter((row) => row.sourceEntityId).length,
    sourcePorts: source.ports.length,
    sourcePortsWithId: source.ports.filter((row) => row.sourcePortId).length,
  };
  assert.deepEqual(identityInventory, { sourceEntities: 4598, sourceEntitiesWithId: 0, sourcePorts: 12634, sourcePortsWithId: 0 });
  const unresolved = source.references.branchReferences.filter((row) => !row.resolved);
  assert.equal(unresolved.length, 25);
  assert.equal(unresolved[0].sourcePath, '$[5].attributes.TREF');
  assert.equal(unresolved.at(-1).sourcePath, '$[277].attributes.HREF');
  console.log(`topology trace validator 1885_NC acceptance passed\n${JSON.stringify({ metrics, instrumentGeometry, identityInventory, unresolvedPaths: unresolved.map((row) => row.sourcePath) }, null, 2)}`);
}
