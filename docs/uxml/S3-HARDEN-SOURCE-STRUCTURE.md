# UXML S3 — Harden source-structure admission (2026-11-02)

## Owner authorization and exact boundary

Task: **UXML-S3-HARDEN-SOURCE-STRUCTURE** · XCU #239 · coder-b4 (lane B).
Owner authorized a narrowly scoped strict S3 behavior change **after** merging
S4.1 PR #249, whose merged main SHA is
`ee04cc9c3503ea8a21c683fdab1b85ece79cc443`.
This is a new **DRAFT** PR from that exact base; no writer, Apply, reverse
conversion, S4.2 patchback, other format, topology policy or merge authority.

### Shared source-structure contract

The merged S4.1 lexical XML pass is extracted, without a new dependency, into
`uxml/UxmlInputXmlSourceStructure.js`; its **byte-identical mirror** is
`docs/uxml/UxmlInputXmlSourceStructure.js`.
Both strict S3 (`mapCaesarInputXmlToUxmlStrict`) and the existing S4.1 reader
now call **the same scanner** before binding source records.

The parser performs **one lexical, balanced tree walk** of original InputXML;
it recognizes comments, processing instructions, CDATA and DOCTYPE lexical
ranges, without treating content within them as element records. It refuses
literal `<PIPINGELEMENT` inside those ranges, incomplete or mismatched
tags, duplicate attributes, or raw unescaped `<` in XML attribute values.
XML processing-instruction targets beginning with `xml` (case-insensitive,
including `<?xml-foo?>`) are reserved; only a correctly situated
`<?xml ...?>` declaration is allowed.

Source authority requires exactly **one CAESARII root** containing exactly
**one direct PIPINGMODEL**. Every PIPINGELEMENT must be a **direct
PIPINGMODEL child**, with its own completed closing tag or self-closing
opening. Physical row offsets and ordinals are extracted only from the
structure pass, and the strict S3 legacy tag extractor must resolve back to
**exactly those original physical raw rows**. After the CAESARII close,
only whitespace and comments are allowed. No comment, PI, CDATA or DOCTYPE
text may impersonate a source record, even when its bytes otherwise match a
legacy S3 recordKey.

On strict S3 source-structure failure, the reader **throws**
`INPUT_XML_SOURCE_STRUCTURE_REFUSED` before creating any UXML. The
caller must treat this as a named fail-closed refusal, not an unqualified
readiness result. S4.1 still returns its established
`CATEGORIZED_ORIGINAL_STRUCTURE_UNSUPPORTED` with `uxml:null`
for equivalent structural failures. No source bytes are changed and no
S3 recordKey is invented.

### Real public sample qualification and compatibility

**The public `docs/GREInputxml.xml` (100 original physical rows) and
`docs/PLB314Inputxml.xml` (53 rows) are now both explicitly refused** by
the strict source-bound S3 path: each has a direct `<UNITS>` child under
`<PIPINGMODEL>` after the physical element rows. That element is not
part of the strict S4.1-compatible source-record envelope. This is a
conservative compatibility narrowing, **not** a claim the samples are
invalid as general CAESAR InputXML. Pinned merged-main S3 accepted both;
the new refusal is deliberate, tested, and must not be silently relaxed
without an Owner decision. Other InputXML or legacy readers are untouched.

For originals **accepted by the shared source pass**, S3's returned
UXML must remain **byte-for-byte identical** to the merged-main S3
implementation, including sourceRefs, recordKeys, geometry/anchors,
ports, loss ledger and validation metadata. The immutable
`ee04cc9c...` main S3 source is loaded with
`git show ee04cc9c...:uxml/UxmlInputXmlSchemaMapper.js`
inside exact-head CI, its relative module imports resolved to the
unchanged current dependencies, then
`Buffer.from(JSON.stringify(newDoc))` is compared with
`Buffer.from(JSON.stringify(mainDoc))`.
The accepted fixtures cover synthetic unanchored runs, XML declaration,
trailing comment, and nested anchored/bend geometry. The test also
proves pinned-main acceptance of public GRE/PLB314 while the new
shared-envelope read refuses them. CI uses full Git history to ensure
the base source is the **exact SHA**, not a test substitute.

### Verification and mutation proof

Run under Node 22 on the exact PR head, with no continue-on-error:

- `node --test tests/uxml-s3-harden-source-structure.test.mjs`
- `node --test tests/uxml-s3-harden-mutants.test.mjs`
- `S3_MUTANT_COPY_CRLF=1 node --test tests/uxml-s3-harden-mutants.test.mjs`
- `node --test tests/uxml-s3-caesar-inputxml.test.mjs tests/uxml-s3-reconcile.test.mjs tests/uxml-s3-caesar-mutants.test.mjs`
- `node --test tests/uxml-s4-1-categorized-reader.test.mjs`
- `node --test tests/uxml-s4-1-mutants.test.mjs`
- `S4_MUTANT_COPY_CRLF=1 node --test tests/uxml-s4-1-mutants.test.mjs`
- `node --test tests/s4-0-audit-*.test.mjs`
- `node --test tests/uxml-psi116-s1.test.mjs tests/uxml-s1-followup-mutants.test.mjs`
- `node --test tests/inputxml-workspace-topo-admission.test.mjs`
- `node tests/inputxml-workspace-accdb-sideload.test.js`
- `node tests/xml-compare-enrichment-apply-preview.test.js`

Each mutant runs in a **disposable local copy** and is a kill only if
the baseline test first passes and the original targeted test fails
with the exact guard removed. Copying shared dependencies into the
existing S3/S4.1 mutation harnesses is necessary but grants no
production behavior change. The LF and simulated Windows-autocrlf
mutant runs are both **Linux CI execution**; they do not qualify a
native Windows operator trial.

The three S4.1 review gaps (duplicate attribute guard,
raw `<` in an XML attribute, `<?xml-foo?>` reserved PI)
have independent tests and kill mutants in the S4.1 suite, using
the same shared scanner. S4.1's existing source-equivalence rules and
failure codes are otherwise unchanged.

### Current execution custody

**Verified pre-documentation implementation head:**
`f96d9283289ec8e7da741fe4857b96ed857eb9ab`.
[S3 hardening CI #41391992700](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41391992700)
**SUCCESS**: 20/20 S3 structure + pinned-main byte-identity tests,
16/16 S3 LF mutants, 16/16 simulated-CRLF S3 mutants,
13/13 S3 regressions, 54/54 S4.1, 34/34 S4.1 LF mutants,
34/34 S4.1 simulated-CRLF mutants, 86/86 S4.0, 12/12 S1,
20/20 admission, both standalone sideload/enrichment exit 0.
[S4.1 CI #41391992610](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41391992610),
[existing S3 CI #41391992596](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41391992596),
and [ISO CI #41391992511](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41391992511)
also completed SUCCESS at that implementation head.
This docs edit changes the SHA; the final exact-head receipts must refer
to the later run against the final PR SHA, not this historical code head.


The final PR #250 SHA and exact-head Actions run IDs, executed
counts, baseline byte-identity proof and red mutants are recorded
in the [latest XCU #239 work_returned](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239).
This document's own commit changes the head SHA, so any earlier
implementation-run number cannot substitute for final-head CI.
**NOT_RUN until expressly returned:** local full XCU checkout,
native Windows trial, raw top-level `npm test`, independent
non-author review, Owner original-file acceptance, merge/release.
Keep PR DRAFT / HOLD; Owner alone decides merge.
