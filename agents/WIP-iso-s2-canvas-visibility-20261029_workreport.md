# WIP-iso-s2-canvas-visibility-20261029 — Target S2 loaded but not surfaced
**Owner observation:** 2026-10-29T11:48Z. ISO template reports Source A and Target B both with 4,139,197 characters, detected categorized-inputxml. Same combined ISO XML notice is shown, but **Target: S2 looks unloaded** in the Source–Target workspace. No protected original bytes available to this agent.

**Live baseline:** main 70c17f7c2ed05c490de6998b5f73e9cdf0a5749a, prior PR #236 merged 2026-10-29T11:29:24Z. No open PRs claim these XML Compare source/target view files in present filtered PR inventory. Branch fix/iso-s2-canvas-visibility-20261029.

**Authority:** READ_ONLY → CONTINUE for UI-only representation and display/selection alignment after A1–A5 source tracing. Owner-only merge. No matching engine, XML parser, geometry, transfer, or approval semantics changes.

**A1 Production trace:** `XmlCompareWorkspaceModel.sideModel` builds `baseRecords` (the full ISO records) and a default `levelView` (typically `lineBlock`), then `records` reflects that active level. The ISO DirectCompare parser and `linkExactIsoNotePairs` inspect `baseRecords` and find S2 elements, but `XmlCompareWorkspaceShell.scopeIsoDisplaySide` filters only the *current* `data.records` (and each level), not the element rows needed by the user. The UI can therefore present **one partition summary** (or zero records on an incompatible selection) instead of hundreds of S2 `IsoItem` elements, despite a valid 4.14MB import. `sideCard` reports only current-level record count, not ISO item count. `tabs/xml-compare-tab.recordsForSide` returns the **unscoped** original workspace records, which may be a different level or partition than the projected display.

**A2 Failure hypothesis/falsifier:** Given a real-shape tiny `IsoNoteXml` with two partition groups and multiple `IsoItem` children, the default workspace projection shows lineBlock 1 rather than S2 elements >1, and UI selection cannot resolve a synthetic S2 `IsoItem` through current-level workspace records. Prove this with a focused test before/after. Protected original page test NOT_RUN.

**A3 Protected invariants:** S1 PS Mapping and S2 ISO Notes are distinct source-scoped partitions even within identical combined XML. Don't silently discard or relabel entries; show precise S1 and S2 element counts grounded in parsed `baseRecords`. Existing exact normalized pipeline+full support identity rule and 7 read-only edges remain untouched; 43 identity reviews and all gaps/restraints remain reviews. No automatic transfer / MatchDecision / approvedMatchSet writes.

**A4 Validation plan:** Real-shape synthetic `IsoNoteXml` with 2 S1 and 3 S2, validate source+target default element projection, selected-level behavior, zero partition diagnostic, and click record lookup returning same `IsoItem` UIDs as projection. All XML/Table/ISO browser CI, production/docs parity. Browser original-byte NOT_RUN, independent physical engineering approval NOT_RUN.

**A5 Minimal patch plan:** `scopeIsoDisplaySide` prefer element level when no explicit level selection and scope from canonical levelProfile/baseRecords, project available options and partition counts into both cards. Align `recordsForSide` with same partition and active display level when read-only audit is present (view/selection only). No mutation of shared data/engineering authority. Add targeted tests to existing `test:xml`; update production/docs counterparts, handoff.

**Tool gap:** Only connected GitHub edits here. Cannot run checkout-local backup command or maintain local `.agent-worklogs`; do not claim these checks. Exact baseline SHA and commits trace changes but do not substitute for local safety process.

**EXACT_NEXT_ACTION:** Implement paired UI projection & selection and regressions on branch; run CI, inspect failures, open owner-only draft PR.
