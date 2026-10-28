# PR217 — Option B H3 immutable source and comparison fingerprints

**WORK_INTENT:** IMPLEMENT · **CRITICALITY:** ENGINEERING_CRITICAL
**PR:** https://github.com/reallakshman19/XML_Compare_Utilities/pull/217
**BRANCH:** `fix/option-b-h3-snapshot-lineage-20261028`; baseline main `b82e58101c45dc80a5b919a828661a87962edfcc` (28 Oct).
**CURRENT STATE:** Product and test code committed; Node/Chromium CI PASS on `ad449ddfad36308c2b3e1c027a3d100985c81592`. Independent architecture review/merge pending.
**AUTHORITATIVE OUTCOME:** H3 scoped snapshot service and finding lineage implementation, *not* completed Option B program or deployed UI sign-off.
**MERGE_AUTHORITY:** NOT GRANTED by "fix it"; do not merge.

## Recovery first
Option B concept PR213 remains open documentation-only. PR214 remains DRAFT with H1/H2 central approval/reducer boundaries, no ownership overlap with this PR. PR216 H6 typed-gap changes merged on main at intake. This H3 PR has **zero changed-path overlap with PR214**, and must not be silently combined with P0 changes without requalification.

## Protected invariants
- Same UTF-8 **loaded text**, source role, parser version -> stable cryptographic dataset ID; one-byte/newline/role/parser-version change -> distinct ID. This does **not** assert identity of original binary-upload bytes.
- Same dataset IDs, adapter/policy/rule versions and canonical config -> stable comparison ID. Rule version changes must update the descriptor or custody is invalid.
- Finding `logicalFindingKey` ignores row reference and ordinal, preserving engineering subject lineage across reordering; `findingInstanceId` incorporates comparison ID and row occurrence so duplicates do not collide.
- Raw source texts stay in memory and do not appear in exported snapshot metadata. Existing original S1/S2 row references and raw engineering evidence still export in report/findings.
- Immutable report and finding arrays; repeat render/export yields the same provenance.
- No approval/transfer/geometry/target XML mutation. Non-ISO revision compare retains legacy behavior and exports.
- Existing CSV first 20 headers, `findingId` and report status semantics remain; new columns append only.

## Planned / did
1. `xml-compare/XmlCompareSha256.js` (+ identical `docs/`): SHA-256(TextEncoder.encode(loaded XML text)), dependency-free and synchronous for Node/Chromium, documented byte contract.
2. `xml-compare/XmlCompareAuditSnapshotModel.js` (+ `docs/`): `DatasetSnapshot.v1`, `ComparisonSnapshot.v1`, canonical JSON configuration digest, immutable report, public descriptor redaction, logical finding key and finding instance ID.
3. `xml-compare/XmlCompareIsoNoteEngineeringFindings.js` (+ `docs/`): optional context binds per-finding comparison ID/version; append four CSV lineage columns without disrupting old callers or headings.
4. `xml-compare/rev-compare/rev-compare-iso-note-mode.js` (+ `docs/`): attach source, target and comparison descriptors; export the same finding array to JSON and CSV.
5. `tests/xml-compare-rev-iso-note-engineering-mode.test.js`: independent Node crypto SHA vectors, deterministic same-input/policy replay, hash/role/config/version sensitivity, deep immutability, logical versus instance ID, no raw XML in descriptors, generic fallback.
6. `tests/browser/iso-composite-identity-audit.spec.mjs`: Chromium WebCrypto independent SHA custody cross-check, deterministic audit/CSV consistency, freeze and source descriptor redaction.

## CI qualification
GitHub Actions workflow `ISO Composite Identity Qualification`, run `40642322471`, exact code head `ad449ddfad36308c2b3e1c027a3d100985c81592`:
- XML scripted suite **PASS** except known stale startup build-stamp assertion from main, separately reported, not claimed as clean full suite.
- Full `npm run test:table` **PASS**.
- Chromium ISO engineering browser test **PASS**. This is a module-level browser audit, NOT a real click-through upload→Tab1→Tab3→export→Tab2 E2E.
- Source baseline/hash code test uses Node `createHash` and Chromium WebCrypto as independent oracles; synthetic ISO fixtures label `[SIMULATED]`. No original confidential engineering source rows are committed.
- Deployed Pages site, original-input full three-tab workflow, approved performance SLOs: **NOT_RUN**.

## Pre-edit blob and selective undo ledger
Existing files replaced under current GitHub blob-SHA preconditions. No compliant local `utils/backup.cjs` / ignored `.agent-worklogs` because connector-only environment; NOT_AVAILABLE. Preserve file-level immutable preimage blob below. Before any undo verify current blob and later edits. Do not reset/revert or overwrite unrelated work.

| File | Pre-edit blob | Post-edit blob | Undo |
|---|---|---|---|
| `xml-compare/XmlCompareIsoNoteEngineeringFindings.js` and `docs/` mirror | `1a5648b5a8d16f9f36ceb3493aa5a432a7a8a44b` | `42db88db42400b81b8dace3e7072b766626d845f` | selectively undo H3 lineage mapper and appended CSV columns |
| `xml-compare/rev-compare/rev-compare-iso-note-mode.js` and `docs/` mirror | `1f5322152f932ffcef99cd33c4953aa92aaf01bb` | `a729bef2f67c4790f6ebe44fc4be1c3ad2524938` | undo only dataset/comparison snapshot construction + metadata export |
| `tests/xml-compare-rev-iso-note-engineering-mode.test.js` | `868f9acea95a795ec5c494b0dcf9345e4d90010b` | `bed98a1bfa3859d36ff2ee9233c8db4856d00d9a` | selectively remove new custody assertions |
| `tests/browser/iso-composite-identity-audit.spec.mjs` | `83a46e8ac120414dfda66ecf34c969960b1c3c15` | `eecfb6b88e774fcf84727cca5841961eeaa3428e` | remove H3 WebCrypto/lineage checks |
| `xml-compare/XmlCompareSha256.js` + `docs/` | new | GitHub content blob current branch | delete only if current checksum matches and no downstream user |
| `xml-compare/XmlCompareAuditSnapshotModel.js` + `docs/` | new | GitHub content blob current branch | delete only if current checksum matches and no downstream user |

## Risk and follow-up
Highest residual risk: Tab 3 creates audit results on every render, so digest overhead and large-grid presentation require profiling and approved SLOs (Option B phase 4). Persisted snapshot schema consumers must review append-only CSV integration. Snapshot IDs represent loaded UTF-8 text and declared rule versions, not original binary byte custody. H1/H2 still rely on separate PR214 and H7 live workflow is not qualified.

**EXACT_NEXT_ACTION:** Independently review PR217 code / SHA vectors / H3 lineage contract; recheck exact head CI after report-only changes. Coordinate integration order with draft PR214; implement full three-tab E2E and performance/deployment smoke as next Option B bounded phase. Obtain explicit owner merge approval; no implicit merge.
