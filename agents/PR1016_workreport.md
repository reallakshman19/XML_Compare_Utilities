# PR1016 — Writer 2 one-original-preimage cardinality composite

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: #1016
BRANCH: agent/cii-writer2-composite-one-preimage
BASE: main@d5ecd8ac356cebba6027d7d6446e644053632565
MISSION: compose qualified Writer-2 NODENAME cardinality mutations and V11 SIF DELETE from one untouched TARGET preimage
CURRENT_STAGE: COMPOSITE_WRITER_AND_INDEPENDENT_VALIDATOR_AUTHORED
MERGE_AUTHORITY: OWNER_ONLY
```

## 1. Why this PR exists

PR1013 routed Writer-2 NODENAME through the product. PR1014/PR1015 then qualified and implemented physical V11 SIF/TEE existing-block DELETE. Both NODENAME and SIF block mutation can change file byte length.

Sequential execution is invalid:

```text
TARGET0
 -> NODENAME Writer2 changes byte length
 -> SIF Writer2 uses offsets qualified against TARGET0
```

The second writer's original byte coordinates no longer refer to the same physical positions after the first variable-length pass.

PR1016 therefore composes both families from one untouched preimage and patches once.

## 2. Qualified component authorities reused unchanged

### NODENAME

Merged PR1011/PR1012 authority:

- CREATE/DELETE only;
- exact ELEMENT/NODENAME custody;
- deterministic row allocation/compaction;
- complete NODENAME pointer relocation;
- CONTROL.NONAM after-count;
- physical variable-length writer.

### V11 SIF/TEE

Merged PR1014/PR1015 authority:

- existing complete 10-row block DELETE only;
- exact V11 10-row physical custody;
- all-owner shared-pointer veto;
- complete SIF pointer relocation;
- CONTROL SIF-count after value;
- retained blocks copied byte-for-byte.

SIF CREATE remains blocked:

`WRITER_2_SIF_CREATE_PAYLOAD_SEMANTICS_UNQUALIFIED_ITEMS_27_30`

## 3. Composite transaction model

Input must already have a bound explicit APPLY/EXCLUDE scope.

Allowed APPLY operations:

```text
NODE_NAME / Node name / to-name / CREATE
NODE_NAME / Node name / to-name / DELETE
SIF_TEE / SIF/Tee record presence / DELETE
```

A manually forced SIF CREATE preserves the established semantic blocker. Any other APPLY operation blocks with `CII_WRITER_2_COMPOSITE_UNSUPPORTED_APPLY`.

For each qualified family the composite creates a projected transfer-plan view:

- requested family APPLY operations remain APPLY;
- all other operations are EXCLUDE in that component projection;
- the untouched TARGET document is identical for every component.

Each merged Phase-4B component writer then dry-runs from the same TARGET0 and emits candidate original-coordinate replacement claims.

## 4. Physical claim classes

Potential original-coordinate claims are:

```text
WRITER_2_NODENAME
  CONTROL_NONAM
  ELEMENT_NODENAME_POINTER
  NODENAME_SECTION_PAYLOAD

WRITER_2_SIF_DELETE
  CONTROL_SIF_TEE_COUNT
  ELEMENT_SIF_TEE_POINTER
  SIF_TEE_SECTION_PAYLOAD
```

Every claim must prove:

```text
0 <= byteStart <= byteEnd <= len(TARGET0)
TARGET0[byteStart:byteEnd] == beforeField
```

All claims are sorted in TARGET0 coordinates. Any overlap blocks, including same-postimage overlap. Adjacent ELEMENT row-13 SIF and NODENAME pointer fields are allowed because their spans are disjoint.

The TARGET is patched exactly once.

## 5. Independent validator

The final validator does not use the composite mutation ledger as authorization.

It independently:

1. classifies the bound APPLY operations;
2. independently projects NODENAME and SIF scopes;
3. rebuilds the merged PR1011 NODENAME relocation plan from TARGET0;
4. rebuilds the merged PR1014 SIF DELETE relocation plan from TARGET0;
5. independently formats CONTROL integer fields;
6. independently formats relocated pointer fields using a separate six-significant-digit oracle;
7. independently reconstructs the NODENAME payload;
8. independently reconstructs the retained SIF payload directly from TARGET0 bytes;
9. arbitrates the independently derived original-coordinate claims;
10. constructs the complete expected variable-length postimage;
11. requires actual post bytes == expected post bytes.

Defense-in-depth also checks:

- both CONTROL counts;
- NODENAME and SIF row counts;
- complete NODENAME pointer snapshot;
- complete SIF pointer snapshot;
- NODENAME semantic postimage;
- connectivity unchanged;
- section order unchanged;
- composite mutation testimony matches the independent claims;
- component relocation testimony matches independently rebuilt plans;
- SIF CREATE authority remains blocked.

## 6. Regression fixture

The authored mixed fixture deliberately places NODENAME before SIF and performs:

```text
NODENAME CREATE at node 80
  row count 3 -> 4
  byte length increases before SIF section

SIF DELETE block 2
  block count 3 -> 2
  SIF pointers 1,2,3,0 -> 1,0,2,0
  byte length decreases later in file
```

This is a direct anti-sequential-drift case.

Additional falsifiers authored:

- unrelated REDUCERS payload tamper -> validator rejection;
- forged final composite mutation ledger -> rejection;
- forged SIF component relocation testimony -> rejection;
- synthetic cross-family overlapping original spans -> composite blocks;
- unsupported PROCESS APPLY -> composite blocks.

## 7. Qualification finding QF-1016-001 — recursive freeze defect

Initial composite code returned `deepFreeze(result)`.

Repository `deepFreeze()` recursively calls `Object.freeze()` on every object. Node throws on a non-empty `Uint8Array`:

```text
TypeError: Cannot freeze array buffer views with elements
```

The composite result and both component results contain byte arrays.

Fix:

```text
outer composite result    -> shallow Object.freeze
components envelope       -> shallow Object.freeze
plain claim/metadata data -> deepFreeze remains permitted
Uint8Array bytes           -> not recursively frozen
```

This was found before PR qualification and is covered by any actual execution of the mixed composite regression.

## 8. Changed-file ledger

Implementation/test:

```text
tabs/cii-workspace/cii-workspace-writer2-composite.js
tabs/cii-workspace/cii-workspace-writer2-composite-validation.js
tests/cii-workspace-writer2-composite.test.js
```

Recovery:

```text
agents/PR1016_workreport.md
agents/status/PR1016.yaml
agents/claims/PR1016.yaml
agents/MASTER_INDEX.md
```

No changes to:

- protected converter;
- fixed-field parser;
- Writer1A/1B/1C;
- merged NODENAME planners/writers/validators;
- merged SIF DELETE planner/writer/validator;
- product/core routing in this PR;
- benchmark CII;
- workflow.

## 9. Validation truth

```text
PR1015 merge / current-main grounding                 PASS
branch ancestry                                      PASS_GIT_COMPARE
new composite writer syntax                          PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
new composite validator syntax                       PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
new mixed regression syntax                          PASS_LOCAL_SOURCE_BEFORE_PUBLICATION
Uint8Array deepFreeze defect                         PASS_LOCAL_REPRODUCTION_AND_SOURCE_FIX
repository mixed composite regression                AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer2 NODENAME regressions               NOT_RUN_ENVIRONMENT
inherited Writer2 SIF DELETE regressions             NOT_RUN_ENVIRONMENT
inherited Writer1A/1B/1C regressions                 NOT_RUN_ENVIRONMENT
full npm test                                        NOT_RUN_ENVIRONMENT
browser/product flow                                 NOT_RUN_ENVIRONMENT
real CII mixed export/re-intake                      NOT_RUN_ENVIRONMENT
```

The execution container still cannot resolve `github.com` for an exact checkout. Do not upgrade authored tests to PASS without execution evidence.

## 10. Exact next action after PR1016 disposition

Route Writer 2 through this composite rather than the current NODENAME-only core path:

```text
base engineering deltas
 -> Writer2 routing adapter recognizes:
      NODENAME CREATE/DELETE
      V11 SIF existing-block DELETE
 -> explicit APPLY/EXCLUDE scope
 -> composite readiness for all APPLY operations
 -> one-preimage composite apply
 -> re-intake composite bytes
 -> independent composite validator
 -> binary-authoritative Modified_<target>.cii export
```

Do not route SIF DELETE as a second sequential pass after the currently routed NODENAME writer.

SIF CREATE remains blocked.

# Appendix A — next-agent qualification

1. Why is sequential NODENAME then SIF Writer-2 application invalid even if each standalone writer validates independently?
2. Which six physical claim classes can PR1016 compose?
3. What exact preimage equation must every component claim satisfy?
4. Why does adjacency between ELEMENT SIF and NODENAME pointer fields not constitute overlap?
5. What happens if two component claims overlap with identical postimages?
6. Why are component mutation ledgers testimony rather than authorization?
7. How does the validator independently rebuild the NODENAME payload?
8. How does it rebuild the SIF payload without interpreting retained SIF internal semantics?
9. Why must SIF CREATE remain blocked in the composite?
10. What runtime defect occurs if the composite result is recursively `deepFreeze`d?
11. Which structures may remain deeply frozen after QF-1016-001?
12. What fixture proves true variable-length offset drift rather than same-length composition?
13. Which unsupported APPLY families must fail closed?
14. What must the product/core successor route to avoid reintroducing sequential mutation?
15. Which repository/browser tests remain NOT_RUN?
