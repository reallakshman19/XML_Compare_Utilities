# PR1184 Work Report

## Mission
Implement issue #1181 `CSV Rev Compare (XML Based)` so flat CSV/table revisions are converted through the governed Table-to-Categorized-XML authority, compared in categorized XML/graph form, projected into typed revision events, and exported back to Support Report CSV/XLSX with machine-auditable provenance.

## Current delivery state
- PR: #1184 (draft)
- Branch: `issue-1181-csv-rev-compare-xml-v2`
- Chain: `CSV-REV-COMPARE-1181`
- Active endpoint: `EP-CSVRC-0006`
- Main last reconciled: `a84e8258704d86c0454b813d720b975165076002`
- Merge authority: OWNER_ONLY; merge authorized FALSE
- Completed material legs: LEG-001 conversion foundation, LEG-002 lineage/topology, LEG-003 event/remark engine, LEG-004 operational comparison/export, LEG-005 Utilities staged UI
- Next leg: LEG-006 final benchmark/regression qualification and PR hardening

## Authority and invariants
1. CSV/table is ingress/egress only. No direct CSV-vs-CSV comparison authority.
2. Existing Table-to-Categorized-XML parser/profile/graph/export contracts remain the conversion authority.
3. Persistent primary-support reference is strongest component identity where available; member suffix is not physical identity.
4. Common-support replication/consolidation comes from structural graph evidence, not duplicate row text.
5. Raw coordinate text cannot prove relocation before frame normalization.
6. Human remarks are projections of typed events only; target benchmark remarks are never comparison evidence.
7. Hold automation is excluded.
8. Ambiguous lineage remains review-blocking until explicitly resolved.
9. UI displays/reviews engine evidence but does not compare CSV cells or classify engineering events.

## Current implementation
### LEG-001 — governed conversion
- Existing source parser remains sole CSV/table parser.
- Generic aligned `many-per-row` evidence and non-truncating mismatch diagnostics.
- Stable duplicate-column series and governed `support-revision-csv-xml/v1` profile.
- Independent REV1/REV2 categorized graph/XML conversion.

### LEG-002 — XML lineage
- Categorized-graph-derived support semantic model.
- Semantic pipe parsing and coordinate-frame normalization.
- Existing XML Compare candidate primitive reuse.
- DETERMINISTIC / LIKELY / AMBIGUOUS / NO_MATCH candidate evidence.
- Persistent-reference-first identity, 1->1/1->N/N->1/N->M lineage and common-support clusters.

### LEG-003 — events / remarks
- Versioned repeated-column load-vector policy.
- Typed event ledger for component, family, pipe, common-support, load, ambiguity and suppressed audit-only changes.
- Deterministic `SUPPORT_REV_REMARKS_V1`; target remarks non-evidence; Hold automation absent.

### LEG-004 — operational output
- Review resolver and `runSupportRevisionCompare()` orchestration.
- REV2-style output retaining duplicate headings by ordinal plus policy-required REV1 tombstones/replacements.
- Comparison audit JSON, both XMLs, both graphs and profile JSON.
- XLSX `Rev Compare`, `Rev Compare Audit`, `Lineage`, `Remark Trace` sheets with raw/normalized/candidate/cell evidence.

### LEG-005 — Utilities workflow
- Separate `CSV Rev Compare (XML Based)` installer entry beside generic Revision Compare.
- Independent earlier/later file and paste inputs.
- Explicit 17-stage workflow visualization.
- Conversion diagnostics, lineage/frame/common-support summary, structured events and revision preview.
- Candidate ambiguity approve/reject review.
- N->M common-support structural ambiguity accept/reject review; accepted transitions remain `LIKELY` and are audited `REVIEWED_ACCEPTED`, never relabelled deterministic.
- CSV/XLSX fail closed until review resolves; machine audit/XML/graph/profile artifacts remain available after successful conversion.

## Current hypothesis / falsifier
Hypothesis: the remaining work is qualification/hardening rather than architectural expansion. The committed engine should satisfy the owner-listed benchmark and negative-control behaviors when executed against current repository dependencies.

Falsifier: any executed focused or regression test shows parser provenance loss, duplicate-heading collapse, direct-row-order dependency, incorrect persistent-reference lineage, raw coordinate format causing relocation, target remarks influencing truth, unresolved review permitting final export, or generic Revision Compare regression. Such a result requires a bounded defect fix before PR readiness.

## Base drift / rebase status
Current main is `a84e8258704d86c0454b813d720b975165076002`. The 22-commit drift from the chain merge base was inspected as Support Report typicality/relationship-builder work. `tabs/psnm-utility-tab.js` was byte-identical on main and the PR branch immediately before LEG-005, so the one-line installer registration had a clean pre-image. Rebase was not required for LEG-005. Re-ground again before LEG-006 and before any ready-for-review transition.

## Validation truth
- LEG-001 validation: NOT_RUN
- LEG-002 validation: NOT_RUN
- LEG-003 validation: NOT_RUN
- LEG-004 validation: NOT_RUN
- LEG-005 validation: NOT_RUN
- Owner raw REV1/REV2 benchmark: UNRESOLVED / NOT_RUN

Focused tests are committed for all material legs, but this session cannot obtain a local checkout because raw network/DNS access to github.com is unavailable. No PASS claim is made. This also prevents repository-local `utils/backup.cjs` and `.agent-worklogs` generation. Existing-file edits retain GitHub blob SHA pre-images, but the local backup/worklog requirement remains a documented qualification deficit to address on an executable checkout.

## Changed-file ledger
Canonical receipts:
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-001.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-002.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-003.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-004.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-005.md`

LEG-005 production delta from EP-0005: new `csv-rev-compare-tab.js` (248 lines), `csv-rev-compare-ui-model.js` (93), `csv-rev-compare.css`; bounded edits to `support-revision-review.js`, `support-revision-events.js`, and one installer row in `tabs/psnm-utility-tab.js`; focused `csv-rev-compare-ui.test.js`.

## Reviews / checks
- PR remains draft and unmerged.
- GitHub reported mergeable TRUE at last reconciliation.
- No review threads were present at last inspection.
- Executed test/check evidence remains NOT_RUN.

## Highest current risk
Final qualification has not executed, and the owner raw benchmark remains unavailable. Structural N->M review was added during UI integration and needs direct execution plus regression coverage before the PR can be considered review-ready.

## Exact work location
LEG-006 is qualification/hardening only: run focused issue tests, relevant categorizer/XML Compare/Revision Compare/Utilities regressions and browser smoke where supported; inspect current main drift; fix only demonstrated defects; update the benchmark matrix and PR control plane. No merge.

## EXACT_NEXT_ACTION
Re-ground current `main`, PR #1184 drift/checks/reviews, and executable validation availability. If an executable checkout is available, run the focused #1181 test set first, then relevant regression suites and browser smoke. Use owner raw REV1/REV2 benchmark if it becomes available. Do not weaken tolerances/oracles and do not merge without Owner authority.
