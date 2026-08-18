# PR983 — CII benchmark preflight and capability states Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: STACKED_DRAFT_ACTIVE
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: N/A

REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: benchmark oracle/preflight + normalized engineering-data capability states
PR_OR_WIP: PR983
BRANCH: agent/cii-oracle-capability-states

PR_HEAD_OBSERVED: c33b6e3c007dedceb7e6f202957512aaad301f3e
REPORT_BASIS_HEAD: c33b6e3c007dedceb7e6f202957512aaad301f3e
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
MERGE_BASE: aacbcf9e95645d8ee964d01ebca24b80da7e7de9 (stacked PR982 head)
REPORT_SYNC: INITIAL_PR_ALLOCATION

APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-983-001
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: PLAN
LAST_COMPLETED_STAGE: BASELINE_AND_COORDINATION
CURRENT_BLOCKER: NONE
HIGHEST_RISK: FALSE_ZERO_ENGINEERING_COUNTS_OR_INVALID_BENCHMARK_EXPECTATIONS
LAST_DURABLE_CHECKPOINT: c33b6e3c007dedceb7e6f202957512aaad301f3e

EXACT_NEXT_ACTION: implement production capability states consumed by CII Workspace intake, then add independent benchmark oracle/preflight and focused regressions.
```

## 2. Handover in 60 Seconds

### What is now true

PR983 is a draft stacked PR based on PR982's latest branch head. PR982 supplies the fixed-field ELEMENT parser correction. PR983 does not alter M1/M2 matching, topology propagation, UI architecture, transfer or the protected writer.

### What is currently being worked on

- Capability states: `PARSED`, `EMPTY`, `NOT_PARSED`, `UNSUPPORTED`, `PARSE_ERROR`.
- Raw section-presence evidence kept separate from semantic parser authority.
- Corrected machine-readable SOURCE/TARGET1/TARGET2 benchmark expectations.
- Preflight that rejects nonexistent expected nodes/gangs and duplicate target custody before matcher tuning.

### What remains unfinished

All PR983 production work is still to be implemented at this checkpoint.

### What has been proven

Source inspection shows the neutral parser currently invokes ELEMENTS, BEND, RESTRANT, FORCMNT and RIGID parsers; CII Workspace separately extracts node names. Current intake summary exposes only elements/nodes/bends/rigids/node names and therefore cannot truthfully answer all planned Tab 1 engineering-data questions.

### What has NOT been proven / NOT_RUN

No PR983 regression has run yet. No workflow/check is available on the initial head.

### What must not be assumed

- raw CII section presence is not semantic parse authority;
- absent parser output does not mean engineering count zero;
- benchmark prose with invalid node IDs is not an oracle;
- node-number offset is not production identity evidence.

### Highest-risk remaining item

Publishing a zero for hanger/SIF/line/weight data when those families are not semantically parsed would create false engineering evidence in Tab 1.

### Exact next action

Implement a small named-export capability module under `tabs/cii-workspace/` and wire it into `intakeCiiWorkspaceDocument` without changing existing summary keys.

## 3. Repository Ground Truth

At GE-983-001:

- main `ceb0c0193a4be68b28a913b74bdc453ccf79d336`;
- PR981 merged;
- PR982 draft/unmerged, dependency branch `agent/cii-fixed-field-parser`, latest head at stacking `aacbcf9e95645d8ee964d01ebca24b80da7e7de9`;
- PR983 open/draft, base `agent/cii-fixed-field-parser`, initial head `c33b6e3c007dedceb7e6f202957512aaad301f3e`;
- no active conflicting CII claim found beyond the intentional PR982 dependency;
- no PR983 review/check evidence yet.

## 4. Mission / Scope / Acceptance

Mission: make model-intake evidence truthful before matching-policy work.

Approved production scope:

- `cii-workspace-capabilities.js` or equivalent small production module;
- integration into CII Workspace intake/document summary;
- non-breaking grouped engineering summary derived only from qualified parser outputs;
- raw section/marker evidence exposed separately.

Approved benchmark scope:

- `Benchmark/CIICompare/CII_COMPARE_EXPECTED.json` containing only source-grounded expectations;
- test-only preflight helper;
- focused regression validating oracle integrity against SOURCE/TARGET1/TARGET2.

Explicit non-goals:

- M1/M2 scoring;
- gang signature changes;
- seed propagation;
- three-tab UI;
- transfer mutation;
- protected writer;
- invented restraint-code semantics.

Acceptance criteria:

1. parsed families publish numeric counts and `PARSED`/`EMPTY` states;
2. unparsed requested families never publish misleading zero as semantic fact;
3. raw section presence is visible but never promoted to parsed authority;
4. partial restraint normalization is labelled with limitations;
5. line-number summary, if extracted, is explicitly summary-only and not element identity authority;
6. oracle preflight rejects nonexistent nodes, malformed gang sequences and duplicate target claims;
7. corrected benchmark set passes preflight for all three files when executed.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| capability contract | NOT_STARTED | NOT_STARTED | NOT_RUN | planned `tabs/cii-workspace/cii-workspace-capabilities.js` | implement |
| intake integration | NOT_STARTED | NOT_STARTED | NOT_RUN | `tabs/cii-workspace/cii-workspace-intake.js` | implement |
| oracle data | NOT_STARTED | N/A | NOT_RUN | `Benchmark/CIICompare/CII_COMPARE_EXPECTED.json` | create |
| oracle preflight | NOT_STARTED | test-only | NOT_RUN | `tests/helpers/cii-compare-benchmark-oracle.js` | implement |
| focused tests | NOT_STARTED | N/A | NOT_RUN | `tests/cii-workspace-capabilities.test.js`, oracle test | create |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-983-01 | ISS | HIGH | P1 | OPEN | no EMPTY vs NOT_PARSED distinction | intake source | yes |
| ISS-983-02 | ISS | HIGH | P1 | OPEN | benchmark prose contains invalid/ambiguous IDs | prior source audit | yes |
| RISK-983-01 | RISK | HIGH | P1 | OPEN | raw presence could be mistaken for parse authority | parser architecture | yes |
| RISK-983-02 | RISK | MEDIUM | P1 | OPEN | restraint derived type is incomplete for codes outside 1..6 | restraints parser source | yes |
| DEC-983-01 | DEC | MEDIUM | P1 | ACCEPTED | benchmark oracle stays test-only | Engineering PR Delivery anti-gaming boundary | yes |
| DEC-983-02 | DEC | MEDIUM | P1 | ACCEPTED | existing intake summary keys remain backward compatible | current tests/consumers | yes |

## 7. Current Technical Diagnosis

```text
Observed symptom: planned Tab 1 needs Nodes/Elements/Weight/Process/Line information, but intake has no parser-capability authority state.
Current hypothesis: classify each engineering family from parser support + parser output, while retaining raw section markers separately.
Supporting evidence: generic neutral parser parses a bounded family set; intake exposes only a subset.
Alternative hypotheses: raw section counts are enough; absent output means zero.
Already ruled out: both alternatives can create false engineering assertions.
Falsifier: if current parser has qualified semantic outputs for every requested family, capability states add no value.
Next isolating experiment: build capability model and exercise supported/empty/unparsed synthetic cases independently of UI.
```

## 8. Authority and Invariants

Authority chain:

```text
raw CII section text (presence evidence only)
-> parser semantic outputs
-> capability classification
-> CII Workspace document/summary
-> future Tab 1 rendering
```

Invariants:

- raw text cannot promote itself to semantic engineering data;
- parser errors fail closed;
- current element/node/bend/rigid/node-name summary fields remain available;
- restraint codes remain raw numeric evidence when semantics are unqualified;
- benchmark expectations never enter production matching;
- protected writer and Stage06 transfer gate remain unchanged.

## 9. Current Validation

All PR983 validations are `NOT_RUN` at GE-983-001. Baseline evidence is `SOURCE_INSPECTION` only.

## 10. Changed-File Ledger

Initial PR983 diff contains only recovery documentation. Production ledger will be reconciled after each implementation unit.

## 11. Review / CI State

PR983 is draft. No review threads, workflow runs or commit statuses observed at initial allocation.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: yes
STATUS_RECORD: to be created for PR983
CLAIM_RECORD: to be created for PR983
LAST_OVERLAP_CHECK: GE-983-001
FILE_OVERLAP: no conflicting active claim; intentional dependency on PR982 parser files
AUTHORITY_OVERLAP: dependent not conflicting
DEPENDENCY_OVERLAP: PR983 stacked on PR982
COORDINATION_STATE: SAFE_STACKED_FOLLOW_ON
```

## 13. Continuation State

```text
Start here: tabs/cii-workspace/cii-workspace-intake.js
Exact file/function/component: intake summary and new capability builder
Do not redo: PR982 parser RCA
Do not change: correspondence scoring, topology/gang matcher, transfer mutation, protected writer
Validation still required: synthetic capability cases + SOURCE/TARGET1/TARGET2 oracle preflight
Highest-risk remaining item: false zero / false parsed authority
Exact next action: implement capability module and integrate it into intake
```

## 14. Takeover / Custody Chain

- GE-983-001: stacked PR allocated after repository ground truth, predecessor state and overlap check were re-established.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_SAME_AGENT_CONTINUATION`. Future takeover by a different implementation agent requires re-grounding and repository-specific qualification.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log

- repository/PR state grounded;
- Engineering PR Delivery references loaded;
- PR982 brought into handover-ready protocol state;
- PR983 created as explicit stacked follow-on;
- no PR983 production mutation yet at this checkpoint.
