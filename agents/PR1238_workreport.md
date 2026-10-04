# PR1238 Work Report — Issue #1237 anchor correspondence propagation

## Mission

Implement issue #1237: keep anchor authority, correspondence cardinality, and Writer2 NodeName mutation cardinality as distinct concepts. A small trusted anchor set must seed governed correspondence propagation; the retained 36 NodeName changes remain an output oracle, not an anchor requirement.

## Protocol / live basis

- Responsibility: `reallaksh19/XML_Compare_Utilities#1237`
- Draft PR: `#1238`
- Protocol: `reallaksh19/Common@149770a21ca073df49717a96e2106c967adddc2d:skills/engineering-pr-delivery-v3.2`
- Base: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- Branch: `issue1237-anchor-correspondence-propagation`
- Current material head before this report update: `67d3bcecaf338d5d7c513352ef9262f9c7d19ccd`
- Merge authority: OWNER_ONLY
- Related draft PR: #1234, performance/search-budget responsibility under #1232.

## Takeover / implementation qualification

`TAKEOVER_AUTHORITY = READ_ONLY` was used for initial grounding. Disposition: `CONTINUE`.

### A1 — Production trace

Baseline path:

`createCiiWorkspacePreview()` -> `workspaceMultiBaseAuthority()` -> `buildCiiMultiBaseCorrespondence()`.

At the inspected base:

- one legacy/manual anchor -> `propagateSingleCiiAnchorCorrespondence()`;
- multiple legacy/manual anchors -> `compareLockedCiiAnchorSpan()`;
- Method B one-anchor loop -> propagation;
- Method A loop -> locked-span correspondence under qualified geometry.

### A2 — Failure isolation

The repository already had recursive single-anchor component propagation. The first concrete semantic defect was that multiple reviewed/manual anchors stopped being propagation seeds and were collapsed to span comparison.

Implemented correction:

- new `propagateLockedCiiAnchorCorrespondence()` accepts one or more reviewed anchors;
- all locked pairs pre-seed one-to-one SOURCE/TARGET node custody;
- all anchors enter the propagation queue as seed/validation authority;
- candidate frontier assignments that contradict any locked mapping are removed before winner selection;
- contradictory manual authority fails closed as `CONFLICTING_LOCKED_ANCHOR_AUTHORITY`;
- one-anchor legacy behavior remains routed through the original single-anchor wrapper to preserve its underdetermined-rotation semantics;
- Method A and Method B routing/qualification are unchanged.

Arbitration's treatment of partially unresolved base loops remains a separate risk to revisit only if retained/manual execution proves the multi-seed correction is insufficient.

### A3 — Protected authority

- NodeName equality remains corroboration/discovery only.
- Method-B independent-axis authority was not weakened.
- Method-A geometry mathematics was not changed.
- No retained benchmark node identity was hard-coded.
- V11/V14, Writer1C, Writer2 structural mutation semantics and retained fixture bytes are untouched.

### A4 — Independent validation

The retained browser oracle independently derives `T -> TEXPECTED-PARTIALLLYDONE` and requires 36 known-positive mutations: 35 REPLACE + 1 CREATE + 0 DELETE.

New focused static regression intent:

1. one anchor expands across a four-edge chain and yields five matched nodes;
2. a one-anchor symmetric branch remains unresolved/fail-closed;
3. a second reviewed anchor constrains that same symmetric branch and permits propagation to discover an additional unanchored node pair;
4. contradictory reviewed anchors fail closed;
5. legacy/manual two-anchor input now yields more correspondence than manual authority rows instead of switching to span-only output semantics.

Execution status remains `NOT_RUN` because this connector session has no repository checkout/runner and GitHub instantiated no Actions run/status for the current head. Local `node --check` over the four authored JS/test files is PASS for syntax only; it is not test execution.

### A5 — Minimal patch

Changed production files in U2 only:

- `tabs/cii-workspace/cii-workspace-propagation.js`
- `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js`

Focused tests changed:

- `tests/cii-workspace-propagation.test.js`
- `tests/cii-workspace-multi-base-correspondence.test.js`

No #1234 search-budget file, geometry implementation, workflow file, Writer1C/Writer2 mutation module, or benchmark fixture was changed.

## Declared denominator

| Unit | State | Evidence |
|---|---|---|
| U1 Grounding / recovery surface | COMPLETE | #1237 IMPLEMENTATION_PLAN + PR1238 report |
| U2 Anchor-seed correspondence semantics | IMPLEMENTED / RUNTIME EVIDENCE PENDING | multi-seed constrained propagation + focused regression code |
| U3 Cardinality / proposal authority UX | PENDING | misleading expanded-pair count already isolated in ledger UI |
| U4 Source-vs-Target audit | PENDING | combined correspondence model already exposes per-source node rows |
| U5 Root blocker projection | PENDING | raw root member blockers are available before downstream transfer blockers |
| U6 Retained qualification / delivery evidence | PENDING | independent oracle identified; runtime NOT_RUN |

Progress credit remains conservative: U1 is complete; U2 does not receive evidenced-complete credit until executable qualification supports the implementation.

## Current hypothesis / falsifier

Hypothesis: S1 reviewed-anchor behavior is degraded in part because multi-anchor authority switches to locked-span semantics instead of treating each reviewed pair as seed/validation constraints. Multi-seed propagation with locked custody constraints should let an extra anchor resolve a concrete ambiguous branch without requiring one anchor per mutation.

Falsifier: retained/manual S1 execution shows the relevant frontier remains unresolved for reasons independent of anchor constraints. If falsified, stop this direction and publish the first unresolved evidence boundary rather than weakening geometry/evidence rules.

## Active overlap

PR #1234 changes Method-A physical search and overlaps `cii-workspace-source-set.js` / multi-source filter UI. Classification: `COORDINATION_REQUIRED`. PR #1238 has not modified any #1234 changed production file in U2.

## Validation truth

- Live main grounding: PASS — GitHub readback.
- Repository instructions: PASS — `AGENTS.md` read at exact base.
- Code production trace: PASS — exact-base source inspection.
- PR diff review of U2: PASS — no protected production surface outside propagation/orchestration changed.
- JS syntax for four authored production/test files: PASS — `node --check` only.
- Focused Node tests: NOT_RUN — no repository execution environment.
- GitHub Actions for current head: NOT_RUN / none instantiated.
- Commit statuses for current head: NOT_RUN / none present.
- Retained S1/S2/S3 -> T browser benchmark: NOT_RUN.
- PB-0003 byte closure / negative assurance: NOT_RUN.
- V11/V14 product bridge validation: NOT_RUN.

## Highest risk

Incorrect multi-seed constraint handling could convert ambiguity into false correspondence. Only explicit locked SOURCE↔TARGET node custody narrows candidate assignments; NodeName or mere reachability does not become authority.

## Connector / local-ledger limitation

This responsibility is being mutated through the GitHub connector; no repository checkout is exposed for the repository-local backup helper or git-ignored `.agent-worklogs/` ledger. Git blob SHAs and branch commits provide durable preimages, but no claim is made that the local backup/patch-ledger requirement was executed.

The V3.2 `implementation-start` local continuity command likewise could not be run because no responsibility continuity snapshot/repository execution environment is available here. This is recorded as an observability limitation, not a production blocker.

## EXACT_NEXT_ACTION

Proceed to U3 on a non-#1234-owned surface: correct the master-ledger cardinality labels so selected automatic bases and expanded anchor pairs are distinct, then wire an explicit proposal-to-manual-authority approval action. After that, add the Source-vs-Target row model/audit without creating a second correspondence datastore.
