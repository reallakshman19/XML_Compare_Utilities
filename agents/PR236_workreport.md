# PR #236 — ISO XML Source/Target workflow and visible connector lane

**Governing project:** XML Compare Utilities, XML-Compare Ad Hoc workstream in reallakshman19/progress-page. Exact WBS revision/step: NOT LOCATED in this GitHub-only implementation session; no new parallel WBS created. Next Oracle/Owner reconcile with governing Progress/WBS before asserting delivery completion.

**Owner aim (2026-10-29):** Combined ISO `IsoNoteXml` appears as the same file in Source and Target and the screen is confusing. ISO audit reports 7 exact identity matches / 7 read-only identity links, but central connector lane has none. Distinguish S1 vs S2 and draw actual read-only source→target identity links; no automatic engineering property transfer.

**Repository & PR:** `reallakshman19/XML_Compare_Utilities`, https://github.com/reallakshman19/XML_Compare_Utilities/pull/236, draft; initial main/base `a7d062f44bdd9c52f465e9b12c61648da31077b2` (PR #235 previously merged and Pages deployed). Branch `fix/iso-audit-connector-lane-20261029`. Owner-only merge.

**Source trace (A1):** The Table Categorizer's ISO template may output a single `IsoNoteXml` with two static partitions, PS_MAPPING_S1 and ISO_NOTES_S2. The XML tab's `compare-iso-note-mapping` calls `compareIsoNoteMapping` and `linkExactIsoNotePairs`, yielding read-only `isoNoteAuditLinks` with real Source/Target record UIDs; however the TabView did not pass these into the WorkspaceShell/GraphConnectorLane and only rendered a detached evidence table. The central lane initially rendered manual connectors and approval counts. A full XML upload could be stored in both slots without a role distinction and appeared duplicated.

**Failure isolation (A2):** The seven read-only links exist and are valid source->target evidence, but there was no visual connector lane projection. The user isn't demanding automatic transfer approval. Combined XML in both slots may be intentional, so duplicate bytes must be explained rather than silently rejected. For ordinary identical XML, warn rather than assume different datasets.

**Authority (A3):** Explicit `readOnly === true`, disposition `IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED`, nonempty sourceUid, targetUid, normalized pipeline and full support identity required before visual arrow. This is display, not a new MatchDecision, ApprovedMatchSet, transferred target or engineering compliance. All seven gap and restraint checks remain REVIEW; 43 identity reviews untouched. Identity algorithm and source parser unchanged.

**Implementation (A5):**
- `xml-compare/XmlCompareTabView.js` and `docs/xml-compare/XmlCompareTabView.js`: input cards, filename/size/schema & proper S1/S2 ISO role, same combined XML explanation or generic identical warning, collapsible XML preview and advanced tolerances, distinct audit/topology actions, use existing toolbar; pass audit links to workspace shell.
- `xml-compare/XmlCompareGraphConnectorLane.js` and `docs/xml-compare/XmlCompareGraphConnectorLane.js`: show each verified read-only S1→S2 connection with SVG arrow, pipeline/support ID and S1/S2 provenance, separate count from approved transfers; no generic auto-candidate enablement.
- `xml-compare/XmlCompareWorkspaceShell.js` and `docs/xml-compare/XmlCompareWorkspaceShell.js`: lane forwarding; collapse manual anchors in ISO audit mode; present side pickers scoped to PS_MAPPING_S1 or ISO_NOTES_S2 **without changing original model data** or transfer authority.
- `tabs/xml-compare-tab.js` and `docs/tabs/xml-compare-tab.js`: independent Clear Source/Target action and stale comparison, audit-links, approval and transfer-state invalidation on reload, clear or paste.
- `tabs/xml-compare-tab.css` and `docs/tabs/xml-compare-tab.css`: responsive two-card import, scannable connector lane, advanced controls.
- `tests/xml-compare-iso-connector-lane-ui.test.js`: synthetic 7-link lane/count, invalid disposition reject, source/target roles, duplicate text, per-side clear, scoped side display, wiring and audit nonapproval.
- `package.json`: adds new test to `test:xml`.
- `agents/WIP-iso-connector-lane-20261029_workreport.md`: pre-change evidence and Owner amendment.

**Validation (A4):** Original seven identities reported by Owner, but protected S1/S2 original-byte imports: NOT_RUN. The first full XML/Table GitHub CI check on branch (head 61d6885...) FAILED because preexisting `xml-compare-iso-note-large-ui.test.js` expected 'Full XML loaded' and 'read-only preview' verbatim; source text changed to 'retained'. Restored explicit 'Full XML loaded and retained; read-only preview' wording on follow-on commits, without editing the existing test or weakening the oracle. Latest CI qualification after new scoped-side test: PENDING; read exact commit checks. All statements about correctness remain synthetic or implementation-coupled pending tests. Production browser smoke with confidential inputs NOT_RUN.

**Tool process boundary:** GitHub connector executes repository commits but cannot create checkout-local snapshots via `utils/backup.cjs save` or local `.agent-worklogs` artifact. These controls are NOT_RUN; GitHub pre-image SHA/diff/history preserve trackability only and do not substitute for required backups. No independent engineering review/fixture admission available.

**Risks:** (1) Source/Target slot content identical by design is not evidence of two independent revisions. (2) Frontend arrows are read-only identity relations, not approved links nor restraints/gap compliance. (3) Scope projection filters picker presentation only; actual compare and engineering rules operate on unmodified source data. (4) Browser responsive review and confidential original input test NOT_RUN until deploy/Owner trial.

**EXACT_NEXT_ACTION:** Check latest exact PR head GitHub full XML/Table Node suites, ISO browser and general browser, topology CI. Inspect failing job logs; repair only actual regressions. Verify all 5 production/docs pairs blob-identical. Leave PR #236 draft/unmerged until Owner accepts and authorizes merge; production smoke with original S1/S2 remains a separate final gate.
