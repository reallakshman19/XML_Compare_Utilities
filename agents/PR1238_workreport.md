# PR1238 Work Report — Issue #1237 anchor correspondence propagation

## Mission

Implement issue #1237 without conflating three different cardinalities:

```text
anchor authority ≠ SOURCE↔TARGET correspondence ≠ NodeName mutation output
```

A small trusted anchor set must seed governed correspondence propagation. The retained T→TEXPECTED oracle remains the independent known-positive Writer2 output check; it is not an anchor-count rule.

## Protocol / live basis

- Responsibility: `reallaksh19/XML_Compare_Utilities#1237`
- Draft PR: `#1238`
- Protocol: `reallaksh19/Common@149770a21ca073df49717a96e2106c967adddc2d:skills/engineering-pr-delivery-v3.2`
- Base: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- Branch: `issue1237-anchor-correspondence-propagation`
- Material head entering this checkpoint: `f8265618a8f0b5abaafcd8b832d5473913c9e829`
- Merge authority: OWNER_ONLY
- Related open draft: PR #1234 under #1232.

## Takeover qualification

Initial takeover was read-only. `AGENTS.md`, #1237, #1232/#1234 overlap, retained tests and the production path were inspected before material edits. Disposition: `CONTINUE`.

### A1 — production trace

Baseline production path:

`createCiiWorkspacePreview()` → `workspaceMultiBaseAuthority()` → `buildCiiMultiBaseCorrespondence()`.

At the base commit:

- one USER LOCKED / legacy anchor → recursive `propagateSingleCiiAnchorCorrespondence()`;
- multiple USER LOCKED / legacy anchors → `compareLockedCiiAnchorSpan()`;
- Method B one-anchor loop → recursive propagation;
- Method A 3+ anchor loop → qualified locked-span comparison.

### A2 — isolated semantic defect

The engine already knew how to expand one trusted seed. The concrete defect was that adding more reviewed/manual anchors changed the algorithmic meaning: the set stopped acting as seeds and was collapsed into locked-span comparison.

This is exactly the wrong cardinality boundary for #1237: extra anchors should constrain/disambiguate propagation, not become a proxy for output rows.

## U2 — anchor-seed correspondence semantics

Implemented:

- added `propagateLockedCiiAnchorCorrespondence()` for one-or-many reviewed anchors;
- all locked pairs pre-seed one-to-one SOURCE/TARGET node custody;
- all anchors enter the propagation queue as seed/validation authority;
- candidate frontier assignments contradicting a locked mapping are removed before winner selection;
- contradictory manual authority fails closed as `CONFLICTING_LOCKED_ANCHOR_AUTHORITY`;
- single-anchor legacy input still uses the previous single-anchor wrapper, preserving underdetermined-rotation behavior;
- Method A and Method B qualification/routing are unchanged;
- locked-node output ordering is deterministic by locked-state, SOURCE node, then TARGET node.

Focused regression code covers:

1. one anchor expanding across multiple node/element correspondences;
2. a symmetric branch staying unresolved with insufficient authority;
3. a second reviewed anchor resolving that branch while propagation discovers another unanchored pair;
4. contradictory reviewed anchors blocking rather than picking a winner;
5. a two-anchor legacy/manual set producing correspondence beyond the two anchor rows.

## A3 — protected authority

Preserved:

- NodeName is corroboration/discovery only;
- Method B independent-axis authority is unchanged;
- Method A geometry mathematics is unchanged;
- V11↔V14 bridge semantics are unchanged;
- Writer1C / Writer2 mutation semantics are unchanged;
- benchmark CII bytes are unchanged;
- no retained node identity is hard-coded into production correspondence logic.

## U3 — cardinality + proposal authority UX

Implemented in the existing anchor-ledger model:

- summary now separates:
  - manual locked anchors;
  - selected automatic bases;
  - expanded anchor pairs;
- removed the misleading implication that expanded pair rows are the number of selected method bases;
- copy explicitly says the ledger represents **seed authority, not transfer mutations**;
- `Anchor proposal rationale` now exposes **Approve anchor** per proposal;
- approval reuses the existing manual-authority handler with the exact SOURCE/TARGET pair;
- approving a proposal creates explicit USER LOCKED authority for that pair and does not promote NodeName equality into automatic identity authority.

No second anchor state model was introduced.

## U4 — Correspondence → Source vs Target audit/export

Implemented from the existing compare-review, engineering-delta and transfer-plan objects; no second correspondence datastore was introduced.

The dedicated audit projection now shows:

- SOURCE and TARGET node IDs;
- SOURCE and TARGET NodeName values where a NodeName engineering delta exists;
- current evidence / proof authority;
- confidence / bound state;
- whether engineering data changed;
- Writer action/status;
- BM-001 binding status;
- row-level ambiguity / insufficient-evidence / operation blockers.

Summary counts deliberately separate:

- correspondence NODE pairs;
- bound NODE pairs;
- NodeName differences;
- Writer NodeName candidates;
- BM-001-bound operations.

CSV export was extended from the same model with Source/Target NodeName, identity-bound state, Writer actions and BM-001 statuses while retaining source-file/hash custody.

The UI text refers to the retained mutation benchmark generically; its cardinality is not hard-coded into production audit logic.

Remaining U4 gap: the issue-requested benchmark-mode `expected / recovered / missing / unexpected` projection still requires an externally supplied retained oracle set. Production must not invent or hard-code that set. The existing retained test already derives expected operations independently from T→TEXPECTED; wiring those derived keys into an explicit benchmark-mode UI remains pending executable retained-harness integration.

## U5 — root blocker projection

Implemented `ciiWriter2RootBlockers()`.

The full gate still evaluates the complete blocker set, now retained as `machineBlockers`. The user-facing `blockers` / `rootBlockers` projection shows the first actionable semantic cause instead of presenting derivative consequences as peers.

Example from the owner report:

```text
S1:CORRESPONDENCE_NOT_READY
MULTISOURCE_CORRESPONDENCE_NOT_READY
CII_MS_WRITER2_BOUND_SCOPE_REQUIRED
CII_MS_WRITER2_SCOPE_SOURCE_SET_HASH_MISMATCH
CII_MS_WRITER2_SCOPE_TARGET_HASH_MISMATCH
CII_MS_WRITER2_TRANSFER_PLAN_NOT_PREVIEW_READY
CII_MS_WRITER2_NO_EXPECTED_NODENAME_MUTATIONS
```

projects to:

```text
S1:CORRESPONDENCE_NOT_READY
```

while the complete machine list remains available for diagnostics and still controls `ready/status`.

## U6 — retained qualification surfaces authored

Added `tests/cii-workspace-retained-s1-manual-anchor-propagation.test.js` using the real retained files:

- `Benchmark/S1.CII`
- `Benchmark/T.CII`

Scenario A:

```text
3910 → 875
```

Scenario B:

```text
3910 → 875
3940 → 880
3870 → 870
```

The test is designed to prove/falsify, from the retained fixture:

- one anchor remains one seed but expands beyond one node pair where governed evidence permits;
- three reviewed anchors remain three explicit locked authorities;
- three anchors do not cap correspondence/mutation cardinality at three;
- repeated identical input yields deterministic correspondence identity and SOURCE↔TARGET pairs.

The existing independent retained multisource benchmark remains unchanged and continues to derive the known-positive mutation set from T→TEXPECTED rather than from production anchor identities.

### A4 — validation truth

PASS / observed:

- live `main` / base / branch / PR grounding;
- exact-base production trace;
- protected-surface diff review;
- U2 isolated mechanics probe with stubbed scoring (mechanics only, not fixture evidence);
- branch source readback of U3/U4/U5 contracts;
- overlap review: PR #1238 and PR #1234 currently share **zero changed files**.

NOT_RUN:

- focused repository Node tests on the final branch;
- retained one-anchor vs three-anchor S1 test;
- retained S1/S2/S3→T browser benchmark;
- Chromium proposal-approval / Source-vs-Target audit interaction test;
- PB-0003 byte closure / negative assurance;
- V11↔V14 product bridge validation.

Reason: this session has GitHub connector mutation/readback but no repository execution checkout. The existing CII benchmark workflow is branch-scoped to the earlier revision branch and does not instantiate for PR #1238. No workflow file is changed merely to manufacture evidence.

`NOT_RUN` is not represented as PASS.

### A5 — patch / overlap discipline

PR #1238 production changes are limited to existing CII Workspace correspondence, audit/export, ledger/review projection and Writer2-readiness modules plus focused tests/workreport.

PR #1234 changed files are:

- `cii-workspace-anchor-physical-candidates.js`
- `cii-workspace-anchor-suggestions-core.js`
- `cii-workspace-anchor-suggestions.js`
- `cii-workspace-multisource-review-only-filter-shell.js`
- `cii-workspace-source-set.js`
- its workreport/test.

PR #1238 currently changes none of those paths.

## Declared denominator

| Unit | Material state | Evidence state |
|---|---|---|
| U1 Grounding / recovery surface | COMPLETE | COMPLETE |
| U2 Anchor-seed correspondence semantics | IMPLEMENTED | runtime evidence pending |
| U3 Cardinality / proposal authority UX | IMPLEMENTED | browser evidence pending |
| U4 Source-vs-Target audit/export | IMPLEMENTED except benchmark-mode recovered/missing/unexpected wiring | retained-harness evidence pending |
| U5 Root blocker projection | IMPLEMENTED | focused runtime evidence pending |
| U6 Retained qualification / delivery evidence | TESTS/ORACLES AUTHORED | NOT_RUN |

Progress remains conservative: material implementation is substantially ahead of exact-head execution evidence. This is a semantic/evidence frontier gap, not a production stop signal under V3.2.

## Highest risks / falsifiers

1. Retained S1 one-anchor execution may show a different first unresolved cause than manual multi-anchor routing. If so, do not weaken evidence rules; record the actual frontier.
2. Multi-seed constraints must never turn NodeName or proximity into identity authority.
3. The benchmark-mode recovered/missing/unexpected UI must consume independently derived expected keys; production must not hard-code retained expected identities/cardinality.
4. Browser execution must confirm proposal approval uses the existing manual-authority lifecycle exactly as intended.

## Connector / local-ledger limitation

No repository filesystem is exposed in this connector session for the local backup helper, `.agent-worklogs/`, V3.2 continuity script, Node/Playwright execution, or local HTTP browser run. Git commits provide durable material preimages, but no claim is made that those local-only steps ran.

## EXACT_NEXT_ACTION

Run the authored focused + retained tests at the exact PR head. If the retained one-vs-three S1 test passes, feed the independently derived T→TEXPECTED expected-operation keys into the dedicated benchmark-mode audit to display expected/recovered/missing/unexpected without fixture-specific production constants. If it fails, use its reported S1 correspondence/blocker frontier as the next engineering basis rather than increasing anchor count or weakening authority.
