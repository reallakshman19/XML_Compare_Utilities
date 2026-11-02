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

**STRUCTURAL ROUND AFTER INDEPENDENT HOLD 76:** Same branch and DRAFT PR, no force/rebase/merge. The previous S3-only agreement accepted original InputXML with complete PIPINGELEMENT markup hidden inside comments or processing instructions. S4.1 now independently tokenizes the ORIGINAL once, with a balanced XML element stack and explicit comment/PI/CDATA/DOCTYPE ranges. Physical record starts/ends and zero-based keys come only from actual direct PIPINGMODEL-child elements; the single CAESARII root and one PIPINGMODEL, root close, and trailing whitespace/comment limits are enforced. Any fake or misplaced record, malformed tree, or unsupported direct model child (including public PLB314 trailing UNITS) returns ORIGINAL_STRUCTURE with `uxml:null` before strict S3. S3 is unchanged, retains a separate weakness requiring an Oracle follow-up. Null/undefined options default to no-original NOT_SOURCE_EQUIVALENT evidence-only.

**STRUCTURAL TESTS / MUTANTS:** New synthetic test cases: complete row inside XML comment (with sibling), only-commented row, complete row inside PI (with sibling and only-row), fake row in CDATA/DOCTYPE, row after root, row outside PIPINGMODEL but within CAESARII, wrapped row, unbalanced tag, duplicate roots/models, trailing nonwhitespace, correct trailing comment and null options. The disposable mutation harness preserves exact matching across LF or simulated Windows CRLF; 31 named guards have baseline-green/original-regression-red evidence in each mode. All earlier S4.1 refusals, source-bound strict S3 and key-set agreement retained; no S3/S1/converter/other-format changes.

**Executed code head before documentation updates:** `62e5c81415e909c5bcba6726d4a1697bbebfeceb`, [S4.1 CI #41388819909](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41388819909) **SUCCESS** (reader **51/51**, LF mutants **31/31**, simulated-CRLF mutants **31/31** with 31 targeted RED_VERIFIED in each run; S4 **86/86**, S3 **13/13**, S1 **12/12**, admission **20/20**, sideload/enrichment exit 0). Earlier `5f700777` runs are SUPERSEDED. This checkpoint edit changes the head, so the final SHA and the **final-head exact checkout CI** are recorded in the latest [XCU #239 work_returned](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239). Simulated CRLF is Linux-run, not native Windows.

**NOT_RUN / HOLD:** Local full repo (GitHub DNS prevents checkout); top-level `npm test`; independent non-author reviewer; Owner original-file trial; S4.2, release and merge not authorized.

**NEXT → Oracle:** reconcile exact PR SHA, CI receipts, mutation kills and
source-bound refusal; commission independent non-author review.
Owner alone may authorize merge or S4.2.
