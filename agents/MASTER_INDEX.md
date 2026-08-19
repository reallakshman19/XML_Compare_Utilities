# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR989 | Explicit CII base-anchor + approval flow | `agent/cii-anchor-approval-flow` | IMPLEMENTATION COMPLETE / SYNTHETIC PAIRING PASS / REAL BENCHMARK NOT_RUN / DRAFT | ENGINEERING_CRITICAL | topology-only paired anchor suggestions; bulk HIGH/MEDIUM approval; Delta Approval projection; approval-gated Transfer Preview UI | SAFE follow-on to merged #982-#988 | execute focused/benchmark/lifecycle tests; keep target mutation blocked |
| PR988 | CII Transfer Preview qualification | `agent/cii-transfer-preview-qualification` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | delta-driven read-only transfer policy + Tab3 | HISTORICAL / merged into main | none |
| PR987 | CII auxiliary custody + benchmark qualification | `agent/cii-aux-custody-benchmark` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | RESTRANT/SIF/RIGID/hanger custody | HISTORICAL / merged into main | none |
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | Compare Review + downstream deltas | HISTORICAL / merged into main | none |
| PR985 | CII anchor-seeded propagation | `agent/cii-anchor-propagation` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | one-anchor multi-hop propagation | HISTORICAL / merged into main | none |
| PR984 | CII M1 Spatial / M2 Network | `agent/cii-m1-m2-evidence` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | independent identity evidence | HISTORICAL / merged into main | none |
| PR983 | CII capability states + benchmark oracle | `agent/cii-oracle-capability-states` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | intake capability truth + oracle | HISTORICAL / merged into main | none |
| PR982 | CII fixed-field parser | `agent/cii-fixed-field-parser` | MERGED 2026-08-19 | ENGINEERING_CRITICAL | fixed-field ELEMENT parsing | HISTORICAL / merged into main | none |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | anchored correspondence foundation | HISTORICAL | none |

## PR989 — current authority

The old UI presented independent SOURCE and TARGET `Suggested landmarks`. They were salience evidence only and were not paired base-anchor recommendations.

PR989 adds a distinct paired contract:

```text
Base Anchor suggestions
SOURCE ↔ TARGET | Basis | Confidence | Review | Accept
```

Pairing is topology-only from structural candidate cues and explicitly excludes:

```text
node-number offset
OD
wall thickness
```

Every pair remains `SUGGESTED / EVIDENCE_ONLY_ENGINEER_ACCEPT_REQUIRED`; Accept fills reviewed anchor inputs, and `Compare models` is still required before the core creates `USER_LOCKED` anchor authority.

Correspondence Review adds explicit bulk actions:

```text
Accept all HIGH
Accept all MEDIUM
```

Only bound identities in the selected confidence band are staged. REVIEW and UNRESOLVED are not bulk accepted.

Engineering Delta Grid now projects the parent correspondence Decision as:

```text
APPROVED | LOCKED | REJECTED | PENDING
```

This is presentation of existing review authority, not a new delta authority.

Transfer Preview remains review-ledger driven and now states the basis visibly. Banner remains:

```text
TRANSFER PREVIEW · BLOCKED
Preview only. Target mutation is not implemented. Geometry, node numbering, topology, OD and wall remain protected.
```

No target writer/mutator is introduced.

## PR989 validation truth

Observed:

- source-level production/review/transfer authority trace: PASS;
- reconstructed dimension-free pairing execution with unrelated numbering and OD `273 -> 88.9`: PASS; unique branch `20 ↔ 777`, score 100, HIGH, SUGGESTED;
- target-mutation controls remain disabled by source inspection.

Committed but not executed in a complete checkout:

```text
tests/cii-workspace-base-anchor-suggestions.test.js
tests/cii-workspace-benchmark-base-anchor.test.js
tests/cii-workspace-anchor-approval-ui.test.js
tests/cii-workspace-shell-lifecycle.test.js   (inherited)
tests/cii-workspace-transfer-preview-ui.test.js (inherited)
```

The real benchmark test requires `70 ↔ 20070` for TARGET1 and `70 ↔ 10070` for TARGET2 under the same dimension-free policy. If actual topology evidence is ambiguous, do not tune against those node numbers; keep the suggestion at REVIEW/manual-anchor authority.

See `agents/PR989_workreport.md`, `agents/status/PR989.yaml`, and `agents/claims/PR989.yaml`.
