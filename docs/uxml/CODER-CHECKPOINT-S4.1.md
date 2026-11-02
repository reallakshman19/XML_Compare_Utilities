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

**NARROW FINAL SOURCE-AGREEMENT ROUND:** Same PR branch, no merge or force. Physical PIPINGELEMENT parents require actual parent closing tags or self-closing opening; a self-closing child does not suffice; opening/closing counts are checked. On an original-bound read the unchanged S3 strict reader must accept the same original, and its complete sourceRef recordKey set must equal S4.1 exactly. S3 throws → `CATEGORIZED_ORIGINAL_S3_REFUSED` with `s3Code` and `uxml:null`; S3 keys mismatch → `CATEGORIZED_S3_KEY_MISMATCH` and `uxml:null`. No-original evidence-only path remains unchanged; no writer authority. Adversarial tests include unclosed middle row, child-tag illusion, comment-hidden record and fault-injected strict S3 key disagreement; the gate seam is CRLF-safe on Windows and input-provenance mutants cover ORIGINAL_ENCODING and originalBytes/text conflict.

**Last executed implementation head before this docs commit:** `631743b49be94b30e812d2ce22775456764583cc`, [S4.1 CI #41385577015](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41385577015) **SUCCESS** (reader 35/35, mutants 21/21 with 21 targeted RED_VERIFIED, S4 86/86, S3 13/13, S1 12/12, topo admission 20/20, sideload and enrichment exit 0). This is a source-head checkpoint, **not final-head qualification** after docs updates. [S4.1 workflow](https://github.com/reallakshman19/XML_Compare_Utilities/actions/workflows/uxml-s4-1-categorized-reader.yml) runs against exact PR SHA; the final **head + exact run IDs** must appear in the latest [XCU #239 work_returned](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239). Earlier `9206e9f3` CI is SUPERSEDED. Independent review still NOT_RUN.

**NOT_RUN / HOLD:** Local full repo (GitHub DNS prevents checkout); top-level `npm test`; independent non-author reviewer; Owner original-file trial; S4.2, release and merge not authorized.

**NEXT → Oracle:** reconcile exact PR SHA, CI receipts, mutation kills and
source-bound refusal; commission independent non-author review.
Owner alone may authorize merge or S4.2.
