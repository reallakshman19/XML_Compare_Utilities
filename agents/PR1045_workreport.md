# PR1045 work report — Writer2 W2.12 RESTRAINT one-TARGET0 composite adoption

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY_WITH_EXPLICIT_EXECUTION_LIMITATION
EXECUTION_MODE: AUTO_MODE
REPOSITORY: reallaksh19/XML_Compare_Utilities
ISSUE: #1044
PR: #1045
BRANCH: agent/cii-writer2-restraint-composite-w212
BASE_MAIN: b2ba46cb8008c8d59a40fe8b3260ead122e063d0
CURRENT_MAIN: b2ba46cb8008c8d59a40fe8b3260ead122e063d0
MERGED_PREDECESSOR: PR #1043 / W2.11
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
PRODUCT_CORE_AUTHORITY: FALSE
GENERIC_RESTRAINT_CREATE: BLOCKED
```

## 1. Mission

Adopt merged W2.11 RESTRAINT block DELETE into the existing Writer2 one-original-preimage composite while preserving the established NODE_NAME, SIF DELETE and HANGER DELETE families.

No product/core/UI routing is added in W2.12. That remains W2.13.

## 2. Grounding

W2.11 was squash-merged as PR #1043:

```text
main = b2ba46cb8008c8d59a40fe8b3260ead122e063d0
```

Consumed RESTRAINT authority:

```text
planner  = CII_WRITER_2_RESTRAINT_BLOCK_DELETE_COMPACTION_PLAN
physical = CII_WRITER_2_RESTRAINT_BLOCK_DELETE_PHYSICAL_WRITE
CONTROL  = row2 / field4 / I13
ELEMENT restraint pointer = exact physical I13 custody
RESTRANT block = 24 physical rows
```

Generic RESTRAINT CREATE remains blocked by:

```text
WRITER_2_RESTRAINT_BLOCK_CREATE_ALLOCATION_NOT_QUALIFIED
```

## 3. Implemented Writer architecture

New file:

```text
tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js
```

Authority:

```text
CII_WRITER_2_RESTRAINT_ONE_TARGET0_COMPOSITE
```

Transaction:

```text
PARENT BOUND SCOPE
      |
      +-----------------------------+
      |                             |
      v                             v
canonical NODE/SIF/HANGER       canonical RESTRAINT
child scope                     child scope
      |                             |
      v                             v
existing Writer2 composite      merged W2.11 component
      |                             |
      +-------------+---------------+
                    |
                    v
         TARGET0-relative claims only
                    |
                    v
       exact-preimage global arbitration
                    |
                    v
             splice TARGET0 once
                    |
                    v
                postimage
```

Both component calls receive the identical untouched `targetDocument`. No component consumes another component's postimage.

The outer layer independently rechecks every returned claim:

```text
0 <= byteStart <= byteEnd <= TARGET0.length
TARGET0.slice(byteStart, byteEnd) == beforeField
```

Any physical overlap fails closed:

```text
CII_WRITER_2_COMPOSITE_RESTRAINT_ORIGINAL_SPAN_OVERLAP
```

## 4. Canonical child-scope custody

Sibling APPLY operations become EXCLUDE rows in each child projection while remaining visible in audit custody.

Each child scope is rebuilt as:

```text
status = BOUND
mode = EXPLICIT_APPLY_EXCLUDE
authority = USER_EXPLICIT_OPERATION_SCOPE
sourceSha256 = parent source SHA
targetSha256 = parent TARGET0 SHA
candidateOperationIds = exact union(applied, excluded)
```

Duplicate IDs and APPLY/EXCLUDE intersections fail closed.

RESTRAINT child identity:

```text
WRITER_2_RESTRAINT_BLOCK_DELETE
```

## 5. Admitted W2.11 claim classes

Only these child claims are accepted:

```text
CONTROL_RESTRAINT_BLOCK_COUNT
ELEMENT_RESTRAINT_POINTER
RESTRAINT_SECTION_PAYLOAD
```

Unexpected RESTRAINT child claim kinds are rejected before global mutation.

The existing composite retains its current authority families:

```text
WRITER_2_NODENAME
WRITER_2_SIF_DELETE
WRITER_2_HANGER_DELETE_ALL
WRITER_2_HANGER_PARTIAL_DELETE
```

## 6. Independent validator

New file:

```text
tabs/cii-workspace/cii-workspace-writer2-composite-restraint-validation.js
```

The validator has **zero imports from the new W2.12 Writer module**. Even authority identity strings are locally duplicated deliberately so validation does not depend on Writer code.

It independently rebuilds:

```text
TARGET0 SHA custody
parent scope custody
canonical child scopes
NODE relocation plan + expected claims
SIF DELETE plan + expected claims
HANGER DELETE-ALL or partial plan + expected claims
RESTRAINT compaction plan
RESTRAINT CONTROL row2/field4 claim
RESTRAINT ELEMENT pointer claims
RESTRAINT complete section-payload claim
global disjoint expected claim set
complete expected final byte string
postimage SHA
physical re-intake representation
```

Primary oracle:

```text
actual after.physicalFile.originalByteString
  ===
independently reconstructed expected complete postimage
```

Only after this equality succeeds are Writer claims and component testimony checked.

Secondary testimony gates include:

```text
top-level mutation ledger
parent-scope custody
W2.11 relocation-plan testimony
W2.11 child mutation ledger
existing composite mutation testimony
TARGET0 hash testimony
postimage hash testimony
postimage representation testimony
```

## 7. Qualification source authored

### Positive

```text
R01 RESTRAINT-only composite
R02 NODENAME + RESTRAINT
R03 SIF DELETE + RESTRAINT
R04 HANGER DELETE-ALL + RESTRAINT
R05 qualified H=3 partial HANGER delete + RESTRAINT
R06 NODE + SIF + HANGER + RESTRAINT
R07 multiple RESTRAINT deletes with downstream pointer relocation
R08 pointer 0 remains unchanged
R09 CONTROL negative assurance: row1/NONAM unchanged; row2/RESTRAINTS changes
```

R05 uses a real qualified SYNCHRONIZER-shaped H=3 physical fixture based on the already-merged partial-HANGER qualification structure; it does not invent a new HANGER layout.

### Falsifiers

```text
R10 RESTRAINT CREATE blocked
R11 SIF CREATE blocked
R12 HANGER CREATE blocked
R13 stale TARGET0 SHA blocked
R14 duplicate parent operation ID blocked
R15 parent APPLY scope drift blocked
R16 canonical child candidate-set drift blocked by W2.11 component gate
R17 injected cross-family overlap blocked
R18 forged RESTRAINT mutation testimony blocked
R19 forged existing-composite mutation testimony blocked
R20 unrelated final-byte drift blocked before Writer testimony
R21 forged postimage hash testimony blocked
R22 unsupported process/topology APPLY blocked
```

## 8. CONTROL negative assurance

The W2.10 inherited defect remains explicitly guarded:

```text
CONTROL row1 field4 = NONAM       distinct authority
CONTROL row2 field4 = RESTRAINTS  W2.11/W2.12 authority
```

R02 proves NODENAME + RESTRAINT claims are disjoint in the same original CONTROL region.

R09 proves a restraint-only transaction keeps the complete CONTROL row1 byte-identical while changing row2.

## 9. Validation truth

```text
main/base grounding                         PASS_SOURCE_INSPECTION
W2.11 predecessor merged                    PASS
one-TARGET0 architecture source audit       PASS
validator zero-import-from-W2.12-Writer     PASS_SOURCE_INSPECTION
R01-R22 source                              AUTHORED
focused native execution                    NOT_RUN_ENVIRONMENT
PR workflow runs                            NONE OBSERVED
repository npm test                         NOT_RUN_ENVIRONMENT
browser/product                             NOT_APPLICABLE_W2_12
```

Runtime limitation:

```text
github.com
api.github.com
raw.githubusercontent.com
```

are not DNS-resolvable from the local execution container, and no PR workflow run exists for this branch. Do **not** relabel authored tests as PASS.

## 10. Changed-file ledger

Exactly 9 paths:

```text
coordination 3
  agents/PR1045_workreport.md
  agents/status/PR1045.yaml
  agents/claims/PR1045.yaml

production 2
  tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js
  tabs/cii-workspace/cii-workspace-writer2-composite-restraint-validation.js

tests 4
  tests/cii-workspace-writer2-composite-restraint-fixture.js
  tests/cii-workspace-writer2-composite-restraint.test.js
  tests/cii-workspace-writer2-composite-restraint-partial-hanger.test.js
  tests/cii-workspace-writer2-composite-restraint-falsifiers.test.js
```

Unexpected paths: 0.

## 11. Protected-path / negative assurance

Unchanged in W2.12:

```text
tabs/cii-workspace/cii-workspace-core.js
tabs/cii-workspace/cii-workspace-writer2-composite-routing.js
tabs/cii-workspace/cii-workspace-writer2-product-validation.js
Writer1B free-slot implementation
UI/browser route
workflow/package/parser/converter
Writer3 topology
```

Not authorized:

```text
RESTRAINT CREATE
SIF CREATE
HANGER CREATE
process fixed-field reassignment to Writer2
topology mutation
```

## 12. Current disposition

Source implementation is complete enough for focused execution, but the focused runtime gate is unavailable in this environment.

Therefore:

```text
ready_for_review = false
PR remains DRAFT
merge_authorized = false
```

Do not merge on source inspection alone unless the owner explicitly accepts the residual validation limitation.

## 13. Next gate

When exact execution becomes available:

```text
node tests/cii-workspace-writer2-composite-restraint.test.js
node tests/cii-workspace-writer2-composite-restraint-partial-hanger.test.js
node tests/cii-workspace-writer2-composite-restraint-falsifiers.test.js
```

Then execute the inherited Writer2 composite regression slice and repository `npm test` per repository qualification policy.

## 14. Next phase after separate merge authorization

W2.13 remains separate:

```text
product/core routing
readiness classification
real-CII qualification
product validator dispatch
```

W2.13 must not start merely because W2.12 source exists.

## Appendix A — expert takeover gate

1. Why must both child transactions consume exactly the same TARGET0?
2. How does canonical child projection preserve sibling APPLY operations in audit custody?
3. Which CONTROL field owns RESTRAINT count, and which adjacent authority must remain independent?
4. Why can one complete RESTRANT payload replacement coexist with ELEMENT pointer rewrites?
5. How is a cross-family overlap rejected before mutation?
6. Why does the validator duplicate W2.12 authority strings rather than import the Writer?
7. How does it reconstruct H>1 partial HANGER claims without trusting the composite Writer?
8. Why does a deleted earlier RESTRAINT block force relocation of later retained pointers?
9. Why does pointer 0 generate no relocation claim?
10. Which three W2.11 child claim kinds are admissible in W2.12?
11. Why does RESTRAINT CREATE remain blocked after DELETE becomes composable?
12. What exact evidence is still NOT_RUN?
13. What must W2.13 add that W2.12 deliberately does not?
