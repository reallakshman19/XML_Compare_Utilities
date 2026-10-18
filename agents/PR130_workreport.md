# PR130 · I121-WORKER-ADOPTION-01 / WP1 · Recovery-first work report

**Owner intent:** Original S1/S2/S3/T Writer2 must inspect without freezing the main UI while preserving original CII byte identity, Method A/B/BM001 evidence, read-only Method C, and the strict BOUND/Apply gates. Existing PR129 fixes the indefinite blocking calculation; the previously measured synchronous path still has 3–4s GUI pauses. Worker feasibility from original Chromium was established in PR129, run #39135084075.

**This PR:** [#130](https://github.com/reallakshman19/XML_Compare_Utilities/pull/130) DRAFT. Base = PR129 branch `i121/perf-negative-expansion-cache-20261018` at `5a809e6ad2dfcea77b145a76acc5f7f51041b46a`. First WP1 complete head `0e7663814d5cb920bbb50afb391c209a1523a7fe`. Parent PR129 and PR127 are unchanged and remain DRAFT. PR107 (`86a2d3b40568c2bcb43dacbe32c862144d00fd53`) owns shared `tabs/cii-workspace/cii-workspace-source-set.js` and multisource UI; this PR touches neither shared file.

## What is implemented

**WP1 independent worker and client modules only**, mirrored as byte-identical pairs under `tabs/cii-workspace/` and `docs/tabs/cii-workspace/`:

- `cii-workspace-inspection-worker-protocol.js` — `CIIWriter2InspectionWorker.v1`, RUN/PROGRESS/RESULT/ERROR, explicit and unique member identifiers, original SHA256 receipt preflight, verified result schema/source-set SHA/member ordering and target original SHA. Fail closed on mismatch.
- `cii-workspace-inspection.worker.js` — dedicated ESM Worker invokes existing `inspectCiiWorkspaceSourceSetWithVersionBridge` with worker-native `crypto`, including the same existing V11↔V14 frozen converter and geometry/Method A engine. No writer/apply or BOUND authority added.
- `cii-workspace-inspection-worker-client.js` — worker-only factory, one active run, monotonic run ID, abort/cancel, superseded-run and stale reply guards, disposal, worker termination, typed failure reasons; strips uncloneable cryptoRef/instrumentation and does not transfer/detach the original CII input buffers. No hidden synchronous fallback.

**Integration not claimed:** Existing Writer2 UI `docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` still calls the synchronous inspector. WP1 is directly callable and proven in native Chromium, but WP2 UI routing is separately governed.

## WP1 validation and artifacts — REAL evidence

[GitHub Actions #39136500168](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39136500168), exact `0e766381`, three jobs:
- **PASS Node22 and Node24:** `node --test tests/cii-workspace-i121-worker-wp1-contract.test.mjs`, 5 suites exercising schema, source SHA receipts, source order, target hash mismatch, worker failure, cancellation, supersession/stale result rejection, AbortSignal, no re-run after disposal, mirrored production/deployed bytes. The fake-worker unit tests are **[SIMULATED]**, not independent proof of a browser Worker.
- **PASS real hosted Chromium:** `tests/cii-workspace-i121-worker-wp1-native.test.mjs`, genuine original inputs verified in Node against frozen SHA256 and again in-browser; new standalone client worker returns `CORRESPONDENCE_INPUT_READY` with 3 original members and verified target. **13,538.7ms** from worker run start; 50ms page heartbeat max **52ms**, **0 gaps >500ms**, 270 samples; original source-set SHA256 `5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3`. New worker progress `INSPECTING`.
- Same real-browser job continues through **unchanged UI** native Writer2 Inspect and existing Method C A-only negative; `Source-set custody READY` at **14,240ms**, no page errors, seeded 2/3, S1 57 original review rows, NODE 4060→T900–905 segment only/unbound, no Method C Apply. **PASS 1/1**. This original UI pass does NOT mean UI production worker has been installed.
- New workflow `.github/workflows/cii-i121-worker-wp1.yml` only, no frozen test or original acceptance modified. No product geometry policy, converter, PR129 cache, or shared Writer2 UI edited.
- **NOT_RUN**: actual Windows Edge, production UI worker hook, independent P2, Owner merge/release. No physical Method B certification or Method C transfer is claimed.

### Changed-file inventory and selective undo (all files NEW)

There was **no pre-existing file edit**, so no `node utils/backup.cjs save` could or needed to be called. Git blob IDs below are SHA-1 object IDs, not SHA-256; their exact before-state is **ABSENT**. A separate local `.agent-worklogs/` manifest may be retained as recovery aid. For any exact file, confirm current blob is the stated value and no downstream agent has changed it, then delete only that file; **never reset/revert PR129 or adjacent PRs**.

| Module and file | New-file Git blob |
|---|---|
| Protocol `tabs/cii-workspace/cii-workspace-inspection-worker-protocol.js` and `docs/` mirror | `451ca9f80e632feee0d49e4d4d351f1bd5ee939e` each |
| Client `tabs/cii-workspace/cii-workspace-inspection-worker-client.js` and `docs/` mirror | `3c2ea5dd7ceddfef0a99623aa359c96ee746a9ef` each |
| Worker `tabs/cii-workspace/cii-workspace-inspection.worker.js` and `docs/` mirror | `7d2b933a6cdd0aa82b69249ad208db779f601eb7` each |
| Contract unit test `tests/cii-workspace-i121-worker-wp1-contract.test.mjs` | `98b0c5563e41582e823972672d11e9fba138d750` |
| Real Chromium `tests/cii-workspace-i121-worker-wp1-native.test.mjs` | `627f86a5397f78a560fb3f5b8c00325a7fa0c602` |
| Workflow `.github/workflows/cii-i121-worker-wp1.yml` | `75e67caff5a16e7e0ad205cacb527ca8e9148766` |

## Qualification / authority

Self-check against AGENTS.md Appendix A, not an independent review: A1 current production call-trace 19/20; A2 quantified original Chromium failure and worker remedy 20/20; A3 read-only custody/authority protections 19/20; A4 original source SHA + independent Node & browser falsifiers 19/20; A5 minimal new-file-only WP1 delivery, no conflicting edits, rollback 19/20. **Self-assessed 96/100; independent verification remains outstanding**. `CONTINUE` for new-file WP1; `COORDINATION_REQUIRED` for WP2 shared call-site; no Owner grant to mutate PR107-owned shared paths is inferred.

## Open concerns

- WP1 caller must supply SHA-bound receipts with matching explicit source IDs; UI currently has original-file custody data but adapter wiring is NOT_DONE.
- Worker options clone only the validated policy data required by actual caller. Preserve parent session selection and target custody; client handles abort but UI must actually trigger cancel on close/replacement.
- Progress currently exposes `INSPECTING` only, not per-member live completion; avoid promising measured member-stage progress without designing an authoritative progress hook.
- Failures are reported as stable codes plus internal cause; UI must render clear human errors; no fallback to synchronous execution.
- The native Chromium heartbeat guard of 500ms is **experimental test-only**, not an Owner-approved production Edge acceptance threshold.

## EXACT_NEXT_ACTION

1. Keep PR130 DRAFT; independent reviewer verifies WP1 source/docs parity, clone safety, source-set custody comparison, cancellation/stale correctness, and absence of B/C authority.
2. **I121-WORKER-ADOPTION-02:** resolve PR107 exact-file ownership; obtain Owner-approved shared `tabs/` and `docs/` call-site scope, follow AGENTS.md `node utils/backup.cjs save` and full local `.agent-worklogs` before editing. Wire *one* Writer2 Inspect call-site from synchronous to this client, feeding existing source/target SHA receipts and worker result unchanged.
3. Add browser tests for actual UI cancel/replacement/stale/dispose/worker-crash and source-set output equivalence; repeat original real Chromium and actual Owner Windows Edge acceptance with agreed responsive limit; P2 and Owner merge only. Until then `UI_WORKER_INTEGRATION=HOLD`, `RELEASE=HOLD`.
