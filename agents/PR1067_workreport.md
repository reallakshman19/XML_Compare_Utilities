# PR1067 Work Report

REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 1067
BRANCH: feature/cii-find-replace-nodename-v14
CHAIN: CII-FIND-REPLACE-V14
MISSION: Implement first-priority CII v14 Node Name Find & Replace with exact TARGET0 fixed-field custody. Direct source overwrite remains disabled.
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a

## Current state

```text
ENGINEERING_STATE: IN_PROGRESS
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

Pre-mutation endpoint: `agents/chains/CII-FIND-REPLACE-V14/endpoints/EP-CII-FR-0005.md`.

## Authorized Node Name route

```text
From / To element
  -> exact 15-row ELEMENT block
  -> row13 sixth item = 1-based NODENAME pointer
  -> exact NODENAME row
  -> FROM [2,28) width 26 / TO [28,53) width 25
  -> exact trimmed semantic Find Text match
  -> ASCII replacement fits owned field
  -> right-pad to complete field width
  -> equal-width TARGET0-relative claim
  -> existing executor + independent postimage validator
  -> qualified new-file download only
```

Retained-real first falsifier: `Benchmark/CIICompare/SOURCE 3.CII`, element `20020 -> 20030`, NODENAME pointer `1`, row1 TO=`PS-12146`, rename to `NODE-20030`.

## Planned product batch

Production:
- `tabs/cii-workspace/cii-workspace-find-replace-csv.js`
- `tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js`
- `tabs/cii-workspace/cii-workspace-find-replace-validator.js`
- `tabs/cii-workspace/cii-workspace-find-replace.js`
- isolated NODENAME scope helper if required to keep fixed-format logic bounded.

Tests:
- scope resolver
- validator
- session/manual intake
- UI registration
- retained-real SOURCE3

Protected unchanged: executor/output, `cii-workspace-nodename.js`, Writer1/Writer2, converters, FORCE authority, topology, benchmarks/oracles/tolerances/workflows, direct overwrite.

## Validation truth

At start of product batch:
- source/authority reconciliation: PASS / source inspection
- PR/main grounding: PASS / GitHub
- Node Name product implementation: NOT_RUN
- Node Name focused tests: NOT_RUN
- native-v14 retained runtime: NOT_RUN
- full repository suite: NOT_RUN

## Highest risk

A wrong pointer/field owner map could produce a byte-perfect but semantically wrong rename. Ownership must be proven globally enough to reject distinct-node aliasing of the selected physical field.

## Current hypothesis / falsifier

Hypothesis: specialized NODENAME scope resolution plus full fixed-field claims is sufficient; executor/session/output need no semantic changes.
Falsifier: pointer/cardinality mismatch, unreadable global pointer graph, distinct-node field alias, non-ASCII/overflow acceptance, or any changed byte outside the authorized field.

## EXACT_NEXT_ACTION

Implement the coherent Node Name product/test batch in one commit, then validate source contracts and retained-real ownership; preserve NOT_RUN where exact runtime execution is unavailable.
