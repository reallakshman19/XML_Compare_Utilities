# PR984 — CII M1 Spatial / M2 Network evidence Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTATION_COMPLETE_VALIDATION_PARTIAL_STACKED_DRAFT
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_M1_M2_EVIDENCE_PHASE
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR_OR_WIP: PR984
BRANCH: agent/cii-m1-m2-evidence
PR_HEAD_OBSERVED: 2cf30cb8df4e6540d73bd4649f4f42fcece59738
REPORT_BASIS_HEAD: 2cf30cb8df4e6540d73bd4649f4f42fcece59738
MAIN_HEAD_LAST_CHECKED: ceb0c0193a4be68b28a913b74bdc453ccf79d336
MERGE_BASE: 070ef9038a9fc2af87a1e7a49b0e8f600d98d3ba
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984
REPORT_SYNC: RECONCILED_TO_11_FILE_STACKED_DIFF
APPENDIX_A_STATUS: NOT_REQUIRED_SAME_AGENT_CONTINUATION
GROUNDING_EPOCH: GE-984-002
CURRENT_STAGE: HANDOVER_READY
LAST_COMPLETED_STAGE: IMPLEMENT_VALIDATE_RECONCILE
CURRENT_BLOCKER: COMPLETE_AUTHENTICATED_CHECKOUT_UNAVAILABLE_FOR_LITERAL_REPO_TEST_COMMANDS
HIGHEST_RISK: REAL_BENCHMARK_PROPAGATION_NOT_YET_IMPLEMENTED; THIS PR IS EVIDENCE ONLY
LAST_DURABLE_CHECKPOINT: 2cf30cb8df4e6540d73bd4649f4f42fcece59738
EXACT_NEXT_ACTION: open a separate stacked Phase 5 PR for anchor-seeded propagation; do not merge PR984 without owner authority.
```

## 2. Handover in 60 Seconds

### What is now true

PR984 separates CII identity evidence into M1 Spatial and M2 Network/Gang. OD and wall are independent revision evidence and are no longer hard identity blockers. M2 topology tokens no longer include OD/WT. Candidate ranking preserves method-specific winner gaps and explicitly reports M1/M2 target disagreement.

### What has been implemented

- `cii-workspace-match-methods.js`:
  - M1 Euclidean midpoint distance, default 100 mm;
  - M2 topology/neighbourhood/path evidence, default threshold 55;
  - OD/WT relative evidence, default ±10%;
  - 50/30/30 normalized confidence scoring;
  - explicit HIGH/MEDIUM/REVIEW/UNRESOLVED fusion.
- `cii-workspace-evidence.js`:
  - publishes both methods and dimension evidence;
  - `score` is engineering confidence;
  - `rankingScore` separately includes method quality for candidate/path ordering;
  - identity-unsupported candidates always score 0.
- `cii-workspace-topology-adapter.js`:
  - network tokens are structural only: `D<degree>->D<degree>|<componentKind>`.
- `cii-workspace-candidates.js`:
  - independent M1 and M2 winners;
  - method disagreement => `AMBIGUOUS` / `METHOD_A_B_DISAGREE`;
  - method-specific winner gaps prevent 50/30/30 confidence ties from erasing topology discrimination;
  - MEDIUM remains existing workflow `REVIEW` until engineer approval, preserving custody semantics.
- `cii-workspace-alignment.js`:
  - confidence projection uses HIGH / REVIEW / UNRESOLVED based on method fusion rather than old score thresholds.

### What has been proven

Reconstructed focused Node execution using the current method semantics passed these mechanisms together:

1. 90/90/90 mm coordinate change => Euclidean distance ~155.9 mm => M1 FAIL for 100 mm tolerance.
2. 205 concept: 200 mm move => M1 FAIL, M2 PASS, OD/WT PASS => MEDIUM, not hard fail.
3. 250 concept: OD 60.3→114.3 and WT 3.9→4.7752 both fail ±10%, but identity remains MEDIUM when M1/M2 support it; confidence score ≈45.5.
4. Same OD/WT with neither identity method supported => UNRESOLVED, hard fail, confidence/ranking score 0.
5. Legacy neighbourhood tokens with different OD values normalize to the same structural M2 identity form.
6. Existing topology-only alignment semantics remain HIGH when M1 is unavailable rather than falsely treated as geometry failure.
7. Existing gang ambiguity logic remains discriminating: correct M2 90.0 versus wrong-region M2 84.8; ranking scores 95.0 versus 92.4 while both confidence scores remain 100.
8. Branch and rigid-kind contradictions remain structural hard conflicts with score 0.
9. OD/WT differences no longer produce `OD_INCOMPATIBLE` / `WALL_THICKNESS_INCOMPATIBLE` hard blockers.

### What has NOT been proven / NOT_RUN

- literal `node tests/cii-workspace-m1-m2-evidence.test.js` from a complete authenticated repository checkout;
- literal full CII Workspace suite at PR984 current head;
- SOURCE→TARGET1 and SOURCE→TARGET2 end-to-end correspondence using anchor-seeded propagation, because propagation is intentionally Phase 5;
- browser UI, because UI is not in PR984 scope.

Direct container checkout is environment-blocked by GitHub DNS resolution. This is not counted as product PASS or FAIL.

## 3. Repository Ground Truth

At GE-984-002:

- main: `ceb0c0193a4be68b28a913b74bdc453ccf79d336`;
- PR982: draft/unmerged fixed-field parser dependency;
- PR983: draft/unmerged capability/oracle dependency;
- PR984: open, draft, mergeable at observed head `2cf30cb8df4e6540d73bd4649f4f42fcece59738` before this report-only checkpoint;
- stacked base: PR983 head `070ef9038a9fc2af87a1e7a49b0e8f600d98d3ba`;
- stacked diff: 11 intended files, no unexplained files.

## 4. Mission / Scope / Acceptance

Mission: implement independent M1 Spatial and M2 Network/Gang evidence while preserving existing candidate custody/review workflow.

Acceptance achieved at source/focused-slice level:

- M1 uses Euclidean distance;
- M2 does not embed OD/WT;
- OD/WT are ±10% supporting evidence;
- both identity methods fail => no correspondence support regardless of dimensions;
- M1/M2 disagreement => review;
- M1 fail + M2 pass => MEDIUM confidence;
- both pass + dimension change => MEDIUM;
- target custody/winner-gap workflow remains intact;
- no propagation/UI/transfer changes.

Explicit non-goals remain:

- anchor-seeded BFS/graph propagation;
- Tab 2 UI;
- target mutation;
- parser/converter changes;
- node-offset identity logic.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Remaining |
|---|---|---|---|---|
| M1 Spatial | COMPLETE | consumed by evidence/candidates | focused reconstructed PASS | full checkout run |
| M2 Network | COMPLETE | consumed by evidence/candidates | focused reconstructed PASS | full checkout run |
| OD/WT independent evidence | COMPLETE | evidence + confidence | focused reconstructed PASS | full checkout run |
| M1/M2 disagreement | COMPLETE | candidate evidence | focused reconstructed PASS | full checkout run |
| winner-gap preservation | COMPLETE | candidates | existing gang test reconstructed PASS | full checkout run |
| alignment confidence projection | COMPLETE | alignment | existing alignment test reconstructed PASS | full checkout run |
| propagation | NOT_IMPLEMENTED | N/A | NOT_RUN | Phase 5 |

## 6. Active Engineering Item Register

| ID | Type | Severity | Status | Summary |
|---|---|---|---|---|
| ISS-984-01 | ISS | HIGH | CLOSED | OD/WT hard identity blockers removed |
| ISS-984-02 | ISS | HIGH | CLOSED | OD removed from network topology token |
| ISS-984-03 | ISS | HIGH | CLOSED | M1/M2 now independently visible |
| ISS-984-04 | ISS | HIGH | CLOSED | binary confidence score initially erased gang winner-gap; fixed with method-specific gaps/rankingScore |
| DEC-984-01 | DEC | HIGH | ACCEPTED | identity gate is M1 or M2; dimensions support confidence only |
| DEC-984-02 | DEC | HIGH | ACCEPTED | MEDIUM projects to workflow REVIEW until engineer approval |
| DEC-984-03 | DEC | HIGH | ACCEPTED | confidence score and ranking score are separate authorities |
| RISK-984-01 | RISK | MEDIUM | MITIGATED | winner-gap/custody semantics preserved in focused regression |
| RISK-984-02 | RISK | HIGH | OPEN_NEXT_PHASE | one anchor still does not propagate across complete network |

## 7. Current Technical Diagnosis

```text
Observed defect: prior matcher blended topology/geometry/dimensions; OD/WT could hard-veto identity and OD was embedded in M2 tokens.
Root cause: identity and revision-property evidence had not been separated into independent authorities.
Implemented correction: M1 + M2 establish identity; OD/WT only affect confidence. Candidate ranking uses separate method quality so binary 50/30/30 scoring does not erase topology discrimination.
Falsifier: a candidate with M1 FAIL and M2 FAIL but dimensions PASS receives nonzero identity/ranking score or is classified supported.
Current falsifier result: focused reconstructed test produces hardFail=true, score=0, rankingScore=0.
Next isolating experiment: Phase 5 anchor-seeded network propagation on 205 and 250 benchmark gangs.
```

## 8. Authority and Invariants

```text
SOURCE/TARGET parsed geometry/topology
  -> M1 Spatial + M2 Network identity evidence
  -> OD/WT supporting dimension evidence
  -> confidence score / identityConfidence
  -> separate rankingScore
  -> candidate winner/winner-gap/custody
  -> workflow REVIEW/LOCK authority
```

Invariants:

- no dimensions-only identity;
- no node-offset identity;
- method disagreement cannot be averaged away;
- M1 unavailable is neutral, not M1 fail;
- branch/rigid contradictions remain fail-closed;
- transfer Stage06 remains blocked.

## 9. Validation Ledger

### VAL-984-01 — method/fusion focused slice

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED + HAND-CALC GEOMETRY ASSERTIONS
Tested semantic state: current PR984 source through ranking-score split
Evidence: reconstructed Node assertions for diagonal distance, 205, 250, dimensions-only, M2 token normalization
Expected/actual: all assertions satisfied
Limitation: not literal full-checkout import graph
Origin: RESOLVED_BY_PR
```

### VAL-984-02 — existing gang winner-gap semantics

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED REGRESSION
Expected: correct repeated region remains distinguishable from wrong region
Actual: M2 90.0 vs 84.8; ranking 95.0 vs 92.4; confidence both 100
Limitation: reconstructed focused execution
Origin: RESOLVED_BY_PR
```

### VAL-984-03 — full repository PR984 commands

```text
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: NONE
Limitation: authenticated checkout unavailable; direct container GitHub DNS resolution fails
```

## 10. Changed-File Ledger

Stacked diff against PR983 base: 11 files, all intended.

| File | Purpose | Sensitive | Validation |
|---|---|---:|---|
| `agents/MASTER_INDEX.md` | coordination | no | source inspection |
| `agents/PR984_workreport.md` | recovery | no | reconciled |
| `agents/claims/PR984.yaml` | claim | no | reconciled |
| `agents/status/PR984.yaml` | status | no | reconcile after report |
| `tabs/cii-workspace/cii-workspace-alignment.js` | confidence projection | yes | focused regression |
| `tabs/cii-workspace/cii-workspace-candidates.js` | independent winners/gaps | yes | focused regression |
| `tabs/cii-workspace/cii-workspace-evidence.js` | confidence/ranking contract | yes | focused regression |
| `tabs/cii-workspace/cii-workspace-match-methods.js` | M1/M2/dimensions/fusion | yes | focused regression |
| `tabs/cii-workspace/cii-workspace-topology-adapter.js` | OD-free network tokens | yes | focused regression |
| `tests/cii-workspace-hard-conflict.test.js` | new identity-blocker semantics | no | focused reconstructed PASS |
| `tests/cii-workspace-m1-m2-evidence.test.js` | new method contract | no | focused reconstructed PASS |

Unexplained files: 0.

## 11. Review / CI State

At last observed implementation head:

- draft: yes;
- mergeable: yes;
- review threads: to refresh at final handover;
- workflow/status checks: to refresh at final handover;
- merge authority: owner only.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: yes
STATUS_RECORD: agents/status/PR984.yaml
CLAIM_RECORD: agents/claims/PR984.yaml
FILE_OVERLAP: intentional only with stacked predecessor read authorities; no undeclared production overlap
AUTHORITY_OVERLAP: PR984 owns M1/M2 evidence only
DEPENDENCY_OVERLAP: explicit PR982 -> PR983 -> PR984 stack
COORDINATION_STATE: SAFE_STACKED_WORKSTREAM
```

## 13. Continuation State

```text
Start here: Phase 5 new stacked branch from PR984 reconciled head
Exact component: one-anchor correspondence expansion / topology propagation
Do not redo: fixed-field parser, capabilities/oracle, M1/M2 evidence separation
Do not change: protected writer, transfer Stage06, node-offset policy
Validation required: SOURCE→TARGET1 propagation cases, then TARGET2 blind after policy freeze
Highest-risk remaining item: stopping propagation at ambiguity while still reaching distant benchmark nodes
Exact next action: implement bounded anchor-seeded BFS/assignment using existing candidate evidence, winner-gap, and target custody
```

## 14. Takeover / Custody Chain

- GE-984-001: stacked PR initialized from PR983 exact head.
- GE-984-002: implementation complete; diff and focused validation reconciled. A future different implementation agent must re-ground and complete Appendix A before mutation.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_SAME_AGENT_CONTINUATION` for the current agent. Future takeover requires repository-specific qualification.
