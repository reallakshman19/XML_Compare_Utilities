# WIP-cii-writer1a — CII Target Writer 1A

## Recovery header

- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- MUTATION_AUTHORITY: WRITE_ALLOWED
- EXECUTION_MODE: MANUAL
- BASE_DEPENDENCY: PR990 `agent/cii-writer-roadmap-doc` @ `b0285e28274ae951e5b85a2a0dc3c38e765a510c`
- LIVE_MAIN: `13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`
- COORDINATION: SAFE_STACKED_ON_PR990
- TARGET_MUTATION_SCOPE: WRITER_1A_CARDINALITY_PRESERVING_ONLY

## Handover in 60 Seconds

Implement the first qualified target-CII writer slice after correspondence approval. Writer 1A is limited to approved, in-place edits that do not change node/element identity, section cardinality, or auxiliary pointer ownership. Initial production target is ELEMENT WT/P1/T1/T2 plus existing RIGID weight; restraint in-place editing follows only after slot-to-slot authority is explicitly qualified. Node/element topology and pointer/cardinality-changing CREATE/DELETE remain blocked.

## Live ground truth

- PR989 is merged into `main` at `13e7c0e653e6d61ef2f2217068e1010bd5a53bf6` although `agents/MASTER_INDEX.md` on main is stale and still describes PR989 as draft.
- PR990 is open/draft/mergeable and documentation-only; this work is intentionally stacked on it.
- Protected external writer remains `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py`; do not modify it.
- Current Stage06 hard-blocks apply and has a stale impossible status check (`plan.status === READY`) while transfer-plan emits `PREVIEW_READY`/`BLOCKED`.

## Mission / scope

1. Introduce a byte-preserving target writer that patches only exact qualified fixed fields.
2. Change transfer classification so WT and qualified P1/T1/T2 can become COPY/PREVIEW_READY.
3. Add T2 engineering-delta evidence.
4. Enable Stage06 only when every non-KEEP approved operation in the selected plan is Writer-1A-qualified.
5. Reparse the produced CII and fail closed on parse errors or unexpected semantic changes.

Explicitly out of scope for this PR:

- OD modification (Writer 1B conditional);
- free-slot/new restraint creation (Writer 1B);
- SIF/TEE rewrite (Writer 1B);
- new auxiliary records/pointer re-indexing (Writer 2);
- node/element/connectivity changes (Writer 3);
- workflow-file changes;
- protected writer changes.

## Current technical diagnosis

- `cii-workspace-placeholders.js` reserves Stage06 and checks unreachable `plan.status === READY`.
- `cii-workspace-transfer-policy.js` blanket-protects `WALL` and blocks `PROCESS`.
- `cii-workspace-engineering-delta.js` emits WT and P1/T1 but not T2.
- protected writer authority confirms ELEMENT row 2 uses six fixed fields `[WT, insulation, corrosion, T1, T2, T3]` and row 4 uses `[P1..P6]` with widths `[15,13,13,13,13,13]`.
- restraint delta payload currently aggregates records and does not yet preserve an explicit source-slot→target-slot mutation mapping. Do not guess this mapping.

## Authority / invariants

Must remain unchanged in Writer 1A output unless explicitly approved and qualified:

- node numbers;
- FROM/TO connectivity;
- DX/DY/DZ geometry;
- element count and ordering;
- section cardinality;
- ELEMENT auxiliary pointers;
- OD;
- SIF/TEE, hanger, reducer and other unsupported sections;
- all unrelated bytes/fields.

## Validation ledger

- protected writer source inspection for ELEMENT row2/row4 fixed-field layout: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE.
- current Stage06 and policy source trace: PASS / SOURCE_INSPECTION / IMPLEMENTATION_COUPLED.
- complete checkout runtime: NOT_RUN — container DNS cannot resolve github.com.

## Changed-file ledger

Current: this WIP report only.

## Risks / decisions

- RISK-1: rewriting whole numeric rows can alter unrelated formatting; writer must patch only exact field spans.
- RISK-2: duplicate FROM/TO pairs require parsed element index/block custody, not endpoint text alone.
- DEC-1: first writer commit isolates ELEMENT WT/P/T + existing RIGID weight before restraint slot mutation.
- DEC-2: unsupported approved operations block apply; they are never silently skipped.

## Exact continuation state

EXACT_NEXT_ACTION: open the stacked PR, materialize the minimum exact source subset locally for backup/test discipline, then implement the Writer 1A fixed-field patch engine and focused regressions.

## Appendix A — implementation qualification

A1 Production trace: traced `engineering-delta -> transfer-policy -> transfer-plan -> Stage06`; exact blocker identified.
A2 Failure isolation: `READY` status is unreachable; policy also blocks Writer-1A candidates.
A3 Authority/invariant: protected writer row2/row4 format identified; topology/pointers/cardinality remain protected.
A4 Independent validation: protected-writer source layout is external authority; round-trip semantic oracle will be added independently of mutation formatting.
A5 Minimal patch: introduce writer module + narrow policy/delta/Stage06 integration; do not touch M1/M2/topology/propagation.

QUALIFICATION_RESULT: CONTINUE — repository-specific evidence established; implementation authority limited to declared Writer 1A scope.
