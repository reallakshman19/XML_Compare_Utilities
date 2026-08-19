# Agent Work Index

Live GitHub state is authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR991 | CII Target Writer 1A | `agent/cii-writer-1a` | ELEMENT/RIGID + EXISTING-RESTRAINT WRITER IMPLEMENTED / FOCUSED PASS / REAL BENCHMARK NOT_RUN / DRAFT | ENGINEERING_CRITICAL | cardinality-preserving WT/P1/T1/T2, existing RIGID, deterministic existing-RESTRANT pointer/slot mutation; Stage06 readiness; reparse/negative assurance | STACKED on PR990 | run real TARGET1/TARGET2 restraint+wall writer benchmarks and inherited regression suite |
| PR990 | Refresh CII compare + writer roadmap | `agent/cii-writer-roadmap-doc` | DOCUMENTATION COMPLETE / DRAFT | ENGINEERING_CRITICAL | Writer 1A/1B/2/3 roadmap and mutation-class policy | BASE for PR991 | review/merge before or with successor stack |
| PR989 | Explicit CII base-anchor + approval flow | `agent/cii-anchor-approval-flow` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | topology-only paired base-anchor suggestions; bulk HIGH/MEDIUM approval; Delta Approval projection; approval-gated Transfer Preview | HISTORICAL / merged into main | none |
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | delta-driven read-only transfer policy + Tab3 | HISTORICAL / merged into main | none |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | RESTRANT/SIF/RIGID/hanger custody | HISTORICAL / merged into main | none |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | Compare Review + downstream deltas | HISTORICAL / merged into main | none |
| PR985 | CII anchor-seeded propagation | `agent/cii-anchor-propagation` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | one-anchor multi-hop propagation | HISTORICAL / merged into main | none |
| PR984 | CII M1 Spatial / M2 Network | `agent/cii-m1-m2-evidence` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | independent identity evidence | HISTORICAL / merged into main | none |
| PR983 | CII capability states + benchmark oracle | `agent/cii-oracle-capability-states` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | intake capability truth + oracle | HISTORICAL / merged into main | none |
| PR982 | CII fixed-field parser | `agent/cii-fixed-field-parser` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | fixed-field ELEMENT parsing | HISTORICAL / merged into main | none |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | anchored correspondence foundation | HISTORICAL | none |

## PR991 — current authority

Writer 1A applies SOURCE engineering values to an approved TARGET only when every approved non-KEEP operation is compatible with the qualified Writer 1A whitelist.

Executable mutation families now are:

```text
ELEMENT WT
ELEMENT P1
ELEMENT T1
ELEMENT T2
existing pointer-bound RIGID weight
existing RESTRANT numeric fields through qualified pointer/slot pairing
```

### Existing-restraint identity and custody

Each existing restraint retains target-native pointer/slot/node custody. Pairing rules are:

```text
1 record  <-> 1 record: qualified by cardinality
2..6 records: exhaustive global assignment, at most 6! = 720
```

Stable pairing evidence:

```text
exact GUID
exact tag
approved mapped connecting-node identity
direction cosines
```

Explicitly excluded from pairing identity:

```text
slot order
typeCode
stiffness
gap
friction
raw source/target numbering equality
```

A tied best assignment fails closed with `RESTRAINT_RECORD_PAIRING_AMBIGUOUS`. Source connecting-node references are translated through bound node correspondence before target write.

Aggregate restraint rows remain review evidence only. The executable transfer row is `Qualified restraint record pairing`.

Writer patches only target existing-slot numeric fields:

```text
typeCode
stiffness
gap
friction
connectingNode
direction X/Y/Z
```

Target node, pointer, slot, tag, GUID, section cardinality and auxiliary pointer ownership remain immutable.

## PR991 validation truth

Observed PASS:

- protected writer ELEMENT and RESTRANT layout source inspection;
- focused WT/P1/T1/T2/RIGID writer execution;
- deterministic restraint pairing execution including swapped slots, GUID evidence, mapped connecting nodes, ambiguous fail-closed and cardinality mismatch;
- paired raw restraint writer execution: 9 exact numeric field mutations with target pointer/slot/node/tag preservation and source connecting node `510 -> 9510` mapping.

Committed but NOT_RUN in a complete checkout:

```text
tests/cii-workspace-transfer-preview-policy.test.js
tests/cii-workspace-placeholder-gate.test.js
tests/cii-workspace-transfer-preview-ui.test.js
tests/cii-workspace-anchor-approval-ui.test.js
tests/cii-workspace-benchmark-transfer-preview.test.js
tests/cii-workspace-benchmark-end-to-end.test.js
tests/cii-workspace-benchmark-writer-1a.test.js
tests/cii-workspace-benchmark-writer-1a-restraint.test.js
full inherited CII Workspace regression/browser lifecycle
```

The real restraint benchmark freezes SOURCE node130 block 5, TARGET1 block 5 and TARGET2 block 6. It requires target-native pointer/slot custody, type `9 -> 15`, TARGET1 friction `0.3 -> 0`, TARGET2 friction unchanged `0`, reparse PASS and zero unexpected semantic deltas.

See `agents/PR991_workreport.md`, `agents/status/PR991.yaml`, and `agents/claims/PR991.yaml`.
