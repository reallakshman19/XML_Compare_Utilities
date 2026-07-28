# Pipeline 3D Approved Catalog Automated Qualification

## Purpose

This runner executes the repository-native approved-catalog software qualification ladder already delivered by TRI-2A through TRI-2E-A.

It does not supply production catalog values, resolve the production registry source gate, select a digest model, perform CAESAR desktop import, or certify engineering correctness.

## Approved test sequence

The runner executes these tests in fixed order:

1. `tests/pipeline-3d-model-approved-catalog-registry.test.js`
2. `tests/pipeline-3d-model-approved-catalog-registry-binding.test.js`
3. `tests/pipeline-3d-model-approved-catalog-document.test.js`
4. `tests/pipeline-3d-model-approved-catalog-writer.test.js`
5. `tests/pipeline-3d-model-approved-catalog-builder-writer-integration.test.js`
6. `tests/pipeline-3d-model-approved-catalog-production-input.test.js`

The plan is immutable at runtime. A missing file blocks the complete run before test execution begins.

## Invocation

From the repository root, run against the exact checked-out commit:

```bash
git rev-parse HEAD
node scripts/run-pipeline-approved-catalog-qualification.mjs \
  --baseline "$(git rev-parse HEAD)" \
  > pipeline-approved-catalog-qualification.json
```

PowerShell:

```powershell
$baseline = git rev-parse HEAD
node scripts/run-pipeline-approved-catalog-qualification.mjs `
  --baseline $baseline |
  Tee-Object -FilePath pipeline-approved-catalog-qualification.json
```

Optional per-test timeout override:

```bash
node scripts/run-pipeline-approved-catalog-qualification.mjs \
  --baseline "$(git rev-parse HEAD)" \
  --timeout-ms 180000
```

The baseline must be an exact 40-hex commit SHA. Before any test executes, the runner independently resolves the checked-out repository HEAD with `git rev-parse HEAD` and requires exact equality with the supplied baseline. Qualification is blocked if Git is unavailable, HEAD cannot be resolved, the result is not a 40-hex SHA, or the two SHAs differ.

The timeout must be a positive integer number of milliseconds.

## Exit behavior

- Exit code `0`: the baseline matches checked-out HEAD, all six tests returned zero, emitted an explicit terminal `: PASS` sentinel, and produced no blockers.
- Exit code `1`: preflight or one or more tests blocked qualification.

The runner fails closed for:

- invalid baseline SHA;
- repository HEAD resolution failure;
- supplied baseline and checked-out HEAD mismatch;
- invalid timeout;
- empty, duplicate or malformed test plan;
- missing test file;
- test existence-check error;
- execution error;
- timeout;
- signal termination;
- nonzero or unavailable exit status;
- zero exit without an explicit terminal `: PASS` sentinel.

## Evidence contract

Output schema:

```text
PipelineApprovedCatalogQualificationResult.v1
```

Each test result records:

- stable test ID and repository-relative path;
- normalized command;
- exit code and signal;
- duration in milliseconds;
- SHA-256 of stdout and stderr;
- bounded stdout and stderr excerpts;
- per-test ready state.

The aggregate records:

- harness version;
- authenticated baseline commit matching checked-out repository HEAD;
- ordered test plan;
- test results;
- diagnostics and blocker codes;
- aggregate ready state.

Durations are intentionally variable. Use `deterministicPipelineApprovedCatalogQualificationProjection(...)` when comparing repeated result structure while excluding timing fields.

## Qualification boundary

A ready result qualifies only the executed software test ladder at the authenticated checked-out commit. It does not resolve:

```text
APPROVED_PRODUCTION_REGISTRY_SOURCE_UNRESOLVED
REGISTRY_DIGEST_SCOPE_UNRESOLVED
```

Issue #752 remains the governing production-registry authority gate.
