# WIP-optionb-h6-20261028 — Option B H6 typed clearance aggregation

**WORK_INTENT:** IMPLEMENT scoped Option B H6 engineering-evidence aggregation. **CRITICALITY:** ENGINEERING_CRITICAL.
**TAKEOVER_AUTHORITY:** READ_ONLY at intake; source-grounded qualification completed before product edit.
**BASE:** main `f42be020bb6594f845e6affc5be09b2141535ca2`, checked 28 October 2026.
**BRANCH:** `fix/option-b-h6-typed-gap-aggregation-20261028`.
**AUTHORIZATION:** user requested "proceed fix"; no merger authorization.
**RECOVERY STATE:** implementation pending validation, do not merge automatically.

## Scope and coordination

PR #214 (`fix/xml-compare-option-b-p0-20261028`) is ACTIVE/DRAFT and owns authority-boundary changes in `tabs/xml-compare-tab.js`, `XmlCompareCanvasStateController.js`, `XmlCompareIsoNoteDirectCompare.js`, etc. Coordination classification for authority semantics: **COORDINATION_REQUIRED**. This WIP explicitly avoids overlapping files and does not alter audit state, transfer/approval code, source data, or PR #214. PR #213 is documentation-only.

H6 independently corrects the pure domain engineering rule: if a typed gap in S2 lacks S1 evidence, the *aggregate* cannot say MATCH even when another type matches. The existing source-only GUIDE/LINE STOP statuses should remain REVIEW (not a fabricated mismatch). Keep per-type evidence and parser output. Pure rules are already consumed by the ISO comparator, Tab 3 and finding-level report; no UI/transfer code changes required.

## Source-grounded production trace (Appendix A)

**A1 Production trace (19/20):** `XmlCompareIsoNoteEngineeringRules.compareEngineeringGaps` parses S1/S2 by REST/GUIDE/LINE STOP; final branch currently computes `notChecked` then returns MATCH with a warning. `XmlCompareIsoNoteDirectCompare.compareSupportGapWithIsoNote` delegates directly to this pure function; report summary counts MATCH/REVIEW; Tab 3 displays the summary, engineering grid and finding ledger. `XmlCompareIsoNoteEngineeringFindings` independently derives per-type findings from evidence.

**A2 Failure isolation (20/20):** `S1=25mm GAP`, `S2=[25mm GAP], GUIDE GAP=10mm` presently returns MATCH although GUIDE is S2-only. Independent expected: REST MATCH, GUIDE REVIEW, overall REVIEW.

**A3 Authority/invariants (20/20):** H6 aggregate match only when all declared types on either side are comparable, single-valued and equal. Per-type mismatches remain MISMATCH, missing/multiple/untyped evidence REVIEW, no matching evidence NOT_SPECIFIED. Source bytes, canonical support identity, audit/transfer approvals, geometry and target XML unchanged. Do not reinterpret kN loads or axial displacement mm as clearance. H1/H2 left untouched.

**A4 Independent validation (18/20):** Extend existing test `tests/xml-compare-iso-note-gap-macro.test.js` with counterexample and per-type assertions. Adjust prior PS-001 summary expected [3,1,4,1] to [2,1,5,1] *because* GUIDE S2-only is a known engineering review, not to silence a regression. Run full XML/Table and ISO browser CI; baseline stale startup build-stamp assertion remains pre-existing. Real original-input replay NOT_RUN unless those files are available to the remote CI.

**A5 Minimal patch (19/20):** Change only `xml-compare/XmlCompareIsoNoteEngineeringRules.js`, matching `docs/` mirror, `xml-compare/XmlCompareIsoNoteEngineeringFindings.js` and mirror if needed to use common per-type results, and one existing gap test; no shared policy, UI or workflow changes. No ownership overlap with PR #214's changed-file list.

**Qualification:** 96/100, each criterion >=17, decision CONTINUE within isolated H6 phase.

## Planned / did

**Planned:** Introduce immutable `byType` gap status/evidence and aggregate conservatively across all declared types. Preserve public `status`, `reason`, `s1RestMm`, etc. All downstream audit actions stay read-only. Align per-type finding rows with this one policy. Extend exercised tests.

**Did:** Not yet applied at initial checkpoint.

## Validation
- Repository source/main, AGENTS.md, PR #213 concept, PR #214 scope: **PASS** (SOURCE_INSPECTION).
- Full Node/browser CI: **NOT_RUN** at initial checkpoint.
- Real attachments in repository CI: **NOT_RUN**.
- Local backups/patch ledger: GitHub connector-only path; local `utils/backup.cjs` cannot run because container cannot resolve github.com. Before each existing-file write fetch current blob SHA and preserve prior commit SHA, document absence of physical local backup (NOT_AVAILABLE). Do not claim compliant local backup; GitHub commit/blob history remains a recoverable immutable reference.

## Patch and rollback
No product files changed at this checkpoint. Each future edit will be SHA-preconditioned, accompanied by file-level ledger and reversible precise hunks; never reset/revert or overwrite another agent's work.

## Highest risk
Changing aggregate `MATCH` to `REVIEW` alters counts and action classifications; preserve all per-type positive evidence and existing non-ISO behavior, keep independent test oracle.

## EXACT_NEXT_ACTION
Inspect latest H6 files at branch SHA, patch pure rule only, align finding type output, extend existing XML gap regression with S2-only GUIDE/LINE STOP and source-only types; run focused tests then open review PR and validate CI. No merge without owner authorization.
