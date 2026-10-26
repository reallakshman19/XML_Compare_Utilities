# PR #176 — Node-Based Name Transfer F1 handover

**Task:** #189, Owner-directed bounded repair (2026-10-26).
**Current state:** F1 implementation committed; native regression and independent structural validation NOT_RUN; PR DRAFT / no merge.
**Pre-edit exact head:** `e973af8b249d4770ae766c8554ac71aba2de119c`.
**Supplemental backup branch:** `backup/cii-nodebased-pr176-f1-preimage-20261026`.

## Intent, authority and source tracing

Node number in TARGET0 is the only selector. `Find` is optional audit information, never a matching or approval predicate. Minimal CSV is `Node,Replace`. Old `Find,FindNode,ReplaceName` remains accepted.

UI flow: standalone VNext NODAL tab -> nodal-panel.js -> parseNodalCsv -> planNodalTransfer -> validateNodalTransfer -> separate TARGET1. Original code rejected Node,Replace because it required all three headings.

Owner's **protected core files**, which must not be changed: VNext app.js, physical.js, writer.js, config-policy.js, all Normal / LINE_NODE / GEOMETRY engines, other tabs, legacy production route, Writer2. HTML changes were limited to NODAL-specific labels/help.

## Exact F1 inventory

- NODAL parser: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js` and its `docs/` mirror. Supports optional Find and Node/FindNode/Replace/ReplaceName aliases, detects duplicate headings, rejects malformed row widths, handles BOM/reordered headings.
- NODAL-only import hint: `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-panel.js` and `docs/` mirror.
- NODAL markup only: `docs/cii-fnr-vnext.html` tab name and two-column instructions.
- New regression: `tests/cii-fnr-vnext-node-only-csv.test.mjs`.

Git blob equality: parser source=served `fed548f6e270b167e8a9fcc90a15cbd41bcc9cf7`; panel source=served `38e28c42105548d8e5352dd43043b008e4252aab`. Review current head for drift before using these values.

## Source qualification and validation

- A1 source trace established (tab, parser, planner, writer).
- A2 fail-before reproduced: `Node,Replace` triggers old header-required error. Isolated Node 22.16.0 gate reproduction.
- A3 matching identity remains numeric TARGET0 node only.
- A4 exact patched parser isolated JS checks: **14/14 PASS** for 2-column, legacy 3-column, informational Find, quoted/reordered/BOM, malformed input.
- A5 six-file narrow diff vs immutable PR preimage, no other-tab core touched.
- `node --test` native: NOT_RUN. Actual browser/real-CII/Hexagon importer: NOT_RUN. Independent reviewer and exact-head CI: NOT_RUN.

**Important recovery gap:** The connected GitHub write path had no runnable native checkout (local GitHub DNS failed). Repository-mandated pre-edit `node utils/backup.cjs save` and local history-independent `.agent-worklogs/` patch ledger were **NOT_RUN**. The backup Git branch is *additional preservation, not a substitute*. Do not claim F1 native engineering qualification until a qualified native builder reconciles/replays the changes under those requirements.

## Deferred F2 / release HOLD

Structural writer logic unchanged. Missing/terminal NODENAME section, pointer-zero safety, CII version widths and CONTROL counts, duplicate-name policies, shared pointers and common writer authority still need independently proven engineering repair. No merge, publication or replacement of the existing tile.

## F2-N0 bounded safety guard — 2026-10-26

**Owner restriction observed:** no other-tab core files edited. This batch changed NODAL-only `nodal-transfer.js` and its served mirror, plus the new `tests/cii-fnr-vnext-nodal-zero-guard.test.mjs`.

- Reproduced preimage defect: a physically present zero endpoint entered READY, and the writer inserted an unauthorized name record in an isolated synthetic v14 fixture.
- Repair: after numeric TARGET0 incidence resolution and before name proposal, canonical node `0` now returns HELD / `FINDNODE_ZERO_RESERVED`; padded `000` also canonicalizes to zero and HELDs. Unknown node 0 still gives existing NOT_IN_TARGET0 diagnostic. No writer logic or other-tab core changed.
- Exact source and served NODAL parser/writer blob match: `9c0a645dea7c1ee5f1bb6d2501f69cab596cf9e1`.
- Source-exact isolated synthetic test PASS: node 0 and 000 both HELD; node 285 READY, new-copy write yields two 285 name occurrences and zero ZERO-NAME occurrences; original fixture unchanged. Targeted regression file syntax PASS. These are not native repository or real CAESAR II qualifications.
- F2 preimage backup branch: `backup/cii-nodebased-pr176-f2-preimage-20261026`, at `18d8bede12c52b7d766ab1eefa0ee62b039210ab`. **Native `utils/backup.cjs`, `.agent-worklogs/`, full Node suite, original-CII, browser and independent review remain NOT_RUN** because GitHub cannot be resolved from local container and connector edits cannot execute the native backup step. A branch ref does not substitute.
- Remaining F2: absent/terminal NODENAME, version-qualified record width, CONTROL completeness, insertion-aware byte audit, shared pointer and collision semantics remain unchanged/held. Native builder must establish legitimate section placement and full evidence before any writer expansion.

## F2-SECTION bounded writer repair — 2026-10-26

**Original problem:** Nodal writer rejected an absent optional NODENAME section and also rejected a terminal NODENAME section, including no-insertion ordinary renames.

**Implemented exclusively in NODAL-owned code:** `nodal-transfer.js` and byte-equivalent `docs/` mirror. If NODENAME exists and is terminal, fixed-field edits can proceed without a following section marker; append new records at EOF only when the last NODENAME line has a recognized LF/CR/CRLF terminator. If NODENAME is absent and CONTROL.NONAM=0, insertion is permitted **only when BEND immediately follows ELEMENTS** in the parsed section order: insert `#$ NODENAME` with the existing line ending and approved records before BEND. Other section orders fail `NODAL_MISSING_NODENAME_ORDER_UNQUALIFIED`. Reparse checks the exact expected section addition, element/pointer integrity and NONAM. Preserve immutable TARGET0 and unrelated bytes.

**Evidence:** Dedicated `tests/cii-fnr-vnext-nodal-sections.test.mjs` (five tests). Isolated source-exact JS harness with synthetic CII fixtures and digest stub: **18/18 PASS** across original Nodal suite (8), F1 CSV suite (3), F2-N0 suite (2), F2-SECTION suite (5). Test for new section checks byte equality after removing insertion and ignoring only authorized CONTROL.NONAM and ELEMENTS pointer spans. Includes terminal rename with and without trailing newline, terminal new record creation, and order/line-ending negative cases. Source-exact harness is **not the native Node suite** and the digest stub is **not true SHA-256**.

**References:** Hexagon Auxiliary Element Data for NODENAME optionality and BEND section sequencing; Hexagon neutral file section-header description and CONTROL.NONAM. The public documentation describes an older A10 record width; current project parser uses V11/V14 53-character record slices. Physical V11/V14 version provenance and original-file compatibility remain unqualified; **never treat these synthetic outputs as approved CAESAR II imports.**

**Recovery and HOLD:** Preimage GitHub branch `backup/ciifr-pr176-nodename-sections-20261026` points to `76f3cd419a4efb6ac3696b528c41ecbec12fad65`. It is supplemental only. Native `utils/backup.cjs save`, history-independent `.agent-worklogs/`, actual `node --test`, browser, real original CII, native SHA checks, CAESAR II import/round-trip, external engineering oracle and independent non-author review: **NOT_RUN** (native checkout GitHub DNS unavailable). Other tabs' core code not modified; no shared `app.js`, `physical.js`, `writer.js`, `config-policy.js` or legacy tile changes. PR remains draft/merge HOLD.

**EXACT_NEXT_ACTION:** Qualified native builder must check out current PR #176 and its verified F2-SECTION preimage, restore the required native backup/patch-ledger custody for the scoped F1/F2 edits, run `node --test tests/cii-fnr-vnext-nodal-transfer.test.mjs tests/cii-fnr-vnext-node-only-csv.test.mjs tests/cii-fnr-vnext-nodal-zero-guard.test.mjs tests/cii-fnr-vnext-nodal-sections.test.mjs tests/cii-fnr-vnext-nodal-ui.test.mjs` and full VNext regressions, and bind representative original V11/V14 bytes/Hexagon import results. Then request separate non-author exact-head review before Owner merge decision. Continue to HOLD unqualified section orders rather than guessing or modifying any other-tab core.
