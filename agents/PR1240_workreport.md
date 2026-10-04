# PR1240 work report — CII Writer2 evidence-qualified Compare Review

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1239`
- `PR`: `#1240`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `BASE`: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-evidence-qualified-review-1239`
- `MATERIAL_HEAD_BEFORE_REPORT_REFRESH`: `23b22a21b184d9c7bef2b64f12281fa36905c994`
- `PR_STATE`: OPEN / DRAFT / UNMERGED

## Owner correction: audit before implementation

Owner explicitly required **audit first, then implement**. Further product mutation was stopped, current `main`, #1239, PR #1240, the actual evidence producers, review projector, bulk-review state machine and inherited-status producers were audited, and only then were corrections continued.

## Audit findings

### A1 — adjacent boundary is a legitimate composite HIGH authority

`cii-workspace-alignment.js#boundaryRow()` independently scores the matched element on each side of a shared node. It emits authority `ADJACENT_MATCH_BOUNDARY` and status HIGH only when both adjacent element evidences have explicit HIGH identity confidence. The proof is stored as:

```text
evidence.leftElement
evidence.rightElement
```

It is not direct NODE M1/M2 evidence.

### A2 — first repair still leaked workflow HIGH into review confidence

The first #1240 implementation recognized adjacent consensus but still allowed ordinary rows to fall through to the global `ciiIdentityConfidence(row)`, whose legacy shortcut includes:

```text
row.status === HIGH -> HIGH
```

That was a real residual defect. The review layer must derive confidence from recognized evidence, not workflow labels.

### A3 — HIGH must imply normalized identity binding

After removing the status fallback, a second fail-closed invariant was identified:

```text
review HIGH => identityBound
```

An explicit-looking HIGH token cannot be rendered as evidence-qualified HIGH when the relevant candidate/direct/composite authority does not actually bind identity.

### A4 — RIGID component status is a second legitimate derivative authority

Producer audit found one additional inherited-status path relevant to Compare Review:

`cii-workspace-components.js` creates `POINTER_BOUND_RIGID_COMPONENT_CONTEXT` rows with:

```text
status = parent element status unless rigid pointer custody conflicts
parentElementCorrespondenceId = parent element correspondence
```

The component row intentionally does not duplicate parent M1/M2 identity evidence. Existing `engineering-delta.js#componentDeltas()` already derives component legitimacy from the bound parent element plus no rigid pointer-custody blockers.

Therefore RIGID component review authority is normalized as:

```text
qualified parent ELEMENT identity
+ qualified RIGID pointer custody
= derivative component identity
```

This preserves legitimate component behavior without restoring status-as-proof.

### Audit disposition

`CONTINUE` with the repair restricted to Compare Review evidence projection, review rendering and bulk eligibility. No correspondence producer, global engineering-delta authority, writer, bridge, Method-A/B algorithm, benchmark or transfer-scope change is authorized in this PR.

## Implemented after audit

### `tabs/cii-workspace/cii-workspace-compare-review.js`

The projector now owns an explicit review authority normalization:

```text
LOCKED authority                    -> LOCKED / BOUND
candidate.status != SUPPORTED       -> REVIEW/UNRESOLVED / unbound
candidate.status == SUPPORTED       -> bound; confidence comes from explicit winner evidence
ADJACENT_MATCH_BOUNDARY             -> HIGH only for 2/2 identity-supported HIGH adjacent elements
explicit direct identity evidence   -> HIGH only when explicit HIGH + identitySupported=true
naked workflow status HIGH          -> REVIEW / unbound
unbound row                         -> never review HIGH
RIGID component                     -> parent evidence-qualified identity + valid pointer custody
```

Specific changes:

- removed Compare Review dependency on global `ciiIdentityConfidence()` / `ciiIdentityBound()` status shortcuts;
- added explicit candidate winner/confidence extraction;
- added `ADJACENT_EDGE_CONSENSUS` normalization and LEFT/RIGHT evidence summaries;
- separated identity binding from confidence;
- enforced HIGH => bound;
- added `PARENT_ELEMENT_PLUS_POINTER_CUSTODY` normalization for RIGID component rows;
- exposed `identityEvidenceBasis`, `adjacentBoundary`, and `componentIdentity` for audit/UI use;
- retained manual LOCKED authority.

### `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`

- adjacent nodes render `ADJACENT CONSENSUS · 2/2 HIGH` with LEFT/RIGHT M1/M2/OD evidence;
- adjacent nodes no longer render false `RED · 0/0` or pretend direct NODE M1/M2 proof;
- RIGID components render `RIGID COMPONENT · PARENT <confidence> · POINTER CUSTODY PASS/BLOCKED`;
- RIGID rationale names parent identity and pointer-custody authority rather than rendering RED/0-of-0;
- generic HIGH wording claims direct M1+M2 only when projected M1 and M2 actually pass;
- Bulk Accept success messaging now states that Accept decisions are pending and `Apply approvals to Transfer Preview` performs the rebuild.

### `tests/cii-workspace-adjacent-boundary-review.test.mjs`

Deterministic review-boundary falsifiers cover:

1. legitimate `340→10260`-style adjacent 2/2 HIGH consensus remains HIGH/BOUND and bulk-HIGH eligible;
2. naked workflow HIGH becomes REVIEW/unbound;
3. SUPPORTED candidate without explicit confidence remains BOUND but not HIGH;
4. explicit direct `identitySupported=true + identityConfidence=HIGH` remains HIGH/BOUND;
5. explicit HIGH with `identitySupported=false` is REVIEW/unbound;
6. RIGID component with HIGH/BOUND parent + valid pointer custody is derivative HIGH/BOUND;
7. RIGID component cannot inherit HIGH when its parent has status HIGH but no qualified evidence;
8. RIGID pointer-custody conflict is unbound/UNRESOLVED;
9. manual LOCKED remains LOCKED/BOUND;
10. composite/derivative UI evidence does not fall back to RED 0/0.

A weak guarded producer-integration assertion was deliberately removed during audit because it could pass without proving the scorer path. No pseudo-PASS is retained.

## Producer audit result

Default-branch search/inspection found the relevant HIGH producers used by this projection boundary:

- path/alignment ELEMENT rows carry the actual scored edge evidence including `identityConfidence` and `identitySupported`;
- `ADJACENT_MATCH_BOUNDARY` is the recognized left/right composite authority;
- propagated ELEMENT/NODE rows carry supported candidate evidence;
- `POINTER_BOUND_RIGID_COMPONENT_CONTEXT` is the recognized parent-derived component authority;
- manual anchor nodes are LOCKED authority.

No additional inherited `status: row.status` producer relevant to this Compare Review path was found beyond RIGID component context.

## Protected invariants / negative assurance

No change to:

- correspondence generation;
- `cii-workspace-engineering-delta.js` global semantics;
- Writer2 CREATE/DELETE authority;
- Writer1C exact-span mutation semantics;
- V11↔V14 normalization, target shadow, or projector;
- Method-A/B matching mathematics;
- anchor discovery/search budget (#1234);
- transfer-scope authority;
- frozen Benchmark files or benchmark answers;
- workflow or deployment files.

No benchmark IDs or expected answers are read by production code in this patch.

## Current diff boundary

Against `main`, PR #1240 changes only:

1. `agents/PR1240_workreport.md`
2. `tabs/cii-workspace/cii-workspace-compare-review.js`
3. `tabs/cii-workspace/cii-workspace-multisource-review-ui.js`
4. `tests/cii-workspace-adjacent-boundary-review.test.mjs`

PR #1234 remains an upstream performance/search-budget responsibility with no exact production-file overlap in this slice.

## Validation truth

| Gate | Status | Observation / oracle |
|---|---|---|
| live main grounding | PASS | `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08` |
| #1239 contract audit | PASS | issue + correction readback |
| adjacent-boundary producer trace | PASS | exact default-branch producer inspection |
| status-fallback audit | FAIL → FIXED | review projection previously inherited workflow HIGH fallback |
| HIGH-without-binding audit | FAIL → FIXED | projector now enforces HIGH => bound |
| RIGID inherited-status audit | FAIL → FIXED | explicit parent+pointer-custody derivative contract added |
| producer search for other inherited-status paths | PASS (static) | no additional relevant `status: row.status` producer found |
| branch diff boundary | PASS | 2 production review/UI modules + focused test + report |
| deterministic test design inspection | PASS | no benchmark hard-coding or guarded pseudo-pass |
| exact-head commit statuses | NOT_RUN / none instantiated | GitHub reports zero statuses on `23b22a21…` |
| exact-head workflow runs | NOT_RUN / none instantiated | GitHub reports zero workflow runs on `23b22a21…` |
| focused imported Node test execution | NOT_RUN | no full authenticated checkout available in this connector session |
| existing review/confidence regressions | NOT_RUN | same environment boundary |
| retained S1/S2/S3→T browser benchmark | NOT_RUN | not claimed on this head |
| byte closure / V11↔V14 retained qualification | NOT_RUN | not claimed on this head |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## MATERIAL_FRONTIER

```text
Compare Review evidence normalization
+ multi-source review evidence rendering
+ bulk-HIGH eligibility projection
```

No Writer2 mutation or transfer-scope authority has crossed the material frontier.

## SEMANTIC_EVIDENCE_FRONTIER

```text
PASS: producer/static contract audit
PASS: deterministic falsifier design/readback
NOT_RUN: exact imported Node execution
NOT_RUN: retained Chromium S1/S2/S3→T product benchmark
NOT_RUN: retained byte closure / V11↔V14 execution
```

## Follow-on — not implemented in this first PR

After executable validation of this authority slice, issue #1239 retains:

1. full `Correspondence → Source vs Target` census/export, including unmatched source nodes;
2. partial-TEXPECTED 36-delta known-positive overlay, never a negative oracle;
3. direct proposal `Use / Review & Lock / Reject` actions;
4. causal blocker tree and suppression of no-scope hash mismatch noise;
5. hash-keyed Writer2 session persistence.

Issue #1237 remains the broader anchor-seed/cardinality specification. PR #1238 must not independently alter this active review-authority slice.

## Highest remaining risk

Executable compatibility remains the principal risk. The review projection is intentionally stricter than `main`; a checkout-capable run must prove legitimate existing producers satisfy one of the explicit contracts above. If another legitimate producer is discovered that relies only on workflow HIGH, add a named evidence contract for that producer rather than restoring `status === HIGH` as authority.

## EXACT_NEXT_ACTION

On the final exact PR head after this report refresh, run:

```text
node tests/cii-workspace-adjacent-boundary-review.test.mjs
relevant existing compare-review/confidence/rigid-custody tests
retained S1/S2/S3 -> T browser benchmark
```

Record every command as PASS / FAIL / NOT_RUN. If any legitimate HIGH row is demoted, isolate its producer and evidence contract. Keep PR #1240 draft and unmerged until explicit Owner authorization.
