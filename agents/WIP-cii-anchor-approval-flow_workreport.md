# WIP — CII Base Anchor + Approval Flow

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: WIP_ALLOCATED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: WRITE_ALLOWED
BASE_BRANCH: main
BASE_SHA: dc1371afcd44c12de86b2dad6eddf00f1f0b3c55
BRANCH: agent/cii-anchor-approval-flow
SCOPE: paired base-anchor suggestions + bulk correspondence acceptance + delta approval projection + approval-gated transfer preview UI
TARGET_CII_MUTATION: BLOCKED_NOT_IMPLEMENTED
COORDINATION: SAFE_AGAINST_CURRENT_MAIN; prior CII stack #982-#988 is merged
EXACT_NEXT_ACTION: add topology-only paired base-anchor suggestion contract and UI acceptance without node-offset inference
```

## Mission

Replace independent SOURCE/TARGET landmark lists with explicit evidence-only BASE ANCHOR pair suggestions; require engineer Accept to populate locked anchors. Add bulk Accept High/Medium controls in Correspondence Review, project correspondence Decision into Engineering Delta Grid Approval, and ensure Transfer Preview is visibly based only on approved/locked correspondence while target mutation remains blocked.

## Authority / invariants

- Base-anchor suggestions are evidence only and must never auto-lock.
- Pairing must use dimension-free topology/local structural evidence; no `+20000`/`+10000` numbering-offset identity.
- M1/M2 correspondence policy is not retuned.
- Engineering deltas remain downstream of identity.
- Transfer Preview only consumes accepted/locked correspondence authority.
- Geometry, node numbering, topology, OD and wall remain protected.
- Stage06 target CII mutation/export remains NOT_IMPLEMENTED/BLOCKED.

## Planned modules

1. `cii-workspace-landmarks.js` / core inspection — explicit paired anchor suggestions.
2. `cii-workspace-shell.js` — base-anchor Accept UI, bulk High/Medium acceptance, delta Approval column, approval-basis wording in Transfer Preview.
3. Focused regressions for pairing/no-offset authority and UI/review approval flow.

## Validation ledger

- Current main/source inspection: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REPOSITORY.
- Product changes: NOT_RUN.
- Focused tests: NOT_RUN.

# APPENDIX A

Same qualified agent continuing directly from the merged CII Compare programme; no takeover boundary is crossed. A different agent must independently re-ground current `main`, this WIP/PR, and the identity/transfer authority chain before production mutation.
