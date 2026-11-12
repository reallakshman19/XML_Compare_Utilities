# P3.3 report

Branch / implementation commit: `proto/p33-reference-proposals-20261112` / `ee9131f` (local synthetic checkout commit; supplied upstream ZIP base `8409590f36b641bfc755809e27f2e46d315300f2`). The ZIP has no Git metadata, so the local commits are not descendants of the upstream Git object. The final report-only commit is identified in the separate rule-8 report.

## Tests

Node v22.16.0; tests run one file at a time and again with `node --test` inside the card folder. Final summary:

```text
# tests 16
# pass 16
# fail 0
```

| Test | Result |
|---|---|
| T1 X-S1M → X-S1 | PASS: exactly one proposal, element 55 (zero-based), 1390 → 1529 |
| T2 Unapproved and validated | PASS: approval false, zero validator errors |
| T3 Map hash mismatch | PASS: both checksum locks independently exercised; no output |
| T4 Candidate/rejected | PASS: neither generates a change; ambiguous candidate pairs remain review rows |
| T5 X-T self | PASS: 0 proposals, 124 unchanged |
| Other engine/CLI checks | PASS: 9 additional tests; one-sided rigid, zero R9 review, stale ref, wrong format/field, duplicate output, units, v11, vendor equality, JSON-only CLI |
| Kit wiring | PASS: 2 tests |

Baseline: unchanged upstream `_kit/tests/cii14.test.mjs` 16/16; shared validator `--selftest` OK. No failures in these baseline suites; full unrelated repository suite not run.

## Mutation check

| Mutation | Named test | Red? | Exit |
|---|---|---|---|
| M1: disable approved-only filter | T4 | Yes | 1 |
| M2: bypass both SHA-256 checks | T3 | Yes | 1 |
| M3: mark proposals approved (with by/at so R8 cannot hide the regression) | T2 | Yes | 1 |

Each mutation was run separately with `node --test --test-name-pattern Tn tests/engine.test.mjs`; original engine restored after each. Full final suite passed after restoration.

## Benchmark

`node bench/run.mjs --repo-root ../..` — median of three engine calls; map creation and pinned-file I/O excluded. Both pinned hashes verified before reading.

| Bench | Input | Pairs | Proposals | Unchanged | Not comparable | Runs (ms) | Median | Limit | Pass |
|---|---|---:|---:|---:|---:|---|---:|---:|---|
| B1 | X-T → X-TEXP | 1614 | 0 | 124 | 0 | 146, 151.8, 185 | 151.8 ms | <1000 ms | YES |

SHA-256 X-T: `abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060`.
SHA-256 X-TEXP: `bb7c43ab883de3deeae6f73ec37538d977d395dacb9631e3501878d5459162c9`.
Machine-readable results: `bench/RESULT.json`.

## Refusal codes added

`PROPOSE_MAP_INVALID`, `PROPOSE_MAP_FILE_MISMATCH`, `PROPOSE_REF_MISMATCH`, `PROPOSE_FIELD_NOT_ENABLED`, `PROPOSE_CHANGESET_INVALID`, `PROPOSE_OUTPUT_NOT_JSON`, `PROPOSE_OUTPUT_FAILED`. Existing kit refusals pass through, including `INPUT_SHA256_MISMATCH` and `CII_VERSION_UNSUPPORTED`.

## Anything that did not fit the card (and what was done instead)

- Oracle lifted P1.3 gate. Hand-built maps use the shared validator; no P1.3 code imported/copied. The kit and validator are unchanged copies.
- R9 prohibits even an unapproved zero `newValue` without human confirmation. A differing zero reference weight is a review row, not an exported change. No confirmation is fabricated.
- Conservative unit gate: differing/missing UNITS sections are not comparable; no conversion is guessed. The entire section is compared (may defer otherwise comparable weights). This is an additional safety decision, not a requirement in the original card.
- The optional map SHA-256 is omitted because the engine gets a parsed object, not the exact original Map JSON bytes. The Change set uses the map's creation timestamp for deterministic output; it does not claim to record a separate wall-clock creation time.
- CLI requires a new `.json` path and publishes atomically using a same-directory hard link. A filesystem without hard-link support will refuse rather than write partial output.
- Browser wrapper included; runtime browser checks explicitly waived. Uses the same engine and unchanged shared validator via a browser-only shim for its unused Node CLI imports. Serve via localhost; no build step.
- No full-repository regression or owner CAESAR II demo run. No CII/XML edits, no push, no PR, no merge. Test-only fixture creation is separate from the application.

## Owner demo

From `prototypes/p33-reference-proposals/`:

```sh
node tests/demo.mjs ./demo-new
node cli.mjs propose ./demo-new/X-S1M.cii ../../Benchmark/S1.CII ./demo-new/map.json ./demo-new/proposals.json
node ../../shared/topofix-formats/validate.mjs ./demo-new/proposals.json
```

Use a new directory outside the card if avoiding untracked demo files in the checkout. The helper prints exact absolute command paths. Expect validator `OK`, one proposal for element 55 (5220 → 5229), old token `1.390000E+03`, new value `1529`, evidence `reference-cii`, and `approval.approved: false`. The CLI demo was executed in a temporary directory: both input Map and output Change set returned `OK`. The generated sample Map and Change set are also in `tests/fixtures/`, with their hashes in the manifest. No input file is altered.

## Mechanical gate

`node prototypes/_kit/card-check.mjs prototypes/p33-reference-proposals --final` — C1–C9 PASS (run from repo root before patch export).
