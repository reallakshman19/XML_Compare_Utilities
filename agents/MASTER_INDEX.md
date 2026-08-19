# Agent Work Index

Live GitHub state is authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR991 | CII Target Writer 1A | `agent/cii-writer-1a` | IMPLEMENTED INITIAL EXECUTABLE SLICE / FOCUSED WRITER PASS / REAL BENCHMARK NOT_RUN / DRAFT | ENGINEERING_CRITICAL | cardinality-preserving WT/P1/T1/T2 + existing RIGID mutation; Stage06 readiness; reparse/negative assurance | STACKED on PR990 | run complete TARGET1/TARGET2 writer benchmark; then qualify existing-restraint single-record mutation |
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

Writer 1A applies SOURCE engineering values to an approved TARGET only when the transfer plan is fully compatible with the Writer 1A whitelist.

Current executable mutation families:

```text
ELEMENT WT
ELEMENT P1
ELEMENT T1
ELEMENT T2
existing pointer-bound RIGID weight
```

Current immutable boundary:

```text
node numbers
FROM/TO connectivity
DX/DY/DZ geometry
OD
element count/order
section cardinality
auxiliary pointer ownership
```

The writer patches exact fixed-field spans, checks the reviewed TARGET hash before applying, reparses the generated CII, and rejects output unless the expected-vs-actual semantic audit reports zero unexpected changes.

Any approved non-KEEP operation outside the current Writer 1A whitelist keeps Stage06 `BLOCKED_WRITER_1A`; unsupported operations are never silently skipped.

Existing restraint mutation is the next Writer 1A qualification increment. Current delta evidence is aggregate by node; mutation must not proceed until source-record to target-slot custody is explicit. The first safe target is the single-record/single-record node case, followed by qualified multi-slot mapping. Free-slot new-restraint creation remains Writer 1B.

## PR991 validation truth

Observed PASS:

- protected writer source inspection for ELEMENT row2/row4 field layout;
- exact minimal-materialization execution of `tests/cii-workspace-target-writer-1a.test.js` after correcting its initial weak geometry substring oracle;
- fixed-field mutation PASS covers WT, P1, T1, T2, existing RIGID weight, exact file-length preservation, immutable ELEMENT header row, unsupported SIF fail-closed behavior, stale `before` value rejection, and protected-writer numeric formatting cases.

Committed but NOT_RUN in a complete checkout:

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

See `agents/PR991_workreport.md`, `agents/status/PR991.yaml`, and `agents/claims/PR991.yaml`.
