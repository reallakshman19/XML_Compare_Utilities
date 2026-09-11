# PR1198 — Support Report staged POS-cluster trace remediation

PARENT_ISSUE: #1154
CHILD_ISSUE: #1196
PR: #1198
BASE_AT_PR_OPEN: 2b473ae1c4e93d92ad2af8e0716bd8e72ac2eab0
BRANCH: agent/support-report-1196-pos-trace
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: OPEN_DRAFT
RECOVERY_STATE: CONTINUE

## Mission
Correct Support Report staged-JSON trace and coordinate/member authority after Owner browser acceptance exposed that JSON trace is member-oriented rather than POS-cluster-oriented.

## Current implementation
- `SupportReportJsonTrace.v2` retains member-level rows and adds deterministic `posClusters`.
- Native positions are clustered at 0.001 mm normalization precision; missing native POS is explicit `UNRESOLVED_POS`.
- POS clusters aggregate observed IDs, resolved native IDs and match bases without collapsing Support Report rows.
- Support Report UI renders one trace row per POS cluster and separately displays the Navisworks report location.
- only real selected native staged members may become `FAMILY_LINE_ENRICHMENT`; synthetic fallback objects never enter that trace path.
- family-only PS/SL tokens remain observed evidence but are filtered from proven primary-support membership.
- report E/W, N/S and BOP use Navisworks clash/report-location coordinates; staged native POS remains trace evidence until coordinate-frame/base-anchor qualification exists.
- staged `BORE` is normalized to numeric-mm SIZE; accepted fallback bore aliases are secondary; line-tag fallback uses the standard NPS→DN map.
- PREV NAME values equal to the current member ID are suppressed; genuine prior identities remain.
- cache routing was advanced through engine/view/addon/bootstrap.

## Protected invariants
- direct PS/SL identity remains preferred; PREV-NAME remains explicit rename evidence;
- coordinate/base-anchor identity matching remains inactive;
- native POS clustering is evidence grouping, not row/member matching authority;
- separate Navisworks report locations are never merged by native POS;
- PS-12154 same-location behavior and PS-12120 multi-location behavior remain protected;
- CU-PI/CU-PL Site/Zone hierarchy remains unchanged;
- Owner workbook values are never production engineering input.

## Changed-file ledger
Production:
- `support-report-json-trace.js`
- `support-report-row-enrichment.js`
- `support-report-engine.js`
- `support-report-field-normalization.js` (new)
- `support-report-field-projection.js`
- `support-report-view.js`
- `support-report-addon.js`
- `support-steel-relationship-bootstrap.js`

Tests:
- `support-report-pos-trace-remediation.test.mjs` (new)
- `support-report-json-trace-ui.test.mjs`
- `support-report-field-projection.test.mjs`
- `support-report-field-projection-rca.test.mjs`
- `ps-family-clash-audit-benchmark-readiness.test.js`

## Validation status
- Focused/runtime test execution: NOT_RUN at initial draft checkpoint.
- Browser end-to-end smoke: NOT_RUN.
- Full repository suite: NOT_RUN.
- Source/diff reconciliation: PASS — changed paths are confined to #1196 handover, Support Report runtime and Support Report tests.

## Base drift
The branch started at `e1ccdf236588018f304be5942c92b587e3145f6e`. At PR open `main` was `2b473ae1c4e93d92ad2af8e0716bd8e72ac2eab0`, two commits ahead with no net changed files relative to the branch merge base. No Support Report file overlap was observed in that drift.

## Highest risk
The focused tests have been authored but not executed in this connector-only checkpoint. Do not promote the PR from draft or merge based on source inspection alone.

EXACT_NEXT_ACTION: obtain executable validation for the focused remediation suite and Support Report benchmark gate; repair any failures, then re-ground main/PR checks and update #1196/#1154. Merge requires a new explicit Owner instruction.