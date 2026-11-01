# CODER-CHECKPOINT · UXML-S4.0-CONVERTER-AUDIT

**Role:** coder-b2 · **Mode:** READ_ONLY_AUDIT · **Owner approval:** 1 Nov 2026 18:59 Asia/Muscat. Oracle source pin: XML_Compare_Utilities main commit **3051ea171f966ac611f232982e0b1cc0774ba368** (XCU #240–#244 merged). New audit branch **audit/uxml-s4-0-converter-20261101** and DRAFT [PR #247](https://github.com/reallakshman19/XML_Compare_Utilities/pull/247), base main; **NO MERGE**.

## Scope and evidence

- **Only audit files:** docs/uxml/S4.0-CONVERTER-AUDIT.md; tests/s4-0-audit-converter.test.mjs; tests/s4-0-audit-workspace.test.mjs; .github/workflows/uxml-s4-0-converter-audit.yml; this checkpoint. No converter, reader, mapper, detector, uxml/, TopoFix or screen files edited.
- **Directed tests:** node --test tests/s4-0-audit-*.test.mjs. The tests contain named S4-F (forward), S4-D (reverse with OriginalDocument), S4-N (reverse without OriginalDocument), S4-MARKER-STAGE1/2 (nine markers each), S4-EXT-MULTIBRANCH, S4-PUBLIC-GRE-PLB314, S4-N-DERIVED, S4-N-HEADER-LOSS, S4-STAGE2-FORMAT and S4-ENRICH-DETECT. Every matrix facet has its named proof; **PASS can demonstrate a loss, not preservation**.
- **Fixtures:** generated synthetic InputXML, the existing public docs/GREInputxml.xml and docs/PLB314Inputxml.xml. No private source content, Owner names, hashes, Windows paths or CAD records in the audit return.
- **CI:** [workflow](https://github.com/reallakshman19/XML_Compare_Utilities/actions/workflows/uxml-s4-0-converter-audit.yml) executes named audit tests plus extant S3 reader and Workspace sideload regressions. Verify the **final exact PR head and run outcome**, and report any failed tests accurately; nothing queued/running counts as PASS.
- **Source findings:** OriginalElement is a trimmed CDATA snapshot; normal forward has no OriginalDocument. Reverse with OriginalDocument is an identity bypass (except lexical nested CDATA hazard). Without it the converter rebuilds a minimal CAESARII/PIPINGMODEL header and copies original fragments plus globally-deduped external blocks. Derived block edits do not reach original element attributes; comment/entity/BOM/CRLF/attribute order are mixed/lost by facet. Details and S4.1/S4.2 requirements are in the audit tables.
- **Workspace:** Stage 1 CleanXML is a new projection. Stage 2 actual InputXML enrichment can replace LINE_ID, FROM_NAME, TO_NAME, restraint TAG and add coordinate attrs, changing edited attribute quoting; it does **not** synthesize PipingClass, Rating, DTXR_POS/PS or MaterialNumber/Name. Stage 3 5C passes its own generated InputXML into Tab 2 (no auto-mutation by handoff). Stage 4 categorized produces view blocks and original snapshots. "Enriched" is detector metadata, not a new file profile.
- **Independent review / source writer / S4.1 / S4.2 / Owner original-file validation / merge:** NOT_RUN; all release and engineering-interpretation HOLDs unchanged.

## Fresh-agent resume

1. Read the **latest** XCU issue #239 work_returned ORACLE-CYCLE-RECEIPT and TopoFix issue #12 cross-link for exact PR head, CI link, test counts and known limitations.
2. Verify PR #247 is still DRAFT on new audit branch based on main **3051ea17**, diff confined to documentation/tests/CI. Check that no product code was accidentally modified.
3. If CI is not green, do not claim audit DONE or S4.x release. Repair **only test expectations/audit wording** that are demonstrably inaccurate against pinned code. Do not change converter behavior in this assignment. Independent review must be by a separate non-author agent.
4. NEXT → TopoFix/XCU Oracle: reconcile evidence, commission independent read-only reviewer, then ask Owner to accept audit before authorizing separate S4.1 Categorized→UXML and S4.2 Categorized patch-back implementation. No agent self-merges.
