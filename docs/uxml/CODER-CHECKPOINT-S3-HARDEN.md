# CODER-CHECKPOINT · UXML-S3-HARDEN-SOURCE-STRUCTURE · coder-b4

**TASK:** XCU #239 · new [DRAFT PR #250](https://github.com/reallakshman19/XML_Compare_Utilities/pull/250)
on \`feat/uxml-s3-harden-source-structure-20261102\`, base pinned Owner
merged-main \`ee04cc9c3503ea8a21c683fdab1b85ece79cc443\`.
NO MERGE / NO FORCE.

**BOUNDARY:** Strict S3 \`mapCaesarInputXmlToUxmlStrict\` now performs a
single shared XML structural admission before legacy row extraction.
The S4.1 scanner is factored into
\`uxml/UxmlInputXmlSourceStructure.js\` and its byte-identical docs
mirror, used by S3 and S4.1. Ghost rows in comment/PI/CDATA/DOCTYPE,
missing/duplicate root/model, model-nondirect rows, malformed
attributes/tags, and post-root content refuse with named
\`INPUT_XML_SOURCE_STRUCTURE_REFUSED\` and no UXML. S3 valid-original
strict output is byte-identical to pinned main on accepted test fixtures.
S4.1 original behavior retained with new duplicate-attribute, raw \`<\`,
reserved \`<?xml-foo?>\` guards and kill tests.

**KNOWN COMPATIBILITY CHANGE:** Public GRE (100) and PLB314 (53) had
been admitted by pinned-main strict S3 but now refuse because each has
direct \`UNITS\` under PIPINGMODEL, outside the S4.1 shared envelope.
Not a general claim of malformed CAESAR XML. No S1, S4.0 converter,
other format, TopoFix/lane A, tolerances/CLOS, original source, or
writer custody changed.

**EXECUTION:** The exact-head Node 22 workflow runs S3 structural
adversarial and pinned-main byte-output parity tests, S3 and S4.1
mutation kills in LF + simulated-CRLF, S3/S4.1/S4.0/S1/admission,
ACCDB and enrichment; no continue-on-error. The
[latest work_returned on XCU #239](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239)
is authoritative for the **final SHA, exact-head run IDs, counts,
mutant list**; no earlier code head qualifies a docs commit.

**NOT_RUN / HOLD:** Local complete repo Node tests (coder container DNS
for GitHub), native Windows, raw top-level \`npm test\`, new
independent non-author review, Owner private original-file
trial, S4.2 writer, release and merge.

**NEXT → ORACLE:** Reconcile the pinned exact PR #250 SHA,
changed-file allowlist, byte-identical S3-output proof,
public GRE/PLB314 refusal and full mutation qualification.
Commission non-author exact-head independent review and preserve
DRAFT HOLD pending Owner merge authorization.
