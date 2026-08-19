# PR998 — CII multi-base UI authority fix + concept-note refresh

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_REVIEW
PR_RECOVERY_STATE: DRAFT_IMPLEMENTATION_COMPLETE_FOCUSED_SELECTION_PASS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_UI_AUTHORITY_SEAM
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #993 / owner instruction "implement fix in auto mode" + concept-note refresh
PR: 998
BRANCH: agent/cii-multi-base-ui-fix
STACKED_BASE: agent/cii-fullscreen-anchor-evidence-ui / PR997@3b772956dbd4407f29df66789bae22e5ade112b1
MERGED_MAIN_AT_START: df19d1834459f486fddd77eaec4297767ef83c6b
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: VALIDATE / RECONCILE
GROUNDING_EPOCH: GE-001 / 2026-08-19
CURRENT_BLOCKER: COMPLETE-CHECKOUT FULL UI/SHELL/BROWSER EXECUTION NOT_RUN_ENVIRONMENT
EXACT_NEXT_ACTION: reconcile branch/PR head and run any executable source-level/focused checks; stop merge-ready because AUTO MODE does not grant merge authority
```

## Handover in 60 Seconds

PR997 made Method A/B evidence visible in a full-screen engineering UI, but its card acceptance still delegated to the legacy flat anchor text inputs. That could undo the multi-base architecture when a complex SOURCE/TARGET revision has several independently stable local regions.

PR998 fixes that seam:

```text
selected method-qualified card(s)
        ↓
Method A -> entire bestBase.anchorPairs
Method B -> one accepted pair loop
A+B      -> two independent loops
        ↓
dedupe same A base only
        ↓
baseLoops[]
        ↓
createCiiWorkspacePreview()
        ↓
OR_WITH_CONFLICT_VETO
```

Manual/LANDMARK fallback remains a separate mode. Contradictory B selections are intentionally preserved so the merged core can return AMBIGUOUS.

`docs/CIIcompareconceptnote.md` was rewritten to remove stale PR989-era assumptions and now documents the implemented OD-scaled Method A/B/multi-base architecture.

---

## 1. Live ground truth

At PR creation:

```text
main: df19d1834459f486fddd77eaec4297767ef83c6b
PR997: open draft, head 3b772956dbd4407f29df66789bae22e5ade112b1
PR998: stacked on PR997 branch
PR998 initial head at creation: af582734599eea6a5211485536a506362e267a87
```

Live GitHub state overrides this snapshot.

## 2. Mission and acceptance

### Mission

Make the full-screen Method A/B Base Anchor UI actually preserve independent local base authority through the production preview pipeline.

### Acceptance criteria

1. Method-A card selection carries all validated pairs in the selected local base.
2. A+B card selection creates two independent loops.
3. Same Method-A base selected through several cards dedupes once.
4. Distinct local Method-A bases remain separate.
5. Conflicting Method-B source/target claims remain separate until core arbitration.
6. LANDMARK_ONLY cannot silently become Method B.
7. Explicit qualified base-loop mode and legacy/manual mode do not silently mix.
8. Changing base selection invalidates stale correspondence/review/export state.
9. Review refresh preserves the same bound `baseLoops` input.
10. Concept note matches implemented tolerance, weighting, multi-base and benchmark authority.
11. No Method A/B mathematics, correspondence arbitration, Writer 1A/1B, parser or converter authority is weakened.

---

## 3. Diagnosis

### ISS-998-01 — UI acceptance collapsed authority

PR997 presentation correctly showed Method A/B evidence but delegated each new card to the old single-pair `Accept base anchor` control. The legacy shell then built:

```text
baseInput.anchorPairs = flat list
```

and did not use the already-merged explicit `baseLoops[]` path.

For a model with local transforms T1, T2, T3 this can incorrectly force all accepted regions into one legacy basis/span.

### Falsifier

If selecting two independent Method-A cards with different `baseId` values still results in one flat `anchorPairs` input or one global transform, the fix fails.

---

## 4. Implemented production behavior

### 4.1 `cii-workspace-base-loop-selection.js`

Pure projection layer.

Rules:

```text
METHOD_A_SPATIAL
  -> use methodA.bestBase.baseId
  -> use every pair in bestBase.anchorPairs

METHOD_B_NETWORK
  -> one accepted SOURCE/TARGET pair loop

METHOD_A_AND_B
  -> A loop + B loop

LANDMARK_ONLY
  -> no qualified loop
```

Deduplication:

```text
A: method + baseId
B: method + source/target pair
```

Do not dedupe different B targets for the same source.

### 4.2 `cii-workspace-shell.js`

The shell now accepts optional `options.getBaseLoops()`.

Analyze behavior:

```text
if selected baseLoops exist:
    baseInput.baseLoops = selected loops
    stale anchorPairs removed
else:
    parse manual SOURCE/TARGET anchor fields
    baseInput.anchorPairs = legacy pairs
    stale baseLoops removed
```

`invalidateExternal()` is exposed only so the engineering wrapper can invalidate stale review/export state when base selection changes.

Review refresh calls existing `run()` over the already-bound `baseInput`; it therefore preserves explicit multi-base mode.

### 4.3 `cii-workspace-engineering-ui.js`

Maintains an engineer-selected set of suggestion keys.

- several cards may remain selected simultaneously;
- selected base tray shows A/B loop counts and `OR + conflict veto`;
- A+B states explicitly that acceptance creates two independent loops;
- switching to qualified bases clears manual fields;
- typing manual anchors clears qualified selection;
- file changes and reinspection clear stale selection;
- LANDMARK_ONLY uses the separate legacy/manual fallback control.

### 4.4 Concept note

The concept note now records:

- `T = x * SOURCE_OD`, default x=2;
- SOURCE minimum-positive incident OD authority;
- TARGET-OD invariance;
- exact Method-A weight decomposition 35/25/20/10/10;
- exact Method-B decomposition 40/20/15/15/10;
- Method-B two-axis hard gate and angular displacement conversion;
- compatible planar/full-3D weighting;
- independent local bases and `OR_WITH_CONFLICT_VETO`;
- A+B as two loops/corroboration;
- separate Base Anchor A/B vs downstream M1/M2 concepts;
- `SOURCE 3.CII -> TARGET 3-1.CII` benchmark;
- Writer roadmap and validation anti-gaming rules.

---

## 5. Authority / invariants

### Must remain true

```text
OD identity points = 0
TARGET OD tolerance authority = 0
node-number offset identity authority = 0
Method B minimum independent runs = 2
Method A minimum non-collinear registration pairs = 3
Method A auto confidence with only 3 pairs = REVIEW cap
separate local A transforms need not agree globally
A/B conflict cannot be averaged or majority-voted away
Writer receives only canonical approved correspondence/deltas
```

### Explicitly unchanged

- `cii-workspace-geometry.js`;
- `cii-workspace-pipe-runs.js`;
- `cii-workspace-anchor-method-a.js`;
- `cii-workspace-anchor-suggestions.js`;
- `cii-workspace-multi-base-anchor.js`;
- `cii-workspace-multi-base-correspondence.js`;
- Writer 1A/1B;
- fixed-field parser;
- protected converter;
- workflows.

---

## 6. Validation ledger

### VAL-998-01 — exact selection projection

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: IMPLEMENTATION_COUPLED
command:
  node --check tabs/cii-workspace/cii-workspace-base-loop-selection.js
  node tests/cii-workspace-base-loop-selection.test.js
result:
  CII independent multi-base UI selection projection checks passed.
```

Proved:

- A+B -> two loops;
- Method A carries whole four-pair base;
- same A base dedupes;
- two distinct A bases remain independent;
- conflicting B claims are preserved;
- LANDMARK_ONLY cannot become B;
- engineer-selected three-anchor READY/REVIEW A base can still be passed explicitly;
- explicit/legacy stale input fields are removed when switching mode.

### VAL-998-02 — executed-content equivalence

```text
STATUS: PASS
OBSERVATION: ARTIFACT_INSPECTION + LOCAL_EXECUTION
ORACLE: IMPLEMENTATION_COUPLED
branch helper blob: ea660640e4c70cdf61db8350e09758d469b84477
local executed helper blob: ea660640e4c70cdf61db8350e09758d469b84477
branch test blob: 4852ee0372c14890a3837e0665323a32cc5f97e4
local executed test blob: 4852ee0372c14890a3837e0665323a32cc5f97e4
```

Therefore VAL-998-01 executed the exact helper/test blobs present on the PR branch.

### VAL-998-03 — first test attempt

```text
STATUS: FAIL -> RESOLVED_BY_TEST_FIX
OBSERVATION: LOCAL_EXECUTION
failure origin: TEST_FIXTURE
```

The fixture used:

```text
'METHOD_A_AND_B'.includes('METHOD_B') == false
```

and therefore created no Method-B evidence. Production method membership used explicit enum equality and was not changed. Fixture corrected; rerun PASS.

### VAL-998-04 — integration source review

```text
STATUS: PASS
OBSERVATION: SOURCE_INSPECTION
ORACLE: NONE
```

Reviewed:

- selected-loop projection;
- shell analyze branch;
- stale-state invalidation;
- review refresh persistence;
- manual/qualified exclusivity;
- file/reinspection reset;
- conflict preservation.

### NOT_RUN

```text
focused full engineering UI test: NOT_RUN_ENVIRONMENT
existing shell lifecycle: NOT_RUN_ENVIRONMENT
SOURCE 3/TARGET 3-1 browser workflow: NOT_RUN_ENVIRONMENT
Chromium full-screen/multi-select acceptance: NOT_RUN_ENVIRONMENT
full repository suite: NOT_RUN_ENVIRONMENT
```

Reason: execution container cannot resolve `github.com` for a complete checkout. No workflow file is added or modified to work around this.

---

## 7. Changed-file ledger — stacked over PR997

Expected production/docs/tests before custody files:

```text
docs/CIIcompareconceptnote.md
tabs/cii-workspace/cii-workspace-base-loop-selection.js
tabs/cii-workspace/cii-workspace-engineering-ui.css
tabs/cii-workspace/cii-workspace-engineering-ui.js
tabs/cii-workspace/cii-workspace-shell.js
tests/cii-workspace-base-loop-selection.test.js
tests/cii-workspace-engineering-ui.test.js
```

Custody additions:

```text
agents/PR998_workreport.md
agents/status/PR998.yaml
agents/claims/PR998.yaml
agents/MASTER_INDEX.md
```

No authority-kernel file is expected to change.

---

## 8. Risks / open questions

### RISK-998-01 — browser execution not observed

Full DOM/browser behavior is authored but not executed in this environment.

### RISK-998-02 — stacked merge ordering

PR998 is based on PR997. PR997 must be integrated before or together with the PR998 diff; do not independently squash PR998 onto `main` without re-grounding/rebasing and confirming the resulting changed-file scope.

### QST-998-01 — alternate Method-A bases containing same pair

A suggestion may contain `methodA.bases[]` with more than one qualified local base. Current engineer selection projects `bestBase` only. This is intentional for deterministic first UI authority; exposing explicit alternate-base selection is a later UX enhancement if real benchmarks require it. Do not auto-select all alternate bases.

---

# Appendix A — implementation qualification / next-agent gate

## A1 Production trace

Trace a selected `METHOD_A_AND_B` card from `cii-workspace-engineering-ui.js` through `cii-workspace-base-loop-selection.js`, `cii-workspace-shell.js`, `createCiiWorkspacePreview()`, `explicitMultiBaseAuthority()` and `buildCiiMultiBaseCorrespondence()`. Explain why two loops, not one fused loop, reach arbitration.

## A2 Failure isolation

Construct a UI selection where SOURCE node `500` is accepted by two Method-B cards targeting `1500` and `2500`. Identify the first production function that must preserve both and the first core function that must classify the conflict. State the expected final authority status.

## A3 Authority / invariant

Explain why `bestBase.anchorPairs` must be passed in full for Method A and why using only the clicked pair would be mathematically invalid for 3D rotation authority.

## A4 Independent validation

Design a browser or integration test with two local Method-A bases having materially different translations. Show how to prove the UI sent two explicit loops and did not regress to `LEGACY_ANCHOR_PAIRS` or expose one fake global transform.

## A5 Next commit / minimal patch

If browser validation shows that manual input can coexist with a selected qualified base after a specific UI interaction, identify the smallest file(s) to fix without touching geometry, Method-B thresholds, arbitration or Writer authority.

Default engineering-critical takeover threshold remains 92/100 total and >=17/20 per question.
