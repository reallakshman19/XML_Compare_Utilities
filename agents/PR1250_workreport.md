# PR1250 work report — retained Writer2 session persistence

## Mission

Implement Slice 8 for #1239 after audit: preserve the important retained Writer2 review session across reinspection / close+reopen without introducing a second authority store or persisting CII bytes.

## Stack / live basis

- Issue: `reallaksh19/XML_Compare_Utilities#1239`
- Base dependency: draft PR #1249 / branch `fix/cii-writer2-blocker-causality-1239`
- Stack base SHA: `b13da2c55d998ce25705677f93b9d93648bde6a1`
- Branch: `fix/cii-writer2-session-persistence-1239`
- Merge authority: OWNER_ONLY / NOT_GRANTED

## Audit-first findings

1. Important retained Writer2 state is held only in closure Maps:
   - `selectedBySource`;
   - `manualBySource`;
   - `manualDraftBySource`;
   - `reviewDecisions`.
2. Reinspection explicitly clears all four maps before auto-seeding bases.
3. Persisting raw CII bytes is unnecessary and would enlarge the custody surface.
4. Anchor state can be safely keyed by exact source-set + original-target custody.
5. Review decisions require a second fail-closed gate: the rebuilt `correspondenceIdentity` must match exactly.
6. DOM-only review persistence is unsafe because filters can remove rows from the rendered table while the model still retains decisions.
7. Directly writing private closure Maps from a persistence layer would create a second hidden authority path.
8. The outer `next-step` shell already wraps the retained Writer2 core and therefore can restore through the same governed UI actions used by a human.

## Architecture

### Pure persistence model

`cii-workspace-multisource-session-persistence.js`

- schema: `CIIWorkspaceWriter2Session.v1`;
- key: `cii-writer2-session-v1:<sourceSetSha256>:<originalTargetSha256>`;
- persisted data only:
  - automatic selection keys by SOURCE;
  - exact manual anchor pairs by SOURCE;
  - manual editor drafts;
  - correspondence identity;
  - normalized review decisions (`LOCK|ACCEPT|REJECT`).
- no CII bytes, geometry, correspondence rows, transfer plans or Writer output are persisted.
- localStorage discovery/read/write all fail closed.
- manual pairs are integer-normalized and duplicate-safe.
- stale automatic selection keys are reported explicitly and do not become authority.
- manual authority suppresses automatic selection for the same SOURCE.
- review decisions restore only when `correspondenceIdentity` matches and the correspondence ID still exists.

### Dedicated persistence shell

`cii-workspace-multisource-session-shell.js`

- keeps persistence separate from navigation / next-step UX;
- snapshots anchor authority from the master-ledger/evidence state;
- restores manual anchors by filling and clicking the existing `Add reviewed anchor` control;
- restores automatic selections by clicking existing qualified base controls;
- never writes the private Writer2 Maps directly;
- maintains a model-level shadow of review decisions using the unfiltered preview plus the same bulk-eligibility helper as production review;
- restores review decisions by replaying existing correspondence decision controls;
- resets filters to ALL only during exact-identity restore so every saved decision has a renderable control;
- generic review-only route is excluded;
- source/target input changes reset runtime restore guards but do not erase durable state.

### Existing next-step shell

Only four lines changed: import/mount/destroy the dedicated persistence shell. Navigation / transfer-waiting responsibility remains otherwise unchanged.

## Files

- `tabs/cii-workspace/cii-workspace-multisource-session-persistence.js`
- `tabs/cii-workspace/cii-workspace-multisource-session-shell.js`
- `tabs/cii-workspace/cii-workspace-multisource-next-step-shell.js`
- `tests/cii-workspace-multisource-session-persistence.test.js`
- `tests/browser/cii-writer2-multisource-session-persistence.spec.mjs`

## Falsifiers / tests authored

Deterministic model contract:
- custody key requires source-set + original target hashes;
- wrong target custody cannot restore;
- corrupt JSON returns no session;
- blocked browser storage returns no storage instead of breaking Writer2;
- manual pairs restore duplicate-safe;
- manual authority suppresses automatic selection;
- stale automatic selection keys are explicit and remain non-authoritative;
- invalid review decisions are dropped;
- correspondence-identity mismatch drops saved review decisions;
- missing correspondence IDs are dropped.

Retained browser lifecycle:
- inspect exact S1/S2/S3/T;
- lock S1 `3910 ↔ 875` via the real manual editor;
- build correspondence;
- set a real pending ACCEPT decision;
- close Writer2;
- reopen, reselect exact retained files and inspect;
- confirm S1 manual authority restored and automatic S1 authority suppressed;
- rebuild correspondence;
- confirm the exact saved correspondence decision restores as pending;
- confirm localStorage contains schema state only, including exact manual pair and review identity.

## Protected invariants

- no CII file bytes persisted;
- no correspondence matching change;
- no anchor qualification / propagation change;
- no private Writer2 Map mutation from persistence;
- no Writer mutation authority change;
- no transfer-scope contract change;
- no benchmark/geometry/Method-A change;
- generic review-only route excluded;
- stale custody/selection/correspondence data fails closed;
- owner-only merge remains in force.

## Validation truth

- architecture/source audit: PASS;
- stacked diff scope: PASS — five functional/test files before this report;
- deterministic session-persistence test: AUTHORED / NOT_RUN in connector-only execution context;
- retained close/reopen browser lifecycle: AUTHORED / NOT_RUN;
- retained automatic S1/S2/S3 benchmark on this head: NOT_RUN;
- exact-head provider status/workflow evidence: pending final-head query;
- merge: NOT AUTHORIZED.

## MATERIAL_FRONTIER

Retained Writer2 UI session persistence only.

## SEMANTIC_EVIDENCE_FRONTIER

Persistence can recover user/session intent only under exact custody and correspondence identity. It never creates new matching or mutation authority.

## EXACT_NEXT_ACTION

Open stacked draft PR, query exact-head provider evidence, publish TASK_EVIDENCE on #1239. Then stop adding semantic slices until executable validation is available or Owner explicitly requests the next implementation responsibility. No merge.
