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

**EXACT_NEXT_ACTION:** Native qualified builder checks out the current #176 head, recovers the preimage from the backup branch, reconciles this F1 diff through mandatory backup/patch-ledger procedure, runs focused and full VNext native regressions and independently source-qualifies structural changes before requesting non-author review.
