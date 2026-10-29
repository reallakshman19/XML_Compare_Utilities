# WIP-iso-review-evidence-20261029 — Evidence-specific review actions

**Mission:** Match the engineering detail of the repository's PS Mapping validation page `docs/ps-mapping-candidate-matrix-validation.html`, especially its `Review action / evidence` column, in ISO S1/S2 report, CSV, and findings exports.
**User instruction:** "Look for Review action, this is the detail required", linked at commit `3064eaded5d2541ea183b844e92db7e99504bd12`.
**Authority:** READ_ONLY grounding completed; scope limited to read-only review narrative and export. Not authorized to merge.
**Base at intake:** `main` commit `0de2909108114047533671e476f2f66575a755ea`.
**Branch:** `fix/iso-note-specific-review-evidence-20261029`. **Status:** implementation pending. **Decision:** CONTINUE isolated evidence-generation phase.

## Independent scope qualification (Appendix A, 94/100)
A1 Production trace (19): candidate matrix renderer uses resolver `reviewAction || reason` in 14-column candidate CSV; ISO `XmlCompareIsoNoteDirectCompare.reportRow` calls generic `engineeringReviewAction(status,gap,coverage)`; the mapping CSV and finding-level CSV reuse `row.action.action`. Two separate domain policies must stay distinct.
A2 Failure isolation (19): current ISO action is one of four generic phrases, no pipeline, support ID, original references, negated DO NOT REST, typed-gap specifics or required physical verification. Selected source CSV row `S1:1 ↔ S2:184` PS-124.1 has S1 DTXR GUIDE, blank support gap, S2 DO NOT REST [25mm GAP] + GUIDE. Current generic action cannot specify verification.
A3 Invariants (20): exactly normalized pipeline/full support ID and unique match required; never use base+DN candidate as ISO approval, never treat DO NOT REST as positive REST, kN as gap or axial displacement as gap. Preserve raw S1/S2, original refs, typed evidence and policy statuses; never approve model changes automatically; source-only/ambiguous identities stay review-only.
A4 Independent oracle (18): seven original exact pairs from 2,778 S1 / 819 S2 rows; 25 mm non-contact declared for all seven, explicit GUIDE GAP 10 mm PS-123.1 / 20 mm PS-126.1, blank S1 support gaps all seven. Verify new generator output against those raw values and negative controls in existing JS regression.
A5 Minimal patch (18): only `XmlCompareIsoNoteEngineeringRules.js`, `XmlCompareIsoNoteDirectCompare.js`, `tests/xml-compare-iso-note-engineering-architecture.test.js`, and corresponding docs JS mirrors. Reuse existing Review Action column and finding-level reviewAction, no schema/approval/path changes. Active PR #222 modifies `ps-mapping-engine-diagnostics-v25.js` not these files. No workflow change.
**Qualification 94; all >=18.**

## Recovery
- Existing text files edited via GitHub SHA-conditioned update; original Git blob SHA retained by GitHub, preedit and postedit hashes will be added to PR workreport.
- Connector-only environment: repository `utils/backup.cjs`, ignored `.agent-worklogs` could not run. Do not claim local backups.
- Source CSV from prior assistant response is in /mnt/data but NOT committed. A standalone enhanced seven-pair CSV was created locally for the user: `iso_s1_s2_review_action_evidence_matrix.csv`, review-only.
- Source HTML is a dynamic browser demonstration of **different PS Mapping candidate policy**: Pass 1 Support Base + Line Family + DN + Reference Node, Pass 2 Ambiguous — Line Mismatch; NOT applicable as S1/S2 exact match approval.

## Planned
Add optional record context to pure `engineeringReviewAction`, append evidence-specific human review action, include row refs/typed gaps/negated directives/hold statements, keep existing status codes and opening phrases, test exact fixture and counterexamples. Handover PR before review.

## EXACT_NEXT_ACTION
Implement minimal optional evidence-context narrative and pass context from `reportRow`, verify seven user-supplied original pairs locally, run source-grounded tests and GitHub CI. Do not merge absent explicit authorization.
