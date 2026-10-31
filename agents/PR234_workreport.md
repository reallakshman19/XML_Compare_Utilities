# PR234 — Evidence-specific ISO engineering review actions

**Mission:** Bring the ISO S1/S2 `Review Action` in CSV/JSON/finding ledger up to detail level of `docs/ps-mapping-candidate-matrix-validation.html` (`Review action / evidence`) at commit `3064eaded5d2541ea183b844e92db7e99504bd12`.
**Authority:** User "Look for Review action, this is the detail required"; read-only review and export specificity only. **MERGE AUTHORITY: NOT GRANTED.** Do not merge without owner approval.
**Branch:** `fix/iso-note-specific-review-evidence-20261029`, **PR:** https://github.com/reallakshman19/XML_Compare_Utilities/pull/234.
**Base:** main `0de2909108114047533671e476f2f66575a755ea`.
**Current stage:** production, docs mirrors and synthetic regression committed; exact PR head GitHub Node/Chromium qualification PASS. PR remains open for independent review; not merged.
**Source qualification:** WIP `agents/WIP-iso-review-evidence-20261029_workreport.md` Appendix A 94/100.

## Reproduction and oracle
- Existing `engineeringReviewAction` returns only one of four generic sentences based on gap/coverage status. Selected `iso_s1_s2_exact_matches.csv` first row `PS-124.1` has exact identity `S1:1 ↔ S2:184`, S1 DTXR GUIDE, blank S1 Support Gap, S2 `DO NOT REST [25mm GAP](1kN), GUIDE(1kN)`. This cannot be closed with a generic review message: verify approved dimensional non-contact geometry and guide restraint without inventing REST.
- Two S2 notes explicitly include extra GUIDE GAP: PS-123.1 = 10 mm, PS-126.1 = 20 mm. Both are S2-only: no S1 numerical clearance evidence. All seven exact pairs share blank S1 gaps and 25 mm `DO NOT REST`. The original user records remain **only** in conversation / local private artifacts, **not** committed to public GitHub.
- The referenced PS Mapping page intentionally uses a different Pass-1/Pass-2 candidate policy (base+DN+line+node and ambiguity fallback). That is **not** applied to ISO. ISO match still requires exact normalized pipeline+full support ID and confirmed uniqueness.

## Implemented
1. `xml-compare/XmlCompareIsoNoteEngineeringRules.js` and identical `docs/` mirror: `engineeringReviewAction` accepts optional raw evidence context and emits a detailed, evidence-grounded instruction. Includes normalized pipeline/full ID, S1/S2 row refs, DTXR vs S2 positive restraints, typed gap values and per-type status/reason, explicit S1 missing-gaps ≠ zero, `DO NOT REST` negation, force/movement non-gap rules, and engineering check of approved drawings / installed geometry. Keeps existing action code, disposition REVIEW, `transferReady=false`. Old callers without context keep exact old generic sentence.
2. `xml-compare/XmlCompareIsoNoteDirectCompare.js` and `docs/` mirror: pass per-row evidence into shared action, so mapping CSV/JSON, HTML and finding-ledger CSV use the same detailed instruction. Original evidence fields, all statuses, sorting and CSV schema unmodified.
3. `tests/xml-compare-iso-note-engineering-architecture.test.js`: independent acceptance assertions for actual source-like PS-124.1 scenario, 25mm REST/pipe and 10mm GUIDE reviewed independently, negated REST and kN handling, fake missing identity negative control, finding-level action and mapping CSV. No source fixtures/values hard-coded into production.

## Validation
- Source-grounded independent expected values from original attached CSV: **PASS** (seven-row local `iso_s1_s2_review_action_evidence_matrix.csv` generated and verified).
- Direct pure JS execution on branch against synthetic PS-124.1: **PASS** (review code ENGINEERING_REVIEW, REST/pipe 25 and GUIDE 10 = S2-only REVIEW, transferReady false).
- GitHub ISO Composite Identity Qualification: **PASS**, run 40838293446 on tested commit 1bc36d3e5e04bb121acb0fbcc38a5656c8558b3e. XML suite (except previously documented separately tracked baseline build-stamp assertion) and full Table suite PASS (job 123328220894); dedicated Chromium ISO engineering browser regression PASS (job 123328220498). This does not establish a deployed-site original-data test. Report-only commit after that head does not modify qualified product/test files.
- Production/docs file blob parity: **PASS** at tested code state, `XmlCompareIsoNoteEngineeringRules.js` sha dffa6f545e3a4a6613b3bdac9a83ed5cf2f1f7a7 and `XmlCompareIsoNoteDirectCompare.js` sha c48c9a77f5a7908d63fc97fa1a29e461acb92df7 identical to `docs/` mirrors.
- Original 2,778/819 source upload into deployed real UI: **NOT_RUN**; no claim of actual engineering sign-off or field measurement.

## Selective undo pre-image/blob ledger
GitHub file writes conditioned on current blob SHA; no concurrent writes for same file. Physical local `utils/backup.cjs` and ignored `.agent-worklogs` unavailable under connector-only execution; do not falsely claim compliant local backup. Original immutable GitHub blobs below permit precise selective undo after checking for later modifications.
| Module | Original production+docs blob | Current production+docs blob | Undo |
|---|---|---|---|
| ISO Engineering Rules | `263796cae06446da44894b9bf79f37e56bb676e4` | `dffa6f545e3a4a6613b3bdac9a83ed5cf2f1f7a7` | Remove actionEvidence and optional-context append only |
| ISO Direct Compare | `47e989dcaa870ffd0cc7a8ea489c4dd973b30635` | `c48c9a77f5a7908d63fc97fa1a29e461acb92df7` | Restore 3-argument pure action call only |
| Architecture Regression | `a668f7fb5c5fe9b000eeeaba5c778706a0f1d1db` | `6cfa3fad94251987484df92cc77f53b06e028fb8` | Remove review-action fixture assertions only |

## Invariants / risks
- No automatic model/transfer authority, no cross-pipeline approval, no restoration of REST from `DO NOT REST`, no kN or axial displacement as typed gap. Unspecified physical gap remains REVIEW.
- This adds verbose per-row messages to multi-thousand-row exports. The wording is evidence-specific but not a physical engineering approval; users must verify actual support locations and drawings.
- Active PR #222 owns different `ps-mapping-engine-diagnostics-v25.js` files; zero exact-file overlap.

## EXACT_NEXT_ACTION
Request independent engineering review and authorize merge only on explicit owner approval. Recheck current PR head/checks after this report-only update. Do not claim a deployed original-input UI replay. Protect full support ID + pipeline identity and physical clearance review.
