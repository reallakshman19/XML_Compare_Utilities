# CODER-CHECKPOINT · UXML-S4.1-CATEGORIZED-READER · coder-b4

**Task:** XCU #239 · new DRAFT PR from XCU main
`578517545415c8ae371c9d21e54fcfbae8e44c3f` · branch
`feat/uxml-s4-1-categorized-reader-20261102`. No merge.

**Scope:** one read-only original-bound canonical UXML evidence reader
(`uxml/UxmlCategorizedInputXmlSchemaMapper.js`) and matching docs mirror;
synthetic/public tests, isolated guard mutants, exact-head workflow, S4.1
contract and this checkpoint. No converter, S3/S1, existing mapper/detector,
TopoFix, policy or Owner source modified.

**Source authority:** original SHA independently measured; all physical
records matched one-to-one by trimmed OriginalElement plus nodes, elementKey
and line. Physical S3 ordinal reused, never inferred from Categorized order.
Ambiguous identical duplicates REFUSED; no original means
NOT_SOURCE_EQUIVALENT evidence-only. Projection edits require explicit
REVIEW_ONLY and never apply. External duplicates/unknown non-carried sections
REFUSED. Shared UxmlValidationGate runs; Apply/export is always false.

**STRUCTURAL ROUND AFTER INDEPENDENT HOLD 76:** Same branch and DRAFT PR, no force/rebase/merge. The previous S3-only agreement accepted original InputXML with complete PIPINGELEMENT markup hidden inside comments or processing instructions. S4.1 now independently tokenizes the ORIGINAL once, with a balanced XML element stack and explicit comment/PI/CDATA/DOCTYPE ranges. Physical record starts/ends and zero-based keys come only from actual direct PIPINGMODEL-child elements; the single CAESARII root and one PIPINGMODEL, root close, and trailing whitespace/comment limits are enforced. Any fake or misplaced PIPINGELEMENT record or malformed XML tree returns ORIGINAL_STRUCTURE with `uxml:null` before strict S3. The earlier PLB314 `UNITS` refusal and old S3 comment/PI weakness are superseded by Owner-authorized S3 and S4.1 source-structure corrections. Null/undefined options default to no-original NOT_SOURCE_EQUIVALENT evidence-only.

**STRUCTURAL TESTS / MUTANTS:** New synthetic test cases: complete row inside XML comment (with sibling), only-commented row, complete row inside PI (with sibling and only-row), fake row in CDATA/DOCTYPE, row after root, row outside PIPINGMODEL but within CAESARII, wrapped row, unbalanced tag, duplicate roots/models, trailing nonwhitespace, correct trailing comment and null options. The disposable mutation harness preserves exact matching across LF or simulated Windows CRLF; 31 named guards have baseline-green/original-regression-red evidence in each mode. All earlier S4.1 refusals, source-bound strict S3 and key-set agreement retained; no S3/S1/converter/other-format changes.

**Executed code head before documentation updates:** `62e5c81415e909c5bcba6726d4a1697bbebfeceb`, [S4.1 CI #41388819909](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41388819909) **SUCCESS** (reader **51/51**, LF mutants **31/31**, simulated-CRLF mutants **31/31** with 31 targeted RED_VERIFIED in each run; S4 **86/86**, S3 **13/13**, S1 **12/12**, admission **20/20**, sideload/enrichment exit 0). Earlier `5f700777` runs are SUPERSEDED. This checkpoint edit changes the head, so the final SHA and the **final-head exact checkout CI** are recorded in the latest [XCU #239 work_returned](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239). Simulated CRLF is Linux-run, not native Windows.


**NEW TASK · UXML-S4.1-ACCEPT-UNITS (AFTER MERGED #250):** Owner approved a new DRAFT PR #251 from main `28c75d63593e0f33245ae1ab20e7ca52a8c3de0d`, branch `feat/uxml-s4-1-accept-units-20261102`. S4.1 now calls the shared original-source scanner with its default (strict S3-compatible) mode; verified non-record `UNITS` model children before/after rows are admitted. SourceRefs still derive only from direct physical PIPINGELEMENT records, with full one-to-one coverage, source SHA and S3 recordKey agreement. The unchanged S4.0 forward converter may include trailing `UNITS` in the last self-closing OriginalElement; S4.1 matches only the exact original-contiguous suffix and separately checks regenerated evidence. Repeated inactive CAESAR restraint placeholders are ignored consistently with S4.0; repeated active external stanzas still refuse. All prior synthetic refusal classes remain guarded.

**REAL-SOURCE QUALIFICATION:** `docs/GREInputxml.xml` 100; `docs/PLB314Inputxml.xml` 53; `opt/mock-xml.xml` 244; `converters/scripts/pdf_inputxml_profile_bm_cii.xml` 40. Each feeds the real S4.0 categorized text + exact original and SHA into S4.1; expect `SOURCE_BOUND_READ_ONLY`, total coverage, no duplicate claims, unchanged owning Line, exact S3 key-set parity, and `exportAllowed:false`. UNITS before/after passes; nested row, hidden row and forged suffix refuse.

**MUTANT CHANGE:** Replaced historical `MODEL_CHILD_KIND_GUARD` refusal mutant with `S4_REAL_UNITS_SCANNER_OPTION_GUARD` and `S4_REAL_UNITS_SECTION_GUARD`, plus active-external-placeholder and final snapshot witnesses. The exact latest work_returned on [XCU #239](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239) pins final SHA, exact-head LF/CRLF counts and Actions links; older heads above are history, not new qualification.

**OPTIONAL MIRROR:** `docs/uxml/UxmlInputXmlSchemaMapper.js` strict S3 mirror alignment **NOT_DONE**: that broad 1599-line docs module is not byte-identical with the 1882-line production mapper; modifying it is not a tiny S4.1-bound change. Strict S3 product behavior unchanged.

**NOT_RUN / HOLD:** Local full repo (GitHub DNS prevents checkout); top-level `npm test`; independent non-author reviewer; Owner original-file trial; S4.2, release and merge not authorized.

**NEXT → Oracle:** reconcile exact PR SHA, CI receipts, mutation kills and
source-bound refusal; commission independent non-author review.
Owner alone may authorize merge or S4.2.
