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

**Historical pre-repair implementation head `2ed146ca8da9bfa0415cb648298be4adfaa60bc4` (Node 22; SUPERSEDED for repair qualification):** [S4.1 workflow #41380460259](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41380460259) SUCCESS: reader 20/20, isolated mutants 9/9 with nine RED_VERIFIED targeted failures, S4 86/86, S3 13/13, S1 12/12, admission 20/20; ACCDB and enrichment each exit 0. [ISO #41380460385](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41380460385) SUCCESS. Repair round 1 closes the malformed PLB314 physical-record array hole,
refuses a source-bound failed UXML gate, checks simultaneous bytes/text
representations, ignores fake review markers inside CDATA, and adds
per-refusal + reorder + S3-key parity + mutation regressions. **The old
runs do not qualify this repair**: XCU #239 work_returned must give
the exact repaired head and the associated green job logs.

**NOT_RUN / HOLD:** Local full repo (GitHub DNS prevents checkout); top-level `npm test`; independent non-author reviewer; Owner original-file trial; S4.2, release and merge not authorized.

**NEXT → Oracle:** reconcile exact PR SHA, CI receipts, mutation kills and
source-bound refusal; commission independent non-author review.
Owner alone may authorize merge or S4.2.
