# PR #235 — ISO XML large-input and audit connector visibility

**Mission:** Repair the apparent "XML not loaded" after ISO template and make automatically found exact identity links visible without granting a transfer approval. Owner observation dated 2026-10-29. No confidential original S1/S2 files accessible in this task.

**Authority/ownership:** Branch `fix/iso-xml-large-preview-readonly-links-20261029`, base `main` 9acc89ac87c0fdb3cd221739221477daadefbecc, PR https://github.com/reallakshman19/XML_Compare_Utilities/pull/235. **MERGE_AUTHORITY = OWNER_ONLY**. Engineering identity and approval invariants unchanged.

**A1 Production trace:** Table template loader `tabs/xml-compare-table-categorized-runtime.js:loadIsoNoteTemplate` only assigns S1 and S2 table roles, source parsing and profile. The XML Compare import state retains XML and detect says `categorized-inputxml`. `XmlCompareTabView.js` renders *empty* textarea if text >400,000 chars. `XmlCompareIsoNoteDirectCompare.js:renderIsoNoteMappingCompareHtml` renders all 3,600+ rows in one pass. `linkExactIsoNotePairs` already creates 7 read-only `isoNoteAuditLinks`, independent of `approvedMatchSet` but UI lacked a detailed display.

**A2 Isolated symptom:** two visible detected filenames plus seven matched correspondences show that underlying XML is present at least for comparison. Missing textarea contents are a display issue; unbounded rendered table risks blocking interactivity. The exact behavior on private original files is still NOT_RUN.

**A3 Authority:** Exact same normalized pipeline + complete support identity only; 43 identity-review rows remain unapproved; no automatic property transfer; read-only evidence links not true approved connectors. No auto canvas mutations, matcher edits, or geometry changes.

**A4 Validation:** New `tests/xml-compare-iso-note-large-ui.test.js` checks 3,600 synthetic report rows bounded at 120, exact matches/reviews prioritized, full CSV unaffected, 410,000+ XML only truncated in DOM and full size reported, and read-only link evidence cannot produce approval controls. Added to `test:xml`. Tests: CI RUNNING at PR allocation, focused local Node NOT_RUN (GitHub-only connection), independent original-attachment acceptance NOT_RUN.

**A5 Minimal patch:** Pure HTML preview only, capped table rendering, auditable evidence table and tests; docs counterparts mirrored and blob hashes checked.

## Changed-file ledger
- `xml-compare/XmlCompareIsoNoteDirectCompare.js` — cap displayed rows at 120, prioritize matches/reviews, leave serialized CSV full length
- `docs/xml-compare/XmlCompareIsoNoteDirectCompare.js` — byte-identical mirror
- `xml-compare/XmlCompareTabView.js` — display meaningful large XML preview and source-linked audit connectors
- `docs/xml-compare/XmlCompareTabView.js` — byte-identical mirror
- `tests/xml-compare-iso-note-large-ui.test.js` — behavior and nonapproval regressions
- `package.json` — include test in existing XML suite
- `agents/WIP-iso-xml-preview-20261029_workreport.md` — pre-change grounding
- this PR report — current recovery source.

**Local backups and patch ledger:** GitHub connector-only work does not provide checkout-local `utils/backup.cjs save` or untracked `.agent-worklogs`. Neither was run; this is a repository process gap. Baseline SHA, individual GitHub content SHA and PR diff preserve source-version history but are **not claimed as equivalent** to local backup compliance.

**Highest risk and falsifier:** A heavy *actual* ISO XML may still cause an issue within the underlying categorized parser or browser canvas, which this UI patch does not prove solved. Validate via original-byte, real-browser production smoke after review; if loaded records count is zero, investigate reader separately. No engineering PASS from synthetic tests.

**EXACT_NEXT_ACTION:** Check current PR head, qualified CI jobs and diff; repair any failing test on the same branch. Then obtain independent review / Owner merge authorization. Do not merge automatically.
