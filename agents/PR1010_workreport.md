# PR1010 — CII Writer 1A + 1B + 1C Composite Work Report

## Recovery header

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 1010
BRANCH: agent/cii-writer-composite-1a-1b-1c
BASE: main@d63e8c59a13013c9367a3c99f3e1293e1ca76203
MISSION: compose already-qualified Writer 1A, Writer 1B and Writer 1C mutations from one untouched TARGET preimage
CURRENT_STAGE: IMPLEMENTED_DRAFT_AWAITING_FULL_RUNTIME_QUALIFICATION
MERGE_AUTHORITY: OWNER_ONLY
```

## 1. Why this PR exists

Standalone Writer 1B currently implements its superset behavior by running Writer 1A first and then applying Writer-1B-only fields to the resulting text. That sequencing is acceptable inside standalone Writer 1B, but it cannot be used as mutation authority for a general Writer 1A + 1B + 1C transaction because the preimage would become writer-order dependent.

PR1010 therefore introduces a separate composite authority path. It does not change standalone Writer 1A or Writer 1B behavior.

## 2. Composite transaction model

```text
untouched original TARGET
   |-- lower Writer1A/1B dry-run from original text
   |      -> existing Writer1B superset engine
   |      -> lower physical mutation testimony
   |      -> exact line/column -> original absolute-byte span
   |      -> every beforeField must equal untouched original bytes
   |
   |-- Writer1C dry-run from original byte-custodied TARGET
          -> NODENAME / qualified V11 SIF claims
          -> existing Writer1C independent custody

lower claims + Writer1C claims
 -> require explicit Writer1A / Writer1B / Writer1C authority identity
 -> block cross-family same-span ownership
 -> block cross-family partial overlap
 -> canonicalize only same-family identical claims
 -> patch ONE copy of original TARGET bytes
 -> re-intake final output
 -> independently validate both dry-run components
 -> validate final D_actual subset of authorized union
```

No Writer output is used as the preimage for another writer family.

## 3. Lower-writer authority

Every lower operation admitted to the composite must retain a qualified transfer-policy authority:

```text
CII_WRITER_1A_* -> WRITER_1A
CII_WRITER_1B_* -> WRITER_1B
anything else   -> BLOCK
```

Blocker:

```text
WRITER_COMPOSITE_LOWER_POLICY_AUTHORITY_REQUIRED:<operationId>
```

This is intentionally separate from the question of whether the standalone Writer1B implementation recognizes the operation shape. Recognition by a writer implementation is not sufficient mutation authority.

## 4. Original-preimage proof for lower claims

Writer1A/1B mutation results report physical line number and fixed-field columns. The composite converts those to absolute original-byte spans using `targetDocument.physicalFile.lines[lineIndex].byteStart`.

For every lower mutation:

```text
byteStart = physicalLine.byteStart + (startColumn - 1)
byteEnd   = physicalLine.byteStart + endColumn
width     = byteEnd - byteStart
```

Required:

```text
width == beforeField.length == afterField.length
originalBytes[byteStart:byteEnd] == beforeField
```

Therefore a lower dry-run that depended on a previous mutation cannot silently enter the final transaction: its reported preimage would fail against the untouched TARGET.

## 5. Cross-family arbitration

Rules are fail-closed:

```text
same family + same span + identical pre/post -> may canonicalize
same family + same span + divergent pre/post -> BLOCK
Writer1A vs Writer1B vs Writer1C same span    -> BLOCK even if postimage identical
any partial span overlap                      -> BLOCK
```

Key blockers:

```text
CII_WRITER_COMPOSITE_CROSS_FAMILY_SAME_SPAN
CII_WRITER_COMPOSITE_SAME_SPAN_CONFLICT
CII_WRITER_COMPOSITE_CROSS_FAMILY_SPAN_OVERLAP
```

There is no last-writer-wins behavior.

## 6. Component validation and final negative assurance

The composite does not replace existing validators.

Lower dry-run:

```text
existing validateCiiWriterRoundTrip(..., WRITER_1B_COMPONENT)
```

This validates the qualified Writer1A/1B semantic union against the untouched TARGET.

Writer1C dry-run:

```text
existing validateCiiWriter1CRoundTrip(...)
```

This independently validates NODENAME/SIF physical and semantic authority against the untouched TARGET.

Final composite validator then requires each applicable component validation to PASS and checks:

```text
D_actual_bytes subset S_auth_union
exact authorized beforeField/postField
all authorized spans non-overlapping
one original byte-vector patch
byte length unchanged
physical line count unchanged
line-ending sequence unchanged
section order unchanged
final reparse originalByteString == writer result bytes
```

## 7. Production routing

Writer1A and Writer1B routing remain unchanged.

Writer1C preview/readiness now uses `ciiWriterCompositeReadiness`, so Writer1C can act as the qualified superset transaction. The product default remains Writer1B; this PR does not silently promote Writer1C to the default.

`cii-workspace-transfer-scope.js` uses the same composite readiness after explicit APPLY / EXCLUDE scope binding.

## 8. Regression coverage authored

```text
tests/cii-workspace-writer-composite-plan.test.js
tests/cii-workspace-writer-composite-mixed.test.js
tests/cii-workspace-writer-composite-three-family.test.js
tests/cii-workspace-writer-composite-validation.test.js
tests/cii-workspace-writer1c-routing.test.js
```

Coverage includes:

- lower-vs-Writer1C plan splitting;
- explicit Writer1A/Writer1B authority classification;
- unqualified lower-operation rejection;
- lower original-preimage mismatch falsifier;
- same-family identical-span canonicalization;
- cross-family same-span rejection even for identical bytes;
- partial-overlap rejection;
- Writer1B + Writer1C synthetic mixed transaction;
- Writer1A + Writer1B + Writer1C synthetic three-family transaction;
- final union unauthorized-byte falsifier;
- missing component-validation falsifier;
- Writer1C scope/core routing to composite readiness;
- production default remains Writer1B.

## 9. Validation truth

Exact repository checkout attempt:

```text
git clone ...
fatal: unable to access ... Could not resolve host: github.com
```

Current evidence:

```text
main/base grounding                         PASS_GIT_COMPARE
branch scope audit                          PASS_GIT_COMPARE
source architecture audit                   PASS_SOURCE_INSPECTION
isolated split/arbitration logic             PASS_ISOLATED_COMPOSITE_LOGIC_HARNESS_PRE_FINAL_REFINEMENT
isolated union validator                     PASS_ISOLATED_COMPOSITE_LOGIC_HARNESS
latest authority-aware planner tests         AUTHORED_NOT_RUN_ENVIRONMENT
Writer1B + Writer1C synthetic test           AUTHORED_NOT_RUN_ENVIRONMENT
Writer1A + Writer1B + Writer1C synthetic     AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer1A/1B/1C tests               NOT_RUN_ENVIRONMENT
full npm test                                NOT_RUN_ENVIRONMENT
browser product flow                         NOT_RUN_ENVIRONMENT
```

No authored-but-unexecuted test is claimed PASS.

## 10. Changed-file ledger

Production:

```text
tabs/cii-workspace/cii-workspace-core.js
tabs/cii-workspace/cii-workspace-target-writer-composite.js
tabs/cii-workspace/cii-workspace-transfer-scope.js
tabs/cii-workspace/cii-workspace-writer-composite-validation.js
```

Tests:

```text
tests/cii-workspace-writer-composite-mixed.test.js
tests/cii-workspace-writer-composite-plan.test.js
tests/cii-workspace-writer-composite-three-family.test.js
tests/cii-workspace-writer-composite-validation.test.js
tests/cii-workspace-writer1c-routing.test.js
```

Recovery artifacts are added under `agents/`.

No converter core, parser fixed-field engine, benchmark CII, workflow, Writer1A implementation or Writer1B implementation is modified.

## 11. Explicit exclusions

Still outside this PR:

- any new engineering-field semantic qualification;
- Writer2 record creation/deletion/pointer allocation/reindexing;
- SIF block create/delete/cardinality/CONTROL mutation;
- new neutral editions or SIF fields beyond the merged Writer1C scope;
- cross-family same-span canonicalization;
- sequential Writer1B-output -> Writer1C mutation;
- weakening existing component validators.

## 12. Appendix A — takeover qualification

1. Explain why standalone Writer1B sequential use of Writer1A cannot be the authority model for a mixed 1A+1B+1C transaction.
2. Show how a lower mutation line/column claim is converted to an absolute original-byte span.
3. Explain why `beforeField == original span` detects hidden sequential dependencies.
4. State how a lower operation is classified as Writer1A vs Writer1B authority.
5. Why is implementation recognition insufficient without `CII_WRITER_1A_*` / `CII_WRITER_1B_*` policy authority?
6. What happens if Writer1A and Writer1C claim the same physical span with identical postimage?
7. What happens for partially overlapping spans?
8. Which same-span condition may canonicalize?
9. Explain the difference between component validation and final union validation.
10. State the final `D_actual subset S_auth_union` requirement.
11. Explain why the actual byte vector is patched only once.
12. Prove standalone Writer1A and Writer1B behavior is unchanged by this PR.
13. Identify the three-family regression and the three fields used in it.
14. List all NOT_RUN runtime gates.
15. Explain why this PR adds composition authority but no new engineering-field semantics.

## 13. Current disposition

PR1010 is draft and must not merge without explicit owner authorization. Full repository and browser runtime qualification remain required before a release-quality PASS can be claimed.
