# PR1001 — CII explicit APPLY / EXCLUDE transfer scope

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_REVIEW
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_MUTATION_AUTHORITY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 — explicit APPLY / EXCLUDE transfer-scope custody
PR: 1001
BRANCH: agent/cii-explicit-transfer-scope
BASE_AT_GROUNDING: main@0274f63c6e17a0495a63e268b5da0dc0bb0e8a16
PREDECESSOR: PR999 merged -> 0274f63c6e17a0495a63e268b5da0dc0bb0e8a16
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: VALIDATE / RECONCILE
GROUNDING_EPOCH: GE-001 / 2026-08-19
CURRENT_BLOCKER: COMPLETE_CHECKOUT_REPOSITORY_AND_BROWSER_EXECUTION_NOT_RUN_ENVIRONMENT
EXACT_NEXT_ACTION: remove temporary WIP custody, reconcile exact 14-file ledger, live main/head/checks; owner review; do not merge without explicit authorization
```

## Handover in 60 Seconds

PR999 clarified SOURCE candidate / Current TARGET / Effective TARGET. PR1001 makes mutation selection authoritative rather than cosmetic:

```text
reviewed correspondence
      ↓
classified transfer candidates
      ↓
EXPLICIT APPLY / EXCLUDE SCOPE
      ↓
APPLY -> transferPlan.operations[]
EXCLUDE -> transferPlan.excludedOperations[]
      ↓
Writer readiness on APPLY set only
      ↓
qualified mutation
```

The scope binds SOURCE hash, TARGET hash and the exact mutable operation-ID set. A missing/new/duplicate operation or hash change invalidates the scope. EXCLUDE never becomes fake KEEP and never weakens Writer policy.

---

# 1. Ground truth

At implementation grounding:

```text
main = 0274f63c6e17a0495a63e268b5da0dc0bb0e8a16
PR999 = MERGED
PR1001 = draft successor
branch = agent/cii-explicit-transfer-scope
initial implementation diff = 10 production/doc/test/oracle files before permanent custody
behind main = 0
```

Live GitHub state overrides this snapshot.

---

# 2. Root cause

Identity approval and transfer classification already existed, but the product path had no independent mutation-scope custody. Once correspondence was reviewed, every classified transfer operation flowed into Writer readiness. This meant a single unsupported reviewed delta could block unrelated supported mutations, and there was no authoritative way to say:

```text
identity accepted
but this engineering delta is intentionally NOT being transferred
```

A visual checkbox alone would be disqualifying because Writer would still receive the unfiltered operation set.

---

# 3. Implemented authority

## 3.1 Scope schemas

Added:

```text
CIIWorkspaceTransferScope.v1
CIIWorkspaceTransferScopeSelection.v1
```

## 3.2 Exact binding

A scope binds:

```text
SOURCE content SHA-256
TARGET content SHA-256
candidateOperationIds[]
one decision for every mutable candidate operation
```

Allowed decisions:

```text
APPLY
EXCLUDE
```

Fail-closed blockers include:

```text
TRANSFER_SCOPE_EXPLICIT_SELECTION_REQUIRED
TRANSFER_SCOPE_SOURCE_HASH_MISMATCH
TRANSFER_SCOPE_TARGET_HASH_MISMATCH
TRANSFER_SCOPE_OPERATION_SET_MISMATCH
TRANSFER_SCOPE_DUPLICATE_OPERATION:<id>
TRANSFER_SCOPE_DECISION_INVALID
TRANSFER_SCOPE_NO_APPLY_OPERATIONS
```

## 3.3 APPLY

APPLY remains in the existing transfer plan `operations[]`. Existing Writer 1A/1B readiness evaluates it unchanged.

No new Writer whitelist is introduced.

## 3.4 EXCLUDE

EXCLUDE is moved to `excludedOperations[]` with `scopeDecision: EXCLUDE`.

It remains visible in:

- scoped audit JSON;
- transfer-scope applied/excluded IDs and counts;
- excluded-operation UI;
- engineering-delta presentation as `EXCLUDED`;
- SOURCE proposal traceability.

It is absent from Writer `operations[]`.

Therefore a blocked SIF/TEE delta can be explicitly EXCLUDED while a qualified P1 delta is APPLY. Writer then evaluates P1 only. If SIF/TEE is instead APPLY, Writer remains BLOCKED.

## 3.5 All EXCLUDE

All EXCLUDE does not mean success:

```text
TRANSFER_SCOPE_NO_APPLY_OPERATIONS
=> transfer plan BLOCKED
=> Writer mutation authority unavailable
```

## 3.6 Scoped preview and audit

`bindCiiTransferScopeToPreview()` recalculates:

- scoped transfer plan;
- Writer readiness;
- Stage 06 readiness;
- audit transfer preview;
- audit `transferScope`;
- audit `excludedTransferOperations`;
- mutation-authority status;
- artifact bundle.

After scope binding, the existing Compare-tab CSV/audit controls are intercepted to export the scoped artifacts. This avoids two competing audit authorities.

---

# 4. Product UI

The CII Workspace tile now mounts `mountCiiWorkspaceScopedEngineeringShell()`.

The scoped shell wraps the already-established PR997/998 engineering shell; it does not create another matching engine.

Transfer Preview provides:

- one APPLY/EXCLUDE decision per mutable operation;
- default EXCLUDE before engineer action;
- APPLY-all-preview-ready convenience action;
- EXCLUDE-all convenience action;
- explicit Bind APPLY/EXCLUDE scope action;
- scoped audit export;
- scope ID and applied/excluded counts;
- separate excluded-operation evidence table;
- Writer Apply disabled until scope is BOUND and Writer readiness is READY.

Review decisions and mutation scope remain separate. If correspondence review changes, scope becomes dirty and must be rebound after `Apply approvals to Transfer Preview`.

---

# 5. Authority boundary

Changed authority:

```text
reviewed/classified transfer candidate
    -> explicit operation-level mutation scope
```

Unchanged protected authority:

```text
Method A/B mathematics and weighting
base-loop orchestration
correspondence arbitration
engineering-delta calculation
transfer-policy classification
Writer 1A implementation
Writer 1B implementation / whitelist
fixed-field parser
protected converters
GitHub workflows
```

Low-level direct Writer tests/callers remain compatible. Product CII Workspace is the path that requires explicit scope.

---

# 6. Validation truth

| Validation | Status | Observation / Oracle |
|---|---|---|
| Main/source grounding | PASS | SOURCE_INSPECTION |
| Frozen authority-boundary diff | PASS | GIT_COMPARE |
| Standalone scope state-machine oracle | PASS | INDEPENDENT_REPRODUCTION |
| APPLY P1 + EXCLUDE blocked SIF state | PASS | INDEPENDENT_REPRODUCTION |
| all EXCLUDE blocks mutation | PASS | INDEPENDENT_REPRODUCTION |
| new operation invalidates stale scope | PASS | INDEPENDENT_REPRODUCTION |
| TARGET hash mismatch invalidates scope | PASS | INDEPENDENT_REPRODUCTION |
| Repository transfer-scope JS test | AUTHORED_NOT_RUN_ENVIRONMENT | NOT_OBSERVED |
| Repository scope UI/product-routing test | AUTHORED_NOT_RUN_ENVIRONMENT | NOT_OBSERVED |
| Full CII shell lifecycle | NOT_RUN_ENVIRONMENT | NOT_OBSERVED |
| SOURCE 3 -> TARGET 3-1 browser workflow | NOT_RUN_ENVIRONMENT | NOT_OBSERVED |
| Chromium | NOT_RUN_ENVIRONMENT | NOT_OBSERVED |
| Full repository suite | NOT_RUN_ENVIRONMENT | NOT_OBSERVED |

The local runtime failed before checkout because `github.com` DNS resolution was unavailable. No authored repository test is represented as PASS.

---

# 7. Changed-file ledger target

Permanent expected final diff:

```text
agents/MASTER_INDEX.md
agents/PR1001_workreport.md
agents/claims/PR1001.yaml
agents/status/PR1001.yaml
docs/CIIcompareconceptnote.md
tabs/cii-workspace/cii-workspace-contracts.js
tabs/cii-workspace/cii-workspace-review-presentation.js
tabs/cii-workspace/cii-workspace-tab.js
tabs/cii-workspace/cii-workspace-transfer-scope-ui.css
tabs/cii-workspace/cii-workspace-transfer-scope-ui.js
tabs/cii-workspace/cii-workspace-transfer-scope.js
tests/cii-workspace-transfer-scope-ui.test.js
tests/cii-workspace-transfer-scope.test.js
tests/qualification/cii-workspace-transfer-scope-oracle.md
```

Expected: **14 files**.

Temporary `agents/WIP-CII-TRANSFER-SCOPE*` files are not part of final scope and must be deleted.

---

# 8. Risks / remaining qualification

**RISK-1001-01 — Browser lifecycle not executed.**  
The scoped shell uses a local MutationObserver around Transfer Preview. Source review found observer disconnect/reconnect protection around self-rendering, but real Chromium lifecycle remains NOT_RUN.

**RISK-1001-02 — Full Writer round trip not executed through scoped UI.**  
The Writer itself is unchanged and receives only selected operations, but a complete product round trip remains NOT_RUN_ENVIRONMENT.

**RISK-1001-03 — Direct old shell remains compatibility path.**  
The product tile is routed through the scoped shell. Direct programmatic callers of lower-level engineering shell/Writer APIs remain compatible and are not silently redefined by this PR.

---

# 9. Decision log

**DEC-1001-01:** EXCLUDE is a separate audit collection, never fake KEEP.  
**DEC-1001-02:** Writer policy is not modified; scope filters the operation set before readiness.  
**DEC-1001-03:** Exact operation-set equality is required to prevent stale scope applying new operations.  
**DEC-1001-04:** SOURCE/TARGET hashes are part of scope custody.  
**DEC-1001-05:** All EXCLUDE has no mutation authority.  
**DEC-1001-06:** Product tile requires explicit scope; low-level Writer compatibility remains intact.  
**DEC-1001-07:** After binding, existing audit/CSV exports use scoped artifacts.

---

# Appendix A — Expert handover questionnaire

1. **Where is the mutation-scope authority applied?**  
   In `cii-workspace-transfer-scope.js`, after transfer classification and before Writer readiness.

2. **Does EXCLUDE modify Writer classification?**  
   No. It removes the operation from Writer `operations[]` while retaining the original operation in `excludedOperations[]`.

3. **Can an unsupported operation be made ready by selecting APPLY?**  
   No. Existing Writer readiness sees it and remains blocked.

4. **What prevents an old scope from silently applying a newly generated operation?**  
   Exact mutable candidate operation-ID set equality. Mismatch returns `TRANSFER_SCOPE_OPERATION_SET_MISMATCH`.

5. **What prevents reusing scope on a changed TARGET?**  
   SOURCE/TARGET content hashes are bound and mismatches invalidate scope.

6. **What happens if every operation is EXCLUDE?**  
   `TRANSFER_SCOPE_NO_APPLY_OPERATIONS`; no Writer mutation authority.

7. **What is the canonical audit after scope binding?**  
   The scoped preview audit, containing both selected transfer plan and excluded operations. Existing export controls are intercepted to export scoped artifacts.

8. **Did this PR change Writer 1B's whitelist or fixed-field logic?**  
   No.

9. **What remains NOT_RUN?**  
   Repository-imported focused tests, shell lifecycle, real SOURCE 3/TARGET 3-1 browser flow, Chromium and full suite due environment checkout/DNS limitation.

10. **What is the falsifier for this increment?**  
    If an EXCLUDED operation still reaches Writer `operations[]`, if a newly appearing operation is implicitly APPLY under an old scope, or if a selected unsupported APPLY becomes Writer-ready, the implementation is invalid.
