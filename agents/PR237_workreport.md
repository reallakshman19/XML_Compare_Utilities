# PR #237 — Target S2 ISO items loaded but hidden by default hierarchy

**Governing workstream:** XML Compare Utilities → Progress Page XML-Compare Ad Hoc. Governing WBS revision/step not yet verified from Progress Page (NOT_RUN; do not create a second WBS).
**Owner bug report:** 2026-10-29T11:48Z. Source A and Target B both show categorized-inputxml `table_to_categorized_*.xml`, 4,139,197 characters each. They are the same combined ISO XML, yet Target S2 appears unloaded.

**Authority:** Started READ_ONLY; independently inspected merged PR #236 and current main before CONTINUE for presentation/selection-only patch. Native project `reallakshman19/XML_Compare_Utilities`. Baseline main SHA `70c17f7c2ed05c490de6998b5f73e9cdf0a5749a`. PR https://github.com/reallakshman19/XML_Compare_Utilities/pull/237, branch `fix/iso-s2-canvas-visibility-20261029`. No competing open PR exact-file claims found at takeover. OWNER_ONLY merge.

**A1 Production trace:** `XmlCompareWorkspaceModel.sideModel` parses whole combined XML to `baseRecords` (S1 and S2 `element` rows plus two `lineBlock` partition headers). Default `XmlCompareCanvasLevelModel.pickLevel` chooses `lineBlock` when `node` is missing. The merged PR #236 `scopeIsoDisplaySide` filtered only default view `data.records`, showing a single partition container rather than actual S2 rows. Search in `tabs/xml-compare-tab.js:recordsForSide` used global/unscoped view records, inconsistent with displayed partition. `compareIsoNoteMapping` and `linkExactIsoNotePairs` already parse S2 elements from `baseRecords` and can find 7 exact audit identity links; they do not assert gap/restraint compliance.

**A2 Failure isolation:** synthetic `IsoNoteXml` has 2 PS items + 3 ISO items: source/target default workspace each has two partition containers; before patch a scoped right panel showed only 1 lineBlock. After patch default right panel shows 3 S2 item rows, exact selected level `element`, matched selection lookup, and an explicit S2 loaded count. Missing S2 produces 0 and a diagnostic, never a fake S1 fallback.

**A3 Authority:** Strict original source parsing and normalized pipeline+full support ID matching unchanged; reviewed/ambiguous identities not converted to matches; no `approvedMatchSet`, `MatchDecision`, connector-transfer action, target XML write, export change, or geometry rules added. Both file inputs are retained unchanged. ISO S1 and S2 record projection and lookup are view/selection operations only. Read-only audit connections remain separate from transfer approvals.

**A4 Validation:** The first two CI runs for this branch FAILed on syntax errors in a *new test only* (bad static regex then bad negative-fixture regex). Fixed by explicit substring assertion and deterministic string slices; no implementation or independent engineering expected-value change to turn red green. At `fc7a1c87721689370ce424254b3825fc4dc84a34`, `XML and Table full Node suites` SUCCESS, ISO engineering browser regression RUNNING at inspection. New integrated regression in `tests/xml-compare-iso-connector-lane-ui.test.js` checks real parser→workspace→UI count (2 S1,3 S2), selection lookup, explicit lineBlock option, absent S2, no approval, original source model unchanged. Source and docs copies same SHA per write; perform final parity readback. Confidential original 4.139MB XML test NOT_RUN; deployed Pages smoke NOT_RUN; independent physical engineering adjudication NOT_RUN.

**A5 Changed-file ledger:**
- `xml-compare/XmlCompareWorkspaceShell.js` and `docs/xml-compare/XmlCompareWorkspaceShell.js`: canonical `baseRecords` source-scoped count, prefer element display with explicit-level preservation, compact read-only preview and missing-partition warning, row picker selection accurate by scope.
- `xml-compare/XmlCompareTabView.js` and `docs/xml-compare/XmlCompareTabView.js`: pass detected combined ISO mode and explicit hierarchy selections to shell *before* pressing Compare.
- `tabs/xml-compare-tab.js` and `docs/tabs/xml-compare-tab.js`: select records from same canonical S1/S2 partition and level the UI displays.
- `tabs/xml-compare-tab.css` and `docs/tabs/xml-compare-tab.css`: visible per-partition record readiness and preview.
- `tests/xml-compare-iso-connector-lane-ui.test.js`: parser-to-workspace full vertical fixture, target selection, negative missing partition.
- `agents/WIP-iso-s2-canvas-visibility-20261029_workreport.md` + this report: recovery and next step.

**Limitations / repository process:** Connected GitHub-only execution cannot run local backup command (`node utils/backup.cjs save`) or local `.agent-worklogs/` patch ledger. They are NOT_RUN. Baseline SHA and immutable GitHub commits are trace evidence, not an alternative assertion of local process compliance. Real original S2 bytes not exposed to this session.

**Highest risk:** Huge real combined XML can still be expensive to parse on each redraw; fixing default hierarchy projection does not independently prove browser responsiveness with original 4.14MB dataset. Confirm actual S2 count, access by support ID, and seven read-only identity links on deployed original in owner trial. Do not interpret seven identity matches as transfer approvals or gap/restraint PASS.

**EXACT_NEXT_ACTION:** Read CI on latest PR HEAD after this report. Repair only any failing source/test issues; verify production/docs SHA parity. Leave PR in draft/unmerged for Owner authorization. Following merge/deploy, run original-byte browser trial for Target S2 count and individual support selection.
