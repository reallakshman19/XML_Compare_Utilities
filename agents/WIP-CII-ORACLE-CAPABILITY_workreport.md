# WIP-CII-ORACLE-CAPABILITY — CII benchmark preflight and capability states Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_FOLLOW_ON_INITIALIZED
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: follow-on to PR982 — benchmark oracle/preflight + normalized engineering-data capability states
PR_OR_WIP: WIP-CII-ORACLE-CAPABILITY
BRANCH: agent/cii-oracle-capability-states

PR_HEAD_OBSERVED: aacbcf9e95645d8ee964d01ebca24b80da7e7de9
REPORT_BASIS_HEAD: aacbcf9e95645d8ee964d01ebca24b80da7e7de9
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
MERGE_BASE: PR982 head / stacked dependency
REPORT_SYNC: INITIALIZED_BEFORE_PRODUCTION_MUTATION
APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-CII-CAP-001
CURRENT_STAGE: BASELINE_AND_PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: FALSE_ZERO_ENGINEERING_COUNTS_OR_ORACLE_EXPECTATIONS_WITH_INVALID_NODE_IDS
EXACT_NEXT_ACTION: add capability-state production module consumed by intake; add independent benchmark oracle/preflight test helper and corrected machine-readable expectations.
```

## 2. Handover in 60 Seconds

### What is now true

This branch is stacked from the latest PR982 head, so fixed-field parsing is an explicit dependency. Current CII Workspace intake exposes element/node/bend/rigid/node-name counts only.

### What is currently being worked on

1. Normalized capability states that distinguish `PARSED`, `EMPTY`, `NOT_PARSED`, `UNSUPPORTED`, and `PARSE_ERROR`.
2. Machine-readable CIICompare benchmark expectations plus a preflight that rejects nonexistent source/target nodes and malformed gang definitions before matcher tuning.

### What remains unfinished

No production mutation has been made on this branch yet. M1/M2 scoring, graph propagation, three-tab UI, engineering transfer and target mutation remain outside scope.

### What has been proven

Source inspection confirms generic neutral parsing currently invokes `ELEMENTS`, `BEND`, `RESTRANT`, `FORCMNT`, and `RIGID`; node-name evidence is separately extracted by CII Workspace intake. Hanger/SIF/tee/line-number general normalization is not currently present in the generic parser.

### What must not be assumed

A missing parser output is not zero engineering data. Benchmark text notes are not automatically authoritative when referenced node IDs do not exist.

## 3. Repository Ground Truth

- Main: `ceb0c0193a4be68b28a913b74bdc453ccf79d336`.
- Dependency PR982: draft, mergeable; latest branch head at initialization `aacbcf9e95645d8ee964d01ebca24b80da7e7de9`.
- Predecessor PR981: merged.
- Active conflicting CII claim: none observed outside PR982 dependency.
- This branch: `agent/cii-oracle-capability-states`, created from PR982 exact head.

## 4. Mission / Scope / Acceptance

Approved scope:

- production capability-state model consumed by CII Workspace intake;
- truthful model summary counts only when parser authority exists;
- raw-section presence evidence retained separately from parsed capability;
- machine-readable benchmark oracle for corrected, source-grounded cases;
- preflight rejecting invalid expected nodes/gangs before matcher tuning;
- focused tests.

Non-goals:

- no M1/M2 scoring changes;
- no gang matching changes;
- no UI redesign yet;
- no transfer mutation;
- no protected writer edits;
- no invented CAESAR restraint-code semantics.

Acceptance:

- requested engineering families never show numeric zero merely because they are not parsed;
- `RESTRANT` present + parsed rows => `PARSED`; absent section + parser support => `EMPTY`;
- unsupported/not-yet-parsed families remain explicit `NOT_PARSED`/`UNSUPPORTED`;
- benchmark preflight fails on nonexistent node expectations and malformed gang sequences;
- benchmark preflight passes corrected SOURCE/TARGET1/TARGET2 identity fixtures.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Capability contract | NOT_STARTED | NOT_STARTED | NOT_RUN | planned `tabs/cii-workspace/cii-workspace-capabilities.js` | implement |
| Intake integration | NOT_STARTED | NOT_STARTED | NOT_RUN | `cii-workspace-intake.js` | implement |
| Benchmark oracle data | NOT_STARTED | N/A | NOT_RUN | planned `Benchmark/CIICompare/CII_COMPARE_EXPECTED.json` | create |
| Benchmark preflight helper | NOT_STARTED | test-only | NOT_RUN | planned `tests/helpers/cii-compare-benchmark-oracle.js` | implement |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-CAP-01 | ISS | HIGH | P1 | OPEN | summary cannot distinguish zero from not parsed | `cii-workspace-intake.js` source | yes |
| ISS-ORACLE-01 | ISS | HIGH | P1 | OPEN | benchmark notes include at least one invalid/ambiguous node mapping | prior source audit | yes |
| RISK-CAP-01 | RISK | HIGH | P1 | OPEN | raw section presence could be mistaken for semantic parse authority | parser architecture | yes |
| DEC-CAP-01 | DEC | MEDIUM | P1 | ACCEPTED | oracle helper remains outside production matcher | anti-gaming / coding policy | yes |

## 7. Current Technical Diagnosis

```text
Observed symptom: Tab 1 planning needs counts for restraints/hangers/SIF/weight/process/line data, but current intake summary has no authority state.
Current hypothesis: publish explicit capability status per family and only attach numeric counts where parser output is authoritative.
Supporting evidence: caesar-parser.js parses a bounded set of sections; cii-workspace-intake.js reports only a subset.
Alternative hypotheses: infer counts directly from raw section headers; treat absent parser array as zero.
Already ruled out: raw presence alone is insufficient semantic authority; absent array is ambiguous.
Falsifier: if every requested family already has a qualified parser output, capability-state work is unnecessary.
Next isolating experiment: implement and test raw-section/payload cross-classification on benchmark files.
```

## 8. Authority and Invariants

- Parsed engineering semantics come from actual parser outputs, not raw header counts.
- Raw section presence is evidence only.
- Benchmark oracle is test authority, not production identity logic.
- No hard-coded node offset may enter production matching.
- Protected writer remains unchanged.
- Transfer Stage06 remains blocked.

## 9. Current Validation

All follow-on implementation validations are currently `NOT_RUN`; only source-inspection baseline exists.

## 10. Changed-File Ledger

At initialization, this branch differs from PR982 base only by this WIP recovery file.

## 11. Review / CI State

No follow-on PR allocated yet. No checks/reviews applicable yet.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: yes
STATUS_RECORD: PR982 predecessor active on dependency branch
CLAIM_RECORD: PR982 predecessor active on dependency branch
LAST_OVERLAP_CHECK: GE-CII-CAP-001
FILE_OVERLAP: intake/tests are outside PR982 exact production files; dependency is fixed-field parser behavior
AUTHORITY_OVERLAP: dependent, not conflicting
DEPENDENCY_OVERLAP: explicit stacked dependency on PR982
COORDINATION_STATE: SAFE_STACKED_FOLLOW_ON
```

## 13. Continuation State

```text
Start here: tabs/cii-workspace/cii-workspace-intake.js
Do not redo: PR982 fixed-field parser change
Do not change: correspondence scoring, graph propagation, transfer mutation, protected writer
Validation still required: capability-state focused tests + benchmark oracle preflight across three CIICompare files
Exact next action: create production capability module and wire it into intake summary/document evidence.
```

## 14. Takeover / Custody Chain

- GE-CII-CAP-001: branch initialized from latest PR982 head after live repository grounding and coordination check.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_SAME_AGENT_CONTINUATION`. A different future agent must re-ground and qualify before engineering-critical mutation.
