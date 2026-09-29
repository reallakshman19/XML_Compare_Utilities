# PR1234 Work Report

## Mission

Continue WP-007 / issue #1232 from the instrumentation-only draft PR #1234 and implement the Owner-approved bounded physical Method-A search: default search budget 10 candidate pairs, UI configurable, with top 5 displayed suggestions. Preserve PB-0003 and existing FORTRAN / Writer1C / Writer2 authority semantics.

## Protocol / live basis

- Engineering Relay: V3.1, `Common@1ced68258afeaf50df113b1d38a4ceb9193587e3`
- Parent issue: #1232; `PLAN_UPDATE — rev 2` records the approved direction.
- Base/main: `d69f71ff9803e7fca1815a36e373335c95ca7dbb`
- PR: #1234
- Pre-edit PR head: `dc71c0f315193380750e8370226916e288508048`
- Branch: `wp007-ft1232-004-anchor-perf`
- Open #1232 PR overlap observed: only #1234.
- Merge authority: OWNER_ONLY.

## Takeover qualification

`TAKEOVER_AUTHORITY = READ_ONLY` was used for re-grounding, then disposition `CONTINUE`.

- A1 Production trace: wrapper `suggestCiiBaseAnchorPairs()` → `suggestCiiPhysicalMethodAAnchors()` → `discoverCiiMethodABases()` → repeated `qualifyCiiGeometryTransform()`.
- A2 Failure isolation: PR instrumentation measured ~42.18 min in `ANCHOR_WRAPPER_PHYSICAL_CANDIDATES_MS`; raw and canonical core passes were milliseconds.
- A3 Authority/invariant: bounding physical candidates can change anchor identity; Owner explicitly approved the bounded-search direction in #1232. Geometry transform implementation itself remains unchanged.
- A4 Independent validation plan: focused candidate-budget tests + existing anchor/multisource tests where runnable; retained PB-0003 benchmark remains authoritative.
- A5 Minimal patch: preselect physical candidates before `discoverCiiMethodABases()`, pass a UI-configurable search budget, independently cap visible suggestions to 5.

## Current hypothesis / falsifier

Hypothesis: bounding the physical Method-A pool to 10 before discovery removes the combinatorial freeze while keeping useful deterministic candidates. Falsifier: retained accepted correspondence/output is lost or protected output changes; if so, revise ranking/budget rather than accepting drift.

## Intended changed surfaces

- `tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js`
- `tabs/cii-workspace/cii-workspace-multisource-review-only-router.js`
- focused tests under `tests/`
- PR metadata / issue evidence as needed

Instrumentation files already changed by the predecessor remain in the PR.

## Validation state

- Live base/PR grounding: PASS (inspection)
- Root-cause trace: PASS (instrumentation + code inspection)
- Product tests: NOT_RUN
- Retained browser benchmark: NOT_RUN

## Backup / local ledger note

This session is operating through the GitHub connector against the private repository and does not expose a repository filesystem in which `node utils/backup.cjs` or the git-ignored `.agent-worklogs/` ledger can run. Pre-edit Git blob SHAs and commit history are therefore recorded here before each remote file replacement; no local backup/ledger claim is made.

## EXACT_NEXT_ACTION

Implement deterministic bounded physical-candidate preselection with default 10, then wire the UI search budget and independent top-5 output limit through both multi-source Inspect paths; add focused regression tests before updating PR #1234 description/evidence.
