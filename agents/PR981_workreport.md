# PR981 — CII Workspace V1 Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WITH_EXTERNAL_INTEGRATION_BLOCKER
TAKEOVER_AUTHORITY: WRITE_ALLOWED (NEW FILES ONLY)
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #980
PR_OR_WIP: PR981
BRANCH: agent/issue-980-cii-workspace-v1
PR_HEAD_OBSERVED: c86fc9ce50aa65c539989c7a8ad04d79d7e2371f
REPORT_BASIS_HEAD: c86fc9ce50aa65c539989c7a8ad04d79d7e2371f
MAIN_HEAD_LAST_CHECKED: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
MERGE_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
REPORT_SYNC: CURRENT_AT_PRODUCT_HEAD
APPENDIX_A_STATUS: CURRENT / QUALIFIED
GROUNDING_EPOCH: GE-004
CURRENT_STAGE: CORE_HARDENED / VALIDATION_PARTIAL / INTEGRATION_BLOCKED
LAST_COMPLETED_STAGE: NODENAME POINTER GROUNDING + GEOMETRY HARDENING + ALIGNMENT SEMANTICS + REVIEWED NODE CUSTODY
CURRENT_BLOCKER: CII Workspace cannot appear in live Utilities without editing tabs/psnm-utility-tab.js, which remains owner-forbidden.
HIGHEST_RISK: Real neutral rigid-component association and repository parser/path-aligner integration have not yet executed at the current product head.
LAST_DURABLE_PRODUCT_CHECKPOINT: c86fc9ce50aa65c539989c7a8ad04d79d7e2371f
RECOVERY_CHECKPOINT: 6313fea19a4ef5cb444e05dd99cbe01849ba6040
EXACT_NEXT_ACTION: run repo-dependent intake/topology/determinism tests in a full checkout or CI; continue only new-file CII Workspace hardening; do not invent alternate registration.
```

## 2. Handover in 60 Seconds

PR981 remains a standalone, preview-only CII Workspace implementation built without modifying any pre-existing repository module. It consumes the existing CAESAR neutral parser and exported InputXML path primitives read-only. Stage 06 remains visible and `NOT_IMPLEMENTED`; there is still no target-CII mutation/writer or modified-target export.

The latest coding pass fixed four concrete issues in the new CII Workspace code:

1. `NODENAME` intake no longer assumes `node-id + name` rows. The repository writer defines fixed-width FROM/TO name pairs and per-element NODENAME pointers, so a new CII adapter now resolves those pairs conservatively and removes conflicting node names from authority.
2. Geometry registration now rejects non-finite anchors, near-collinear 3-point sets, inconsistent two-anchor spans, and extra-anchor residual failures before registered XYZ receives weight.
3. Alignment correspondence now materializes `INSERT_TARGET`/`DELETE_SOURCE` as first-class element rows and derives internal 1↔1 node rows only across consecutive MATCH boundaries. A scoring regression was also fixed: the previously computed 14-point element-length term is now actually included in the scalar evidence sum.
4. NodeName transfer preview now accepts engineer-reviewed automated NODE correspondence, not only locked anchors, while still excluding INSERTED/CONFLICT/UNRESOLVED nodes. Match authority records `REVIEWED` separately from the candidate class.

The live Utilities tile remains intentionally blocked because registration requires an edit to the existing `tabs/psnm-utility-tab.js` launcher authority.

## 3. Repository Ground Truth

- repository: `reallaksh19/XML_Compare_Utilities`
- main/merge base: `b0f13c99e036c590a281e2d10bd2b7f0d64e58eb`
- PR: `#981`, open, draft, mergeable
- product head: `c86fc9ce50aa65c539989c7a8ad04d79d7e2371f`
- recovery checkpoint: `6313fea19a4ef5cb444e05dd99cbe01849ba6040`
- branch: `agent/issue-980-cii-workspace-v1`
- main drift at GE-004: none
- qualification: Issue #980 records `QUALIFIED`
- final diff containment at `6313fea1...`: 30 added paths, 0 deletions, 0 pre-existing-file modifications
- CI/workflow runs at product head: none

## 4. Authority / Scope Invariants

- Existing parser/topology/Revision Compare/Utilities/writer files remain byte-for-byte outside this PR.
- No private `_buildAdjacency` or equivalent XML graph implementation was copied.
- Existing exported `buildElementPaths`, `scorePathMatch`, and `alignElementSequence` remain read-only reuse authorities.
- CII adapters may translate neutral-file evidence but may not silently promote parser ambiguity into engineering authority.
- `LOCKED` is user/engineer authority, not a score.
- NODE, ELEMENT/PATH, and COMPONENT custody remain separate.
- Node correspondence alone never authorizes P1/T1.
- INSERTED target subdivision nodes never receive a source NodeName.
- P1/T1 remain reviewed SOURCE-1 → TARGET-1/N preview-only operations with size blockers.
- Rigid weight remains rigid↔rigid only with unique component evidence and length checks.
- Stage 06 has no writer implementation, no READY result, and no modified CII download.
- Stage 07 exports correspondence/audit artifacts only.

## 5. Current Implementation State

| Work item | State | Fresh evidence | Remaining |
|---|---|---|---|
| Neutral CII intake + SHA | implemented | NODENAME pure fixture PASS | full parser-backed intake test NOT_RUN |
| NODENAME semantic adapter | hardened | fixed-width pair, pointer, conflict, invalid-pointer fixtures PASS | validate additional real neutral files |
| Topology adapter | implemented | unchanged | broader rigid-record fixture |
| Anchored topology/path | hardened | alignment semantics helper PASS | production path-aligner integration NOT_RUN |
| Geometry authority | hardened | expanded geometry suite PASS | repo-level rotation/topology fixture NOT_RUN |
| Correspondence review | implemented | reviewed NodeName custody PASS | live browser workflow blocked by registry |
| Transfer preview | hardened | transfer preview + reviewed-node tests PASS | real-file end-to-end fixture |
| Stage 06 placeholder | implemented | previous fail-closed test remains applicable | writer intentionally absent |
| Stage 07 audit export | implemented | unchanged | deterministic repo integration NOT_RUN |
| Utilities registration | intentionally absent | owner scope blocker | explicit owner authorization required |

## 6. Active Engineering Register

| ID | Type | Severity | Status | Summary |
|---|---|---|---|---|
| DEC-001 | decision | high | active | Existing repository modules stay read-only; no registry/nav/parser/topology/writer edits. |
| FIX-001 | correctness | high | complete | Ground NODENAME in neutral fixed-width FROM/TO pairs plus element pointers. |
| FIX-002 | correctness | high | complete | Geometry qualification fails closed for invalid/near-collinear/inconsistent anchor evidence. |
| FIX-003 | correctness | high | complete | Preserve INSERT/DELETE correspondence and safe adjacent-match node boundaries. |
| FIX-004 | correctness | medium | complete | Include computed element-length evidence in candidate score. |
| FIX-005 | custody | high | complete | Engineer-reviewed automated NODE rows can preview NodeName; unsafe node classes cannot. |
| RISK-001 | risk | medium | active | Neutral RIGID parser records do not expose full element pointer custody; adapter remains conservative. |
| RISK-002 | validation | high | active | Parser/path-aligner repo-dependent tests have not executed at current product head. |
| QST-001 | blocker | high | active | Live Utilities location requires one existing registry edit currently forbidden. |

## 7. Fresh Validation Ledger

```text
ID: VAL-101
Status: PASS
Observation: GIT_COMPARE
Oracle: GITHUB_COMMIT_GRAPH
Basis: compare b0f13c99... -> 6313fea1...
Expected: no pre-existing file edits under owner lock
Actual: 30 changed paths, every path status=added; 0 deletions; 0 pre-existing-file modifications
Limitations: none material to containment
```

```text
ID: VAL-102
Status: PASS
Observation: TOOL_EXECUTION
Oracle: NODE_JS
Fresh focused tests executed against mirrored current CII Workspace logic:
- tests/cii-workspace-nodename.test.js
- tests/cii-workspace-geometry-authority.test.js
- tests/cii-workspace-alignment-semantics.test.js
- tests/cii-workspace-transfer-review.test.js
- tests/cii-workspace-transfer-preview.test.js
- tests/cii-workspace-hard-conflict.test.js
- tests/cii-workspace-gang-ambiguity.test.js
Actual: all seven PASS
Limitations: mirrored modules only; does not resolve repository parser/path-aligner imports
```

```text
ID: VAL-103
Status: PASS
Observation: TOOL_EXECUTION
Oracle: NODE_JS_PARSER
Checks: node --check on newly added/modified standalone CII Workspace modules and focused tests used in this hardening pass
Actual: PASS
Limitations: production topology module import integration is not a substitute for a full repository run
```

```text
ID: VAL-104
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: REPOSITORY_INTEGRATION
Tests:
- tests/cii-workspace-intake.test.js
- tests/cii-workspace-topology.test.js
- tests/cii-workspace-determinism.test.js
Reason: no authenticated/full repository checkout in execution environment and no GitHub workflow run exists for c86fc9ce...
Expected: real neutral input parses; production path aligner preserves subdivision/insert-delete semantics; identical inputs/anchors serialize deterministically
Actual: NOT_RUN
```

```text
ID: VAL-105
Status: NOT_APPLICABLE
Observation: AUTHORITY_BLOCKED
Oracle: OWNER_SCOPE
Check: exactly one live Utilities tile plus unchanged Revision Compare mount/destroy lifecycle
Reason: requires editing pre-existing tabs/psnm-utility-tab.js, forbidden by owner instruction
Actual: installer module remains intentionally unregistered; no alternate launcher exists
```

## 8. Changed-File / Maintainability State

Current product additions now include the original CII Workspace modules plus:
- `tabs/cii-workspace/cii-workspace-nodename.js`
- `tabs/cii-workspace/cii-workspace-alignment.js`
- `tests/cii-workspace-nodename.test.js`
- `tests/cii-workspace-alignment-semantics.test.js`
- `tests/cii-workspace-transfer-review.test.js`

All product/test/recovery paths in the PR are additions relative to the locked issue baseline. Current largest CII Workspace JS module is `cii-workspace-topology.js` at 165 physical lines; all new JS files remain below 300 lines and use named exports.

## 9. Review / CI / Continuation

- PR981 remains draft and mergeable.
- product head: `c86fc9ce...`.
- recovery checkpoint before this report refresh: `6313fea1...`.
- main remains `b0f13c99...`.
- no workflow run exists for the product head.
- no merge or ready-for-review authority has been granted.

```text
Start next with: full-repo execution of intake/topology/determinism tests if an authenticated checkout/CI becomes available.
Continue coding only under: tabs/cii-workspace/** and tests/cii-workspace-* plus recovery files.
Do not change: tabs/psnm-utility-tab.js, parser/**, tabs/model-converters/**, tabs/revision-compare/**, xml-compare/**, writers/converters.
Do not invent: alternate launcher, auto-registration, hidden writer/apply path, mutation authority token.
Highest remaining technical risk: real neutral RIGID custody and production path-aligner integration.
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Status: CURRENT. Issue #980 qualification was completed against `main` at `b0f13c99...` and the owner recorded `QUALIFIED`. The implementation remains inside the narrower owner authority: new files only.
