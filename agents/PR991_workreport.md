# PR991 — CII Target Writer 1A

## Recovery header

- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- MUTATION_AUTHORITY: WRITE_ALLOWED
- EXECUTION_MODE: MANUAL
- PR: 991
- BRANCH: `agent/cii-writer-1a`
- BASE_DEPENDENCY: PR990 `agent/cii-writer-roadmap-doc` @ `b0285e28274ae951e5b85a2a0dc3c38e765a510c`
- LIVE_MAIN_AT_START: `13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`
- COORDINATION: SAFE_STACKED_ON_PR990
- TARGET_MUTATION_SCOPE: WRITER_1A_CARDINALITY_PRESERVING_ONLY
- MERGE_AUTHORITY: OWNER_ONLY

## Handover in 60 Seconds

Writer 1A now has an executable target-mutation path for approved cardinality-preserving fields: ELEMENT WT/P1/T1/T2 and existing pointer-bound RIGID weight. The writer patches exact fixed-width spans, rejects stale TARGET bytes, reparses the generated CII, and fails unless the semantic negative-assurance audit reports zero unexpected changes. Stage06 is no longer a fake `NOT_IMPLEMENTED` gate; it is `READY_WRITER_1A` only when every approved non-KEEP operation is in the qualified Writer 1A whitelist. Existing-restraint mutation remains blocked pending explicit source-record→target-slot custody; do not infer slot order.

## Live ground truth

- PR989 is merged into `main` at `13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`.
- PR990 is open/draft and documentation-only; PR991 is intentionally stacked on PR990.
- PR991 is open/draft and mergeable at last live check.
- Protected external writer remains `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py`; it was inspected as format authority and not modified.
- The stale `agents/MASTER_INDEX.md` PR989 state was corrected on this branch.

## Implemented production path

### Fixed-field Writer 1A

`tabs/cii-workspace/cii-workspace-target-writer.js`

Qualified mutation whitelist:

```text
WALL | Wall thickness
PROCESS | P1
PROCESS | T1
PROCESS | T2
WEIGHT_RIGID | Rigid weight
```

Rules:

- plan must be `PREVIEW_READY`;
- mutating row must be `REVIEWED` or `LOCKED`;
- mutating action must be `COPY/PREVIEW_READY`;
- unsupported approved mutations block the whole writer;
- `KEEP/PREVIEW_READY` and `KEEP/PROTECTED` are permitted no-ops;
- at least one actual mutation is required;
- ELEMENT block is selected by parsed element index and raw FROM/TO identity check;
- exact field span is patched; whole rows are not re-rendered;
- raw TARGET field must equal transfer-plan `before` value;
- duplicate field claims are rejected;
- output text length must remain exactly unchanged;
- RIGID weight uses the existing qualified 1-based pointer record.

### Engineering-delta authority

`cii-workspace-engineering-delta.js` now publishes exact field authority:

```text
WT -> PROTECTED_WRITER_ELEMENT_ROW2_WT_FIXED_FIELD
P1 -> PROTECTED_WRITER_ELEMENT_ROW4_P1_FIXED_FIELD
T1 -> PROTECTED_WRITER_ELEMENT_ROW2_T1_FIXED_FIELD
T2 -> PROTECTED_WRITER_ELEMENT_ROW2_T2_FIXED_FIELD
```

T2 is exposed downstream through `cii-workspace-topology-adapter.js` but remains excluded from M2 topology identity.

### Transfer policy / plan

- WT is no longer blanket-protected.
- P1/T1/T2 are `COPY/PREVIEW_READY` only with exact fixed-field authority.
- OD and geometry remain protected.
- plan mutation authority is `WRITER_1A_CONDITIONAL` for a successful preview.
- any blocked/unsupported approved mutation prevents Writer 1A readiness even when the preview itself remains inspectable.

### Stage06 and UI

- Stage06 now reports `READY_WRITER_1A` or `BLOCKED_WRITER_1A`.
- Tab3 shows `TARGET MUTATION · WRITER 1A READY` only when all approved non-KEEP operations are writable.
- otherwise Tab3 remains `TRANSFER PREVIEW · BLOCKED` and lists Writer 1A blockers.
- the apply button calls the core Writer 1A path and downloads `Modified_<target>.CII` only after reparse/validation PASS.
- the legacy duplicate Stage06 apply control was removed.

### Core negative assurance

`applyCiiWorkspaceTargetWriter1A()`:

1. reparses current TARGET and requires the reviewed SHA-256 to match;
2. applies exact Writer 1A spans;
3. reparses modified TARGET;
4. checks element count unchanged;
5. checks FROM/TO/DX/DY/DZ/OD unchanged;
6. checks WT/P1/T1/T2 equal either original or the exact approved proposal;
7. checks parsed node geometry/numbers unchanged;
8. checks node names unchanged;
9. checks auxiliary pointer ownership unchanged;
10. checks RIGID pointer set unchanged and only approved weight records changed;
11. requires `unexpectedSemanticDeltaCount = 0` before returning exportable text.

## Explicitly deferred

- existing restraint mutation: deferred inside Writer 1A until exact source-record→target-slot mapping is retained;
- node-name mutation: not yet in the executable whitelist;
- OD mutation: Writer 1B conditional;
- free-slot/new restraint creation: Writer 1B;
- SIF/TEE in-place rewrite: Writer 1B;
- pointer/cardinality-changing auxiliary create/delete: Writer 2;
- node/element/connectivity changes: Writer 3;
- workflows and protected writer changes: forbidden in this PR.

## Restraint qualification finding

`cii-workspace-auxiliary.js` already proves each restraint record carries:

```text
pointer = 1-based 24-row RESTRANT block index
slot    = 1..6 fixed 4-row slot
node
typeCode
stiffness
gap
friction
connectingNode
directionCosines
```

However current engineering deltas compare sorted aggregate sets by node and discard explicit source-record→target-slot pairing. Therefore a general existing-restraint writer would currently have to guess slot identity. Next safe increment is:

```text
single SOURCE restraint record at approved node
+
single TARGET restraint record at corresponding node
=> explicit source pointer/slot + target pointer/slot custody
=> in-place type/stiffness/gap/friction/connecting-node/direction-cosine mutation
```

Multi-record nodes remain blocked until a deterministic record-pairing rule is independently qualified. Free-slot creation remains Writer 1B.

## Validation ledger

PASS:

- protected-writer source inspection: ELEMENT row2 = `[WT, insulation, corrosion, T1, T2, T3]`; row4 begins `[P1..P6]`; numeric row widths `[15,13,13,13,13,13]`.
- `tests/cii-workspace-target-writer-1a.test.js` executed from an exact minimal materialization of current writer + fixed-field helper. Initial run exposed a weak geometry substring assertion in the test oracle; the assertion was replaced by byte-identical ELEMENT header-row comparison. Re-run PASS.
- focused Writer 1A execution covers WT, P1, T1, T2, existing RIGID weight, exact output length, immutable FROM/TO/DX/DY/DZ/OD row, unsupported SIF fail-closed behavior, stale `before` rejection, and protected-writer numeric formatting cases.

NOT_RUN in a complete checkout:

```text
tests/cii-workspace-transfer-preview-policy.test.js
tests/cii-workspace-placeholder-gate.test.js
tests/cii-workspace-transfer-preview-ui.test.js
tests/cii-workspace-anchor-approval-ui.test.js
tests/cii-workspace-benchmark-transfer-preview.test.js
tests/cii-workspace-benchmark-end-to-end.test.js
tests/cii-workspace-benchmark-writer-1a.test.js
full inherited CII Workspace regression/browser lifecycle
```

The real benchmark writer test is committed for TARGET1 and TARGET2. It approves only SOURCE `250→255`, requires WT `COPY/PREVIEW_READY`, keeps OD protected, applies Writer 1A, reparses, requires `unexpectedSemanticDeltaCount == 0`, and rejects stale target bytes. It has not been executed in a complete checkout.

## Environment / backup limitation

Repo-local policy requires `node utils/backup.cjs save ...` before existing-file edits. Direct container DNS cannot resolve GitHub and a complete checkout could not be materialized, so the repo-local backup utility was NOT_RUN. GitHub connector updates used exact preimage blob SHAs and Git history remains recoverable, but this is not represented as a substitute PASS for the local backup policy.

## Changed-file ledger

Coordination:
- `agents/MASTER_INDEX.md`
- `agents/PR991_workreport.md`
- `agents/status/PR991.yaml`
- `agents/claims/PR991.yaml`

Production:
- `tabs/cii-workspace/cii-workspace-core.js`
- `tabs/cii-workspace/cii-workspace-engineering-delta.js`
- `tabs/cii-workspace/cii-workspace-placeholders.js`
- `tabs/cii-workspace/cii-workspace-shell.js`
- `tabs/cii-workspace/cii-workspace-target-writer.js`
- `tabs/cii-workspace/cii-workspace-topology-adapter.js`
- `tabs/cii-workspace/cii-workspace-transfer-plan.js`
- `tabs/cii-workspace/cii-workspace-transfer-policy.js`

Tests:
- `tests/cii-workspace-anchor-approval-ui.test.js`
- `tests/cii-workspace-benchmark-end-to-end.test.js`
- `tests/cii-workspace-benchmark-transfer-preview.test.js`
- `tests/cii-workspace-benchmark-writer-1a.test.js`
- `tests/cii-workspace-placeholder-gate.test.js`
- `tests/cii-workspace-target-writer-1a.test.js`
- `tests/cii-workspace-transfer-preview-policy.test.js`
- `tests/cii-workspace-transfer-preview-ui.test.js`

Temporary `agents/WIP-cii-writer1a_workreport.md` was retired after PR allocation.

## Risks / decisions

- RISK-1: formatting drift in engineering files is controlled by exact-span replacement + exact output-length guard.
- RISK-2: stale target bytes are blocked by SHA-256 before mutation.
- RISK-3: restraint slot ambiguity remains open; no inferred mapping is permitted.
- DEC-1: unsupported approved operations block apply; never silently skip.
- DEC-2: Stage06 uses Writer 1A readiness derived from `PREVIEW_READY`, not the obsolete unreachable `READY` contract.
- DEC-3: real TARGET1/TARGET2 writer benchmark must pass before this PR is merge-ready.

## Exact continuation state

EXACT_NEXT_ACTION: qualify and implement the single-record existing-restraint mutation path, then execute the real TARGET1/TARGET2 Writer 1A benchmark and inherited CII Workspace regression suite in a complete checkout. Keep PR991 draft and unmerged until those gates are observed PASS or the owner explicitly overrides them.

## Appendix A — implementation qualification

A1 Production trace: `engineering-delta -> transfer-policy -> transfer-plan -> writer-readiness -> Stage06/UI -> fixed-field writer -> reparse -> negative assurance` is implemented.
A2 Failure isolation: stale target hash, raw `before` mismatch, unsupported operation, duplicate field claim, field overflow, pointer failure and unexpected semantic delta fail closed.
A3 Authority/invariant: format fields come from protected writer source; topology/pointers/cardinality/OD remain immutable.
A4 Independent validation: mutation formatter is checked by reparsing and semantic negative assurance; real benchmark writer test is separate from production but NOT_RUN.
A5 Minimal patch: M1/M2/candidate/propagation algorithms and protected external writer are unchanged.

QUALIFICATION_RESULT: CONTINUE — initial executable Writer 1A slice implemented and focused test PASS; full real benchmark and existing-restraint sub-slice remain before merge readiness.
