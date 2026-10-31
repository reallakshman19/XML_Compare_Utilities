# WIP-iso-connector-lane-20261029 — actual read-only connector lane
**Owner issue:** After PR #235 merged and deployed, ISO Compare says 7 exact matches / 7 audit links but central Connector workspace still shows no connection. This is not fixed by an evidence table outside the connector lane.

**Start/main:** main a7d062f44bdd9c52f465e9b12c61648da31077b2, PR #235 merged at 2026-10-29T10:43Z, latest Deploy GitHub Pages for that SHA succeeded. Open PRs checked: no competing XML Compare UI lane changes. New branch `fix/iso-audit-connector-lane-20261029`.

**Authority:** READ_ONLY until trace/qualification; decision CONTINUE for pure UI projection; do NOT change approval scope, S1/S2 XML parser, exact matching, approvedMatchSet, transfer, or engineering semantics. No original confidential XML provided. Under repository AGENTS.md owner-only merge.

**A1 production trace:** `tabs/xml-compare-tab.js:linkExactIsoNotePairs` creates `isoNoteAuditLinks` with seven verified source/target UIDs. `XmlCompareTabView.js` currently renders them in separate table, but invokes `renderXmlCompareWorkspaceShellHtml(workspace)` without the audit link object. The WorkspaceShell builds the central connector lane with manual state only; `XmlCompareGraphConnectorLane.js:renderXmlCompareGraphConnectorLaneHtml` displays approval counts/pending and no automatic ISO connectors. Thus exact identities never reach the actual lane.

**A2 falsifier:** prove lane output contains 0 ISO connection elements with seven link objects in tab state. New test must fail before fix and pass afterward. Confirm 7 read-only edges, 0 approvals, no transfer actions and no generic unqualified auto-connectors. With no exact link or invalid provenance, lane empty.

**A3 invariants:** Match only same normalized pipeline and full support ID upstream. ISO links are `readOnly:true`, `disposition:IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED`. Frontend draws no approval actions; never populates `manualConnectors` or `approvedMatchSet`. Do not suggest compliance of gaps/restraints: all seven remain REVIEW.

**A4 independent validation:** In-repository Node regression for full TabView->WorkspaceShell->GraphConnectorLane path plus existing manual-only connectors test, XML suites, qualified CI, docs parity. Private-file deployed smoke test NOT_RUN.

**A5 surgical patch plan:** pass `isoNoteAuditLinks` from TabView to Shell without changing model; render seven visual source→target SVG connections as read-only in central connector lane. Keep generic automatic approved suggestions disabled; separate count from zero approved. Edit production and docs copies and a focused test, no runtime state mutation.

**Backup/ledger blocker:** only GitHub app access; local backup command and .agent-worklogs patches cannot run against repository checkout. Do not mark them complete. Exact SHA preimages and reviewed PR diff exist, but do not replace local rule.

**Exact next action:** implement UI wiring and tests, run GitHub CI, leave PR unmerged for owner.

**Owner amendment (2026-10-29T10:50Z):** Revamp confusing XML Compare UI; user reports identical file appearance in Source and Target. Scope expanded **before product file edits**: clarify dual-slot role, large XML preview, combined ISO source/target same-content notice, and read-only exact link lane visualization. Include per-side clear actions and advanced controls disclosure; preserve file-handoff data contracts. Updated plan remains a single coherent import-and-connector usability assignment; no change to matching or authorization. No unverified claim that distinct file byte matching is wrong: combined partitioned ISO XML is allowed by existing comparator.

**A1 addendum:** Import `XmlCompareTabView.importSection` currently renders both XMLs as always-visible textarea and topology settings, which obscures file identity. `IsoNoteDualSourceProfile` generates one combined `IsoNoteXml` with `PS_MAPPING_S1` and `ISO_NOTES_S2` partitions. Presenting this same artifact on both sides can be intentional, but the UI lacks explanation. Root solution is clear role/status and read-only lane connections; do not force arbitrary deduplication.

**A2 addendum falsifiers:** The import panel must report same-file combined ISO honestly, generic identical content as a warning, preserve two independent file inputs, preserve actual text fields, and allow independent clearing that resets stale audit links. The central lane must show exactly 7 links if valid read-only evidence and zero transfer approvals.
