# PR1065 Work Report

HANDOVER_READINESS: IN_PROGRESS
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 1065
BRANCH: feature/cii-find-replace-icon-v14
MISSION: Deliver a visible CII v14 Find & Replace UI with CSV/manual-table proposal entry, preview/approval, TARGET0 validation, and qualified in-memory postimage preview. File mutation remains disabled.

## Live grounding

- Base: `main@d35f6aa419244585afec2c47c8fbd0584011931a`
- Pre-batch head: `f54bbdfcab5cea32a2a55e286f1a58dc6753317a`
- PR state: DRAFT / mergeable
- Ahead/behind before this batch: 16 / 0
- Existing Find & Replace production diff before this batch: additive modules/tests only; no existing production module modified.
- Active overlap review: PR1033 is qualification/data-only with no production paths; other open PRs found do not overlap `tabs/cii-workspace/cii-workspace-tab.js` or Find & Replace paths. Coordination classification: SAFE for this batch.

## Takeover qualification / authority

TAKEOVER_AUTHORITY: CONTINUE

A1 Production trace: Utilities registry installs `installCiiWorkspaceTile`; `cii-workspace-tab.js` owns the existing CII Workspace and Writer2 tiles/overlay lifecycle.
A2 Current failure isolation: Find & Replace modules exist but no production tile/controller invokes them, so the feature is unreachable from existing UI.
A3 Authority/invariant: existing CII compare/writer behavior must remain unchanged; Find & Replace may create TARGET0-relative proposals/claims and an in-memory TARGET1 only; no file write or writer call.
A4 Independent validation: existing validator hashes immutable TARGET0, rejects width/overlap/stale preimage, and independently checks TARGET1 against claims.
A5 Minimal patch boundary: add a dedicated Find & Replace controller/style and one minimal `cii-workspace-tab.js` registration/lifecycle hook; add focused tests. Do not modify compare, writer, parser, converter, or registry descriptors.

## Current implementation

Existing branch modules provide:
- CSV schema intake for DOCUMENT / ELEMENT / BLOCK.
- explicit PROPOSED / APPROVED / REJECTED / BLOCKED preview state.
- exact ELEMENT / FORCE / DISPLACEMENT scope resolution.
- TARGET0 preimage/postimage validation.
- deterministic in-memory TARGET1 assembly.

## Batch plan

1. Add immutable UI session orchestration for target CII v14, CSV intake, manual table entry, row decisions, and qualified preview.
2. Add browser UI controller and dedicated stylesheet.
3. Upgrade the panel markup for target CII + CSV + manual entry + preview + audit state.
4. Add a real `↔ CII Find & Replace — V14` tile through the existing CII tile installer and shared overlay lifecycle.
5. Add focused session/registration/lifecycle tests.
6. Keep Apply-to-file visibly disabled and fail closed.

## Protected invariants

- No file/CII/XML mutation.
- No Writer1/Writer2 invocation.
- No silent version fallback: non-v14 target blocks qualification.
- CSV must be previewed; manual rows use the same operation contract.
- Only APPROVED rows reach validation.
- Claims remain TARGET0-relative.
- Equal byte length required by default.
- Existing CII Workspace / Writer2 tile behavior remains available.

## Validation state

- Prior focused foundation checks: PASS (5/5, reported from earlier isolated execution).
- Prior TARGET0 validator checks: PASS (3/3, reported from earlier isolated execution).
- New scope/executor tests: AUTHORED / NOT_RUN at batch start.
- Full repository suite: NOT_RUN.

## Changed-file ledger at batch start

No existing production file has yet been changed by this batch.

## Highest risk

The only planned existing production edit is `tabs/cii-workspace/cii-workspace-tab.js`. It must not disturb existing overlay lifecycle or writer-version behavior.

## Exact work location

`tabs/cii-workspace/cii-workspace-find-replace*.js`, dedicated Find & Replace CSS/tests, and one minimal CII tile installer integration.

## EXACT_NEXT_ACTION

Implement the complete UI/controller integration as one coherent commit, then inspect the PR diff and validation surfaces before any further authority expansion.
