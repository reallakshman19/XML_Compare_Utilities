# WIP Option B P0 — XML Compare Audit/Approval Separation

**WORK_INTENT:** IMPLEMENT
**REPOSITORY_STATE:** NEW_PR_REQUIRED
**MUTATION_AUTHORITY:** Scoped owner request, only P0 boundary refactor; no merge authority
**CRITICALITY:** ENGINEERING_CRITICAL (approval and engineering transfer boundary)
**Grounding epoch:** 2026-10-28; main SHA `7b4a95bd18262e29b83eddc88fca41720585b5ef`
**Branch:** `fix/xml-compare-option-b-p0-20261028`
**Status:** PLAN, pre-product mutation
**Source:** docs/XML_Compare_Option_B_Concept_Note.md proposed in PR #213; prior merged PR #209

## Handover in 60 seconds
This is the first bounded P0 product delivery for Option B. Goal: ensure ISO audit never writes to the generic transfer approval set; ensure approval commands are validated at their state-transition boundary. Existing three-tab UI and PR #209 composite identity contracts remain authoritative. A real-node/browser qualification and review are still required before any merge.

## Scope
- Add pure audit-only identity-link projection from exact one-to-one ISO evidence.
- Refactor `linkExactIsoNotePairs()` in `tabs/xml-compare-tab.js` to store only audit links; preserve source/target, aim, canvas and approval state.
- Add mandatory approval-context validation at the canvas state reducer boundary and pass context from the real tab controller.
- Update production mirrored `docs/` modules; focused tests for policy guards, identity links, ISO regression and generic non-ISO approval.
- No XML mutation, geometry or clearance semantics changes; no workflows modifications; no merge.

## Protected invariants and falsifiers
H1 audit identity links cannot change `approvedMatchSet`, `matchDecisions`, `pendingConnectorPreview`, transfer stage, selected anchors, or AIM settings. Falsifier: state snapshot changes after running audit.
H2 missing approval context and invalid ISO identity both fail closed, including individual, bulk and manual operations. Falsifier: reducer accepts a wrong-pipeline candidate directly.
Identity authority remains `normalizedPipeline + fullSupportId`; placeholders and `NODE_NUM` never qualify.
Non-ISO generic candidate approval must continue when the explicit caller supplies generic context; unrelated generic behavior must not be silently disabled.

## Coordination
Live open PR inspection found PR #213 documentation-only, no overlapping production paths. Main SHA checked before branch creation. Refresh before integration.

## Validation ledger
- Main-code behavioral reasoning: SOURCE_INSPECTION only.
- Node/Playwright suite: NOT_RUN until implementation and external CI.
- Original 2,778/819 real inputs: NOT_RUN (unavailable to repo CI); synthetic independent benchmark remains reference.

## Planned files
`tabs/xml-compare-tab.js`, `docs/tabs/xml-compare-tab.js`, `xml-compare/XmlCompareCanvasStateController.js`, `docs/xml-compare/XmlCompareCanvasStateController.js`, new pure audit-link module and docs mirror, relevant tests.

## Risks
New reducer signature may affect existing generic callers; require explicit generic approval context and regression coverage. Existing static tests may assert the old auto-link procedure and must be updated consistently without weakening independent identity expectations.

## EXACT_NEXT_ACTION
Implement the smallest source-only patch with negative-assurance tests, then inspect the PR diff and GitHub CI. Do not merge.
