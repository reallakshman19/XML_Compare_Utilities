# WIP-optionb-h3-20261028 — Immutable dataset and comparison snapshots

**Work:** Option B H3 versioned source fingerprints and deterministic finding lineage.
**Status:** IN_PROGRESS — planned before product mutation. **Merge authority:** NOT GRANTED.
**Authority:** Read-only takeover completed; independent repository source/PR review, Appendix A check below. **Decision:** CONTINUE isolated phase.
**Base:** main `b82e58101c45dc80a5b919a828661a87962edfcc` (checked 2026-10-28).
**Branch:** `fix/option-b-h3-snapshot-lineage-20261028`.
**Coordination:** PR214 is DRAFT and owns approval/reducer `tabs/xml-compare-tab.js`, `XmlCompareIsoNoteDirectCompare.js`, `package.json`, etc.; **no changes to those files**. PR216 H6 is merged. PR213 is documentation-only. Scope classification SAFE for files below, COORDINATION_REQUIRED for architecture integration after PR214.

## Planned
- Add dependency-free browser/Node synchronous SHA-256 from UTF-8 string with independent known FIPS fixtures.
- Add pure immutable `DatasetSnapshot.v1` and `ComparisonSnapshot.v1` contracts, with explicit source roles, raw source text held only in memory, SHA-256 fingerprints over UTF-8 *loaded XML text*, parser/rule/policy versions, config digest and canonical sorted metadata.
- Use snapshot identity in active Tab 3 ISO audit JSON; do not copy raw XML into exported snapshot metadata.
- Add independent logical finding key and snapshot-specific finding instance ID to audit findings and append CSV columns, preserving existing headings and `findingId` for compatibility.
- Validate same input/versions -> same IDs regardless of re-render; one changed input/config/version -> changed instance ID; logical key stable for same engineering entity across changed source snapshots; original row references intact; frozen report and audit.
- Keep non-ISO Rev Compare unchanged and audit read-only. Do not touch transferred XML or approval state.

## Appendix A qualification (5 x 20)
A1 Production trace **19**: `workspaceFromState` creates ISO audit in Tab 3, `createIsoNoteRevCompareAudit` calls `compareIsoNoteMapping` and `buildIsoNoteEngineeringFindings`; JSON export emits report/findings, CSV exporter currently re-builds findings without snapshot context. Repeated render recomputes, but snapshot metadata can be deterministic without changing controller.
A2 Failure isolation **20**: existing `findingId` is source ref + target ref + type; identical reference IDs may collide across extracts; no content fingerprint/versioned comparison ID. Falsifier: same data with changed parser/policy has same instance identity, or row reordering changes logical entity identity.
A3 Authority/invariants **20**: H3 deterministic snapshot IDs, no permissions or transfer authority, original raw source/refs preserved, SHA256 cryptographic custody of loaded UTF-8 text, versioned declared inputs, no claim of original binary upload custody.
A4 Independent validation **18**: SHA-256 known ASCII, Unicode and empty vectors from SHA standard/Node; two-run and one-byte perturbation; shuffled row order logical key stable; unchanged generic JSON/CSV fallback and read-only status. Local runtime verification plus CI, real upload UI NOT_RUN until next phase.
A5 Minimal patch **19**: new `XmlCompareSha256.js`, new `XmlCompareAuditSnapshotModel.js`, `rev-compare/rev-compare-iso-note-mode.js` and `XmlCompareIsoNoteEngineeringFindings.js` plus docs mirrors and existing `tests/xml-compare-rev-iso-note-engineering-mode.test.js`; no overlap with #214. Total **96/100**, each >=17.

## Validation / limits
- Repo/PR and code baseline: PASS (source inspection).
- New SHA, snapshot and JS tests: NOT_RUN at planning checkpoint.
- Full XML/table/browser: NOT_RUN at planning checkpoint.
- Original data replay: NOT_RUN in this isolated phase.
- Local `utils/backup.cjs` and ignored `.agent-worklogs`: NOT_AVAILABLE in connector-only GitHub edit workflow; use preedit file blob SHA, commit recovery ledger; do not claim formal local backups exist.

## Recovery / exact next action
Fetch precise blob SHA and text of selected H3 files, implement new pure hash/snapshot service, integrate only dedicated ISO audit mode/findings, qualify tests and CI, open new review PR. Do not merge; coordinate subsequent PR214 integration and UI E2E. Keep current blob SHAs and file-specific patches in PR report.
