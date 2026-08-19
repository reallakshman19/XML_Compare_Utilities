# WIP — CII Writer 1B qualified slice

## Recovery Header

```text
WORK_ID: WIP-cii-writer-1b-qualified-slice
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_BRANCH: main
BASE_BASIS_SHA: edf297f7e749d4ff2fe68a84d2482d5344c284d5
WORKING_BRANCH: agent/cii-writer-1b-qualified-slice
PR: NOT_ALLOCATED
CURRENT_STAGE: SOURCE_QUALIFICATION
HANDOVER_READINESS: READY
EXACT_NEXT_ACTION: qualify exact fixed-field/ownership semantics for Writer 1B candidates, then implement only proven cardinality-preserving operations.
```

## Handover in 60 Seconds

Writer 1A is merged on main. This successor implements the next Writer 1B slice without changing protected external writers or model topology. Live main at branch creation is `edf297f7e749d4ff2fe68a84d2482d5344c284d5`.

The current source audit shows two candidates close to production qualification:

1. conditional ELEMENT OD modification: OD is already the sixth canonical ELEMENT header fixed field; current auxiliary evidence already exposes reducer pointers. Qualification must prove plain-element/reducer-safe custody and update negative assurance so OD changes are expected only when explicitly approved;
2. existing RESTRANT block free-slot create/clear: the protected writer defines six 4-row slots per 24-row restraint block and emits empty slots as two zero numeric rows plus empty tag/GUID A100 rows. Writer 1B must preserve the existing block pointer and row cardinality, and must fail closed if slot emptiness or metadata policy is not fully qualified.

Not yet authorized for mutation in this slice unless the ongoing source audit proves complete semantics:

- P2..P9 / T3..T9 and extended density/process fields;
- existing SIF/TEE payload rewrite;
- BEND/FORCMNT/DISPLMNT/other auxiliary families.

## Live Ground Truth

- `main`: `edf297f7e749d4ff2fe68a84d2482d5344c284d5`
- predecessor PR #990: merged
- predecessor PR #991 Writer 1A: merged
- active CII-writer overlap found in live open-PR scan: none
- repository instructions: `AGENTS.md` + `Common/skills/engineering-pr-delivery`
- workflow edits: forbidden unless separately authorized
- protected external writer: `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py` read-only authority

## Scope / Acceptance

### In scope

- qualify and implement safe Writer 1B cardinality-preserving operations;
- transfer-policy/readiness integration;
- exact target fixed-field mutation;
- reparse and semantic negative assurance;
- focused regression/benchmark tests;
- UI readiness/action wording only if required to expose real capability.

### Protected invariants

- node count and node numbers unchanged;
- element count/order unchanged;
- FROM/TO/DX/DY/DZ unchanged;
- auxiliary pointer values/ownership unchanged;
- section row cardinality unchanged;
- no unsupported operation silently skipped;
- no node-number-offset identity;
- no reducer/cardinality semantics inferred from OD alone;
- protected external writer unchanged.

## Active Findings

- `IMP-1`: Writer 1A currently treats OD as immutable in round-trip validation and transfer policy protects all `PIPE_SIZE`; Writer 1B needs an explicit conditional OD authority path, not a blanket unprotect.
- `IMP-2`: protected writer constants confirm `6` restraint slots, `4` rows/slot, `24` rows/block.
- `IMP-3`: protected writer explicitly documents empty restraint slot encoding as two zero numeric lines plus two empty A100 tag/GUID lines.
- `RISK-1`: free-slot creation is unsafe if target slot metadata is not empty or if source tag/GUID would require unqualified string mutation; default plan is fail-closed unless metadata can be preserved/qualified exactly.
- `RISK-2`: SIF/TEE current evidence authority explicitly says field-2 semantics are unqualified; do not rewrite raw 10-row payload merely because pointer custody is known.
- `RISK-3`: current parser normalizes only P1/T1/T2; extended P/T mutation must follow parser/source qualification, not guessed row positions.

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main grounding | PASS | SOURCE_INSPECTION | GitHub live state | main `edf297f7...` |
| open PR overlap scan | PASS | SOURCE_INSPECTION | GitHub live state | no active CII Writer overlap |
| protected restraint block constants | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | protected writer: 6 × 4 = 24 rows |
| protected empty-slot encoding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | two zero numeric + empty tag/GUID rows |
| production Writer 1B runtime | NOT_RUN | NOT_OBSERVED | NONE | not implemented yet |

## Changed-file Ledger

- `agents/WIP-cii-writer-1b-qualified-slice_workreport.md` — recovery record only.

## Appendix A — Current-Agent Qualification Record

A1 Production Trace — PASS: traced engineering delta -> transfer policy -> Writer 1A readiness -> fixed-field patch -> intake/reparse -> negative assurance; identified OD currently blocked at transfer policy and immutable validation.

A2 Current Failure Isolation — PASS: Writer 1B capability gap is not correspondence; it is mutation authority/readiness plus missing exact field/slot qualification.

A3 Authority / Invariant — PASS: protected writer defines fixed layout; target-native pointers/cardinality/identity remain immutable.

A4 Independent Validation — PASS for source qualification only: protected writer is independent authority for restraint slot cardinality and empty-slot representation. Production Writer 1B execution remains NOT_RUN until implemented.

A5 Next-Commit / Minimal Patch — PASS: first production slice will be conditional OD and/or free restraint slot only if exact eligibility predicates can be stated and tested; unsupported extended families remain blocked.
