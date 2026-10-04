# PR1240 work report — CII Writer2 evidence-qualified Compare Review

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1239`
- `PR`: `#1240`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `BASE`: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-evidence-qualified-review-1239`
- `MATERIAL_HEAD_BEFORE_REPORT_REFRESH`: `9f8215b094c3b7150892e85549e2de78b002ffbb`
- `PR_STATE`: OPEN / DRAFT / UNMERGED

## Owner correction: audit before implementation

Owner explicitly required **audit first, then implement**. Further product mutation was stopped, current `main`, #1239, PR #1240, the actual evidence producers, review projector, bulk-review state machine and inherited-status producers were audited, and only then were corrections continued.

## Audit findings

### A1 — adjacent boundary is a legitimate composite HIGH authority

`cii-workspace-alignment.js#boundaryRow()` independently scores the matched element on each side of a shared node. It emits authority `ADJACENT_MATCH_BOUNDARY` and status HIGH only when both adjacent element evidences have explicit HIGH identity confidence. The proof is stored as `evidence.leftElement` + `evidence.rightElement`; it is not direct NODE M1/M2 evidence.

### A2 — first repair still leaked workflow HIGH into review confidence

The first #1240 implementation recognized adjacent consensus but still allowed ordinary rows to fall through to the global `ciiIdentityConfidence(row)`, whose legacy shortcut includes `row.status === HIGH -> HIGH`. That was a residual defect. Compare Review now derives confidence from recognized evidence rather than workflow labels.

### A3 — HIGH must imply normalized identity binding

The fail-closed invariant is now `review HIGH => identityBound`. An explicit-looking HIGH token cannot be rendered as evidence-qualified HIGH when the relevant candidate/direct/composite authority does not actually bind identity.

### A4 — RIGID component status is a legitimate derivative authority

`cii-workspace-components.js` creates `POINTER_BOUND_RIGID_COMPONENT_CONTEXT` rows whose status follows the parent element unless rigid pointer custody conflicts. The row points to `parentElementCorrespondenceId` and intentionally does not duplicate parent M1/M2 identity evidence. Existing `engineering-delta.js#componentDeltas()` already derives component legitimacy from a bound parent plus no pointer-custody blockers.

Compare Review therefore normalizes the same contract:

```text
qualified parent ELEMENT identity
+ qualified RIGID pointer custody
= derivative component identity
```

### Audit disposition

`CONTINUE` with this PR restricted to Compare Review evidence normalization, review rendering and bulk eligibility. No correspondence producer, global engineering-delta authority, writer, bridge, Method-A/B algorithm, benchmark or transfer-scope change is authorized.

## Implemented after audit

### Compare Review normalization

`tabs/cii-workspace/cii-workspace-compare-review.js` now applies:

```text
LOCKED authority                    -> LOCKED / BOUND
candidate.status != SUPPORTED       -> REVIEW/UNRESOLVED / unbound
candidate.status == SUPPORTED       -> bound; confidence from explicit winner evidence
ADJACENT_MATCH_BOUNDARY             -> HIGH only for 2/2 identity-supported HIGH adjacent elements
explicit direct identity evidence   -> HIGH only when explicit HIGH + identitySupported=true
naked workflow status HIGH          -> REVIEW / unbound
unbound row                         -> never review HIGH
RIGID component                     -> parent evidence-qualified identity + valid pointer custody
```

The projector exposes `identityEvidenceBasis`, `adjacentBoundary`, and `componentIdentity` so UI/bulk behavior consumes one normalized authority result.

### Review UI

`tabs/cii-workspace/cii-workspace-multisource-review-ui.js` now:

- renders adjacent NODE proof as `ADJACENT CONSENSUS · 2/2 HIGH` with LEFT/RIGHT M1/M2/OD summaries;
- does not claim direct NODE M1/M2 evidence for an adjacent boundary;
- renders RIGID derivative proof as `RIGID COMPONENT · PARENT <confidence> · POINTER CUSTODY PASS/BLOCKED`;
- uses evidence-specific rationale rather than `RED 0/0` for recognized derivative authorities;
- only uses the generic direct M1+M2 HIGH explanation when both projected methods actually pass;
- makes Bulk Accept messaging explicit that Accept marks decisions first and `Apply approvals to Transfer Preview` rebuilds correspondence/scope.

### Focused deterministic regression

`tests/cii-workspace-adjacent-boundary-review.test.mjs` covers:

1. valid `340→10260`-style adjacent 2/2 HIGH => HIGH/BOUND + bulk eligible;
2. naked workflow HIGH => REVIEW/unbound;
3. SUPPORTED candidate without explicit confidence => BOUND but not HIGH;
4. explicit direct supported HIGH => HIGH/BOUND;
5. explicit HIGH without binding support => REVIEW/unbound;
6. valid RIGID parent+pointer custody => derivative HIGH/BOUND;
7. RIGID cannot inherit HIGH from a parent that only has workflow HIGH and no evidence;
8. RIGID pointer-custody conflict => UNRESOLVED/unbound;
9. manual LOCKED remains LOCKED/BOUND;
10. recognized composite/derivative UI does not render the misleading `RED 0/0` direct-evidence presentation.

A weak guarded producer-integration assertion was deliberately removed because it could pass without executing the scorer. No pseudo-PASS is retained.

## Producer audit result

Default-branch search/inspection found the relevant authority forms at this review boundary:

- scored path/alignment ELEMENT rows carry explicit identity evidence;
- propagated ELEMENT/NODE rows carry candidate/direct evidence;
- `ADJACENT_MATCH_BOUNDARY` is the recognized left/right composite authority;
- `POINTER_BOUND_RIGID_COMPONENT_CONTEXT` is the recognized parent-derived component authority;
- manual anchors are LOCKED authority.

No additional relevant inherited `status: row.status` producer was found beyond RIGID component context.

## Protected invariants / negative assurance

No change to correspondence generation, `cii-workspace-engineering-delta.js` global semantics, Writer2 CREATE/DELETE, Writer1C exact-span mutation, V11↔V14, Method-A/B matching/discovery, #1234 search budget, transfer-scope authority, frozen Benchmark files/answers, workflows or deployment. Production code reads no benchmark IDs or expected answers.

## Current diff boundary

Against `main`, PR #1240 changes only:

1. `agents/PR1240_workreport.md`
2. `tabs/cii-workspace/cii-workspace-compare-review.js`
3. `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`
4. `tests/cii-workspace-adjacent-boundary-review.test.mjs`

PR #1234 has no exact production-file overlap with this slice.

## Validation truth

| Gate | Status | Observation / oracle |
|---|---|---|
| live main grounding | PASS | exact GitHub readback |
| #1239 contract + correction audit | PASS | issue readback |
| adjacent-boundary producer trace | PASS | exact source inspection |
| status-fallback audit | FAIL → FIXED | review no longer inherits workflow HIGH |
| HIGH-without-binding audit | FAIL → FIXED | HIGH now requires normalized binding |
| RIGID inherited-status audit | FAIL → FIXED | explicit parent+pointer-custody contract |
| producer search for other inherited-status paths | PASS (static) | none found at this review boundary |
| diff scope | PASS | 2 production modules + focused test + report |
| test design inspection | PASS | no benchmark hard-coding / guarded pseudo-pass |
| GitHub statuses on prior product/test head `23b22a21…` | NOT_RUN / none instantiated | statuses=[] |
| GitHub workflow runs on prior product/test head `23b22a21…` | NOT_RUN / none instantiated | workflow_runs=[] |
| focused imported Node execution | NOT_RUN | no full authenticated checkout in connector session |
| existing review/confidence/rigid regressions | NOT_RUN | same environment boundary |
| retained S1/S2/S3→T browser benchmark | NOT_RUN | not claimed |
| byte closure / V11↔V14 retained qualification | NOT_RUN | not claimed |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## MATERIAL_FRONTIER

`Compare Review evidence normalization + review rendering + bulk-HIGH eligibility` only.

## SEMANTIC_EVIDENCE_FRONTIER

Static producer/authority audit is PASS. Exact imported Node, retained Chromium, byte closure and V11↔V14 execution remain NOT_RUN.

## Follow-on — not implemented in this first PR

After executable validation of this authority slice, #1239 retains: full `Correspondence → Source vs Target` census/export; partial-TEXPECTED 36-delta positive overlay; direct proposal `Use / Review & Lock / Reject`; causal blocker tree/no-scope hash-noise suppression; hash-keyed Writer2 session persistence.

Issue #1237 remains the broader anchor-seed/cardinality specification. PR #1238 must not independently alter this active review-authority slice.

## Highest remaining risk

Executable compatibility. If a legitimate producer is later found to rely only on workflow HIGH, add a named evidence contract for that producer rather than restoring status-as-proof.

## EXACT_NEXT_ACTION

On the final exact PR head after this report refresh:

```text
node tests/cii-workspace-adjacent-boundary-review.test.mjs
relevant existing compare-review/confidence/rigid-custody tests
retained S1/S2/S3 -> T browser benchmark
```

Record PASS / FAIL / NOT_RUN truth. Keep PR #1240 draft and unmerged until explicit Owner authorization.
