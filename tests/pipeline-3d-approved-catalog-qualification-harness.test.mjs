import assert from 'node:assert/strict';
import {
  PIPELINE_APPROVED_CATALOG_QUALIFICATION_HARNESS_VERSION,
  PIPELINE_APPROVED_CATALOG_QUALIFICATION_SCHEMA,
  PIPELINE_APPROVED_CATALOG_QUALIFICATION_TESTS,
  deterministicPipelineApprovedCatalogQualificationProjection,
  runPipelineApprovedCatalogQualification,
  _internal,
} from '../scripts/run-pipeline-approved-catalog-qualification.mjs';

const baselineCommit = 'a'.repeat(40);
const testPlan = Object.freeze([Object.freeze({ id: 'ONLY', path: 'tests/fake.test.js' })]);
const exists = () => true;
const clock = (...values) => {
  const queue = [...values];
  return () => queue.shift() ?? values.at(-1) ?? 0;
};

function runWith(execution, overrides = {}) {
  return runPipelineApprovedCatalogQualification({
    baselineCommit,
    repoRoot: '/repo',
    testPlan,
    exists,
    runner: () => execution,
    clock: clock(10, 15),
    ...overrides,
  });
}

assert.equal(PIPELINE_APPROVED_CATALOG_QUALIFICATION_SCHEMA,
  'PipelineApprovedCatalogQualificationResult.v1');
assert.equal(PIPELINE_APPROVED_CATALOG_QUALIFICATION_HARNESS_VERSION, 'TRI-2F-A.1');
assert.equal(PIPELINE_APPROVED_CATALOG_QUALIFICATION_TESTS.length, 6);
assert.equal(Object.isFrozen(PIPELINE_APPROVED_CATALOG_QUALIFICATION_TESTS), true);
assert.equal(Object.isFrozen(PIPELINE_APPROVED_CATALOG_QUALIFICATION_TESTS[0]), true);
assert.deepEqual(PIPELINE_APPROVED_CATALOG_QUALIFICATION_TESTS.map((item) => item.id), [
  'TRI-2A-REGISTRY',
  'TRI-2B-BINDING',
  'TRI-2C-DOCUMENT-ADOPTION',
  'TRI-2D-WRITER-AUTHENTICATION',
  'TRI-2D-B-BUILDER-WRITER-INTEGRATION',
  'TRI-2E-A-PRODUCTION-TRANSPORT',
]);

const success = runWith({ status: 0, signal: null, stdout: 'fixture: PASS\n', stderr: '' });
assert.equal(success.schema, PIPELINE_APPROVED_CATALOG_QUALIFICATION_SCHEMA);
assert.equal(success.harnessVersion, PIPELINE_APPROVED_CATALOG_QUALIFICATION_HARNESS_VERSION);
assert.equal(success.baselineCommit, baselineCommit);
assert.equal(success.ready, true);
assert.deepEqual(success.blockerCodes, []);
assert.equal(success.results.length, 1);
assert.equal(success.results[0].ready, true);
assert.equal(success.results[0].durationMs, 5);
assert.deepEqual(success.results[0].command, ['node', 'tests/fake.test.js']);
assert.equal(success.results[0].stdoutExcerpt, 'fixture: PASS\n');
assert.equal(success.results[0].stderrExcerpt, '');
assert.match(success.results[0].stdoutSha256, /^[a-f0-9]{64}$/);
assert.match(success.results[0].stderrSha256, /^[a-f0-9]{64}$/);
assert.equal(Object.isFrozen(success), true);
assert.equal(Object.isFrozen(success.results), true);
assert.equal(Object.isFrozen(success.results[0]), true);

const successWithDifferentDuration = runPipelineApprovedCatalogQualification({
  baselineCommit,
  repoRoot: '/repo',
  testPlan,
  exists,
  runner: () => ({ status: 0, signal: null, stdout: 'fixture: PASS\n', stderr: '' }),
  clock: clock(100, 250),
});
assert.notEqual(success.results[0].durationMs, successWithDifferentDuration.results[0].durationMs);
assert.deepEqual(
  deterministicPipelineApprovedCatalogQualificationProjection(success),
  deterministicPipelineApprovedCatalogQualificationProjection(successWithDifferentDuration),
);

const invalidBaseline = runWith({ status: 0, signal: null, stdout: 'fixture: PASS', stderr: '' }, {
  baselineCommit: 'main',
});
assert.equal(invalidBaseline.ready, false);
assert.equal(invalidBaseline.results.length, 0);
assert.ok(invalidBaseline.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_BASELINE_INVALID'));

const invalidTimeout = runWith({ status: 0, signal: null, stdout: 'fixture: PASS', stderr: '' }, {
  timeoutMs: Number.NaN,
});
assert.equal(invalidTimeout.ready, false);
assert.equal(invalidTimeout.results.length, 0);
assert.ok(invalidTimeout.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TIMEOUT_INVALID'));

const missing = runWith({ status: 0, signal: null, stdout: 'fixture: PASS', stderr: '' }, {
  exists: () => false,
});
assert.equal(missing.ready, false);
assert.equal(missing.results.length, 0);
assert.ok(missing.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_MISSING'));

const existenceError = runWith({ status: 0, signal: null, stdout: 'fixture: PASS', stderr: '' }, {
  exists: () => { throw new Error('filesystem unavailable'); },
});
assert.equal(existenceError.ready, false);
assert.equal(existenceError.results.length, 0);
assert.ok(existenceError.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_EXISTENCE_CHECK_ERROR'));

const duplicate = runPipelineApprovedCatalogQualification({
  baselineCommit,
  repoRoot: '/repo',
  testPlan: [
    { id: 'DUP', path: 'tests/a.js' },
    { id: 'DUP', path: 'tests/b.js' },
  ],
  exists,
});
assert.equal(duplicate.ready, false);
assert.ok(duplicate.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_ENTRY_DUPLICATE'));

const failed = runWith({ status: 2, signal: null, stdout: '', stderr: 'failure' });
assert.equal(failed.ready, false);
assert.ok(failed.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_FAILED'));
assert.equal(failed.results[0].exitCode, 2);
assert.equal(failed.results[0].stderrExcerpt, 'failure');

const noSentinel = runWith({ status: 0, signal: null, stdout: 'completed', stderr: '' });
assert.equal(noSentinel.ready, false);
assert.ok(noSentinel.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_PASS_SENTINEL_MISSING'));

const nonterminalSentinel = runWith({
  status: 0,
  signal: null,
  stdout: 'fixture: PASS\nadditional output\n',
  stderr: '',
});
assert.equal(nonterminalSentinel.ready, false);
assert.ok(nonterminalSentinel.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_PASS_SENTINEL_MISSING'));

const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
const timedOut = runWith({
  status: null,
  signal: 'SIGTERM',
  stdout: '',
  stderr: '',
  error: timeoutError,
});
assert.equal(timedOut.ready, false);
assert.ok(timedOut.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_TIMEOUT'));
assert.ok(timedOut.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_SIGNALLED'));
assert.ok(timedOut.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_FAILED'));

const executionError = runWith({
  status: null,
  signal: null,
  stdout: '',
  stderr: '',
  error: Object.assign(new Error('not executable'), { code: 'ENOENT' }),
});
assert.equal(executionError.ready, false);
assert.ok(executionError.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_EXECUTION_ERROR'));

const thrownRunner = runWith(null, {
  runner: () => { throw Object.assign(new Error('runner threw'), { code: 'ERUNNER' }); },
});
assert.equal(thrownRunner.ready, false);
assert.ok(thrownRunner.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_EXECUTION_ERROR'));
assert.ok(thrownRunner.blockerCodes.includes(
  'PIPELINE_APPROVED_CATALOG_QUALIFICATION_TEST_FAILED'));

assert.equal(_internal.excerpt('x'.repeat(5000)).length <= 4096, true);
assert.deepEqual(_internal.cliArguments(['--baseline', baselineCommit, '--timeout-ms', '25']), {
  baselineCommit,
  timeoutMs: 25,
});

console.log('pipeline-3d approved catalog qualification harness: PASS');
