# WIP-iso-xml-preview-20261029 — ISO XML visibility and read-only identity connectors

**Owner observation:** On **Load ISO Note Template**, the XML Compare screen reports 7 exact S1/S2 matches and categorized-inputxml filenames, yet the user cannot see the XML and expects connector auto-configuration. Context: actual 2,778 S1 / 819 S2 records; 43 identities need review. Input bytes are not attached to this task.

**Authority and takeover:** READ_ONLY completed before production edits. A1 traced XML Compare UI and template loader; A2 isolated full 3,600-row rendering and the 400,000-char textarea erasure; A3 engineering exact composite identity must never become transfer approval; A4 identified stable renderer and red/green focused tests; A5 smallest patch is bounded UI rendering, honest large XML preview, and visible read-only audit identity links. Decision: CONTINUE for presentation-only code. No engineering semantics, XML parser, match policy, connector approvals or transfer APIs will change.

**Native source:** https://github.com/reallakshman19/XML_Compare_Utilities/ ; comparison code `xml-compare/XmlCompareIsoNoteDirectCompare.js`, tab renderer `xml-compare/XmlCompareTabView.js`, existing audit links `xml-compare/XmlCompareIsoNoteAuditIdentityLinks.js`.

**Baseline:** `main` 9acc89ac87c0fdb3cd221739221477daadefbecc; branch `fix/iso-xml-large-preview-readonly-links-20261029`; open PRs checked on 2026-10-29: active CIIFR & PS Mapping tasks do not claim these two UI files; older XML Compare documentation PR #213 remains open but is independent. Protected original S1/S2 not in this context.

**Scope:** (1) cap visible results at 120 prioritized exact match / review rows, retaining all data in CSV and audit; (2) show truncated, explicitly read-only preview for loaded large XML instead of a blank textarea; (3) show exact ISO identity links as a read-only connector-evidence table, not a transfer or approval control; (4) regression tests; (5) production/docs parity.

**Local ledger and backups:** Connector-only GitHub execution cannot run the local `node utils/backup.cjs save` command or maintain a local untracked `.agent-worklogs/` directory in the target checkout. This is a **documented tooling gap**, not a claim of completion. GitHub blob SHA readback, baseline file versions and commit diff provide non-destructive traceability. Do not claim local backup/ledger compliance.

**Evidence/validation:** Source trace PASS (implementation-coupled); pre-change code inspection PASS (implementation-coupled). Browser reproduction on original private S1/S2 NOT_RUN. New focused tests and CI pending; independent engineering approval NOT_RUN. Source-state tests cannot prove production acceptance.

**Risk:** If the users mean automatic creation of approved connectors, that must remain blocked; audit identities are source-only evidence. Original XML cannot be verified against the private files here. No auto-transfer.

**Changed-file ledger (planned):** `xml-compare/XmlCompareIsoNoteDirectCompare.js`, `docs/xml-compare/XmlCompareIsoNoteDirectCompare.js`, `xml-compare/XmlCompareTabView.js`, `docs/xml-compare/XmlCompareTabView.js`, `tests/xml-compare-iso-note-large-ui.test.js`, this report.

**EXACT_NEXT_ACTION:** Implement scoped UI bounded rendering, large input visibility, and source-linked audit links; add targeted test; review diff and run CI; keep PR unmerged until Owner approval.
