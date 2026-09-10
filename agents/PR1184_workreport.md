# PR1184 Work Report

## Mission
Implement issue #1181 `CSV Rev Compare (XML Based)` so flat CSV/table revisions are converted through the governed Table-to-Categorized-XML authority, compared in categorized XML/graph form, projected into typed revision events, and exported back to Support Report CSV/XLSX with machine-auditable provenance.

## Current delivery state
- PR: #1184 (draft)
- Branch: `issue-1181-csv-rev-compare-xml-v2`
- Chain: `CSV-REV-COMPARE-1181`
- Active endpoint: `EP-CSVRC-0004`
- Main last reconciled: `13e626b4c0b0922697640b6c6f0183acbc59b380`
- Merge authority: OWNER_ONLY; merge authorized FALSE
- Completed material legs: LEG-001 conversion foundation, LEG-002 lineage/topology, LEG-003 event/remark engine
- Current leg: LEG-004 operational comparison/export

## Authority and invariants
1. CSV/table is ingress/egress only. No direct CSV-vs-CSV comparison authority.
2. Existing Table-to-Categorized-XML parser/profile/graph/export contracts remain the conversion authority.
3. Persistent primary-support reference is strongest component identity where available; member suffix is not physical identity.
4. Common-support replication/consolidation comes from structural graph evidence, not duplicate row text.
5. Raw coordinate text cannot prove relocation before frame normalization.
6. Human remarks are projections of typed events only; target benchmark remarks are never comparison evidence.
7. Hold automation is excluded.
8. Ambiguous lineage remains review-blocking until explicitly resolved.

## Current hypothesis / falsifier
Hypothesis: a thin operational engine can compose the already-separated conversion, model, lineage, review, event and remark authorities, while a dedicated export adapter can project the later revision plus policy tombstones without introducing any new comparison logic.

Falsifier: if export or orchestration needs to inspect REV1/REV2 row values to decide engineering lineage/events, the boundary is wrong and LEG-004 must stop rather than introduce CSV comparison logic.

## LEG-004 plan
- Add explicit ambiguous-lineage review resolver needed by the operational engine.
- Add canonical `runSupportRevisionCompare()` orchestration.
- Add Support Report output-matrix/CSV projection preserving duplicate target headings by ordinal.
- Add comparison audit JSON plus REV1/REV2 categorized XML/graph/profile artifacts.
- Add XLSX workbook with `Rev Compare`, `Rev Compare Audit`, `Lineage`, and `Remark Trace` sheets using the repository SheetJS loading pattern.
- Add focused operational/export tests, including ambiguity export blocking and duplicate-column preservation.
- Do not add Utilities UI in this leg.

## Validation truth
Current environment cannot clone the repository because raw network DNS access is unavailable. Therefore local backup/worklog generation and Node execution are unavailable in this session. All newly authored tests remain `NOT_RUN` until execution evidence exists. GitHub connector inspection is the observation basis.

## Changed-file ledger
See the canonical material receipts under `agents/chains/CSV-REV-COMPARE-1181/material-legs/`. LEG-004 changes will be appended here at checkpoint.

## Reviews / checks
- Review threads: none observed at last reconciliation.
- GitHub workflow runs: none observed for the current PR head at last reconciliation.
- Validation: NOT_RUN.

## Highest current risk
Operational export must preserve duplicate Support Report headings and provenance while remaining a presentation layer; it must not become a second comparison authority.

## Exact work location
`tabs/csv-rev-compare/` and focused `tests/csv-rev-compare-*` files only for LEG-004, plus delivery-state artifacts.

## EXACT_NEXT_ACTION
Implement the new review resolver, engine orchestrator, export adapter and focused LEG-004 tests as new files; then inspect the resulting PR diff, record a material receipt/endpoint, and synchronize issue state. Do not begin Utilities UI in this leg.
