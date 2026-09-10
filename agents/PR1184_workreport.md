# PR1184 Work Report

## Mission
Implement issue #1181 `CSV Rev Compare (XML Based)` so flat CSV/table revisions are converted through the governed Table-to-Categorized-XML authority, compared in categorized XML/graph form, projected into typed revision events, and exported back to Support Report CSV/XLSX with machine-auditable provenance.

## Current delivery state
- PR: #1184 (draft)
- Branch: `issue-1181-csv-rev-compare-xml-v2`
- Chain: `CSV-REV-COMPARE-1181`
- Active endpoint: `EP-CSVRC-0005`
- Main last reconciled: `a84e8258704d86c0454b813d720b975165076002`
- Merge authority: OWNER_ONLY; merge authorized FALSE
- Completed material legs: LEG-001 conversion foundation, LEG-002 lineage/topology, LEG-003 event/remark engine, LEG-004 operational comparison/export
- Current next leg: LEG-005 Utilities UI workflow/installer

## Authority and invariants
1. CSV/table is ingress/egress only. No direct CSV-vs-CSV comparison authority.
2. Existing Table-to-Categorized-XML parser/profile/graph/export contracts remain the conversion authority.
3. Persistent primary-support reference is strongest component identity where available; member suffix is not physical identity.
4. Common-support replication/consolidation comes from structural graph evidence, not duplicate row text.
5. Raw coordinate text cannot prove relocation before frame normalization.
6. Human remarks are projections of typed events only; target benchmark remarks are never comparison evidence.
7. Hold automation is excluded.
8. Ambiguous lineage remains review-blocking until explicitly resolved.
9. UI may display/review engine evidence but may not create a second engineering decision path.

## Current implementation
### LEG-001
- Generic aligned many-per-row and duplicate-column-series support inside the existing categorizer authority.
- Governed `support-revision-csv-xml/v1` profile.
- Independent REV1/REV2 table-to-categorized-XML conversion with schema diagnostics.

### LEG-002
- Categorized-graph-derived support semantic model.
- Semantic pipe parsing and coordinate-frame normalization.
- Existing XML Compare candidate-pair primitive reuse plus persistent-reference-first scoring.
- DETERMINISTIC / LIKELY / AMBIGUOUS / NO_MATCH candidates.
- 1->1, 1->N, N->1, N->M lineage and explicit common-support clusters.

### LEG-003
- Versioned duplicate-column load-vector policy.
- Typed event ledger for components, loads, structural changes, ambiguity and suppressed audit-only fields.
- Deterministic `SUPPORT_REV_REMARKS_V1` renderer; Hold automation absent and target remarks excluded from evidence.

### LEG-004
- Explicit approve/reject resolver for ambiguous candidate pairs; invalid review actions fail closed.
- Canonical `runSupportRevisionCompare()` orchestration.
- REV2-style CSV output retaining duplicate headings by ordinal plus policy-required REV1 tombstone/replacement rows.
- Comparison audit JSON, REV1/REV2 categorized XML, REV1/REV2 graph JSON and profile JSON.
- XLSX sheets `Rev Compare`, `Rev Compare Audit`, `Lineage`, and `Remark Trace`; audit matrices include raw/normalized state, lineage/candidate evidence and cell-level trace material.

## Current hypothesis / falsifier
Hypothesis: LEG-005 can remain a pure presentation/review shell around the existing engine: dual inputs, conversion diagnostics, candidate review, lineage/event/remark previews and export actions.

Falsifier: if the UI needs to compare CSV cells, score candidates, infer common support, decide relocation, construct events, or synthesize remark text itself, the design has crossed the authority boundary and UI work must stop.

## Base drift / rebase status
Current main advanced 22 commits from the chain merge base to `a84e8258704d86c0454b813d720b975165076002`. The inspected drift is confined to Support Report typicality/relationship-builder workflow, modules/config and tests. No exact overlap was found with `tabs/csv-rev-compare/**`, `xml-compare/table-categorizer/**`, `xml-compare/XmlCompareCandidatePairModel.js`, `tabs/revision-compare/**`, or `tabs/psnm-utility-tab.js`. Current Support Report XLSX authority was re-read and remains compatible with the LEG-004 SheetJS contract. Rebase was not required for LEG-004. Re-ground current main again before changing existing Utilities/UI authority.

## Validation truth
- LEG-001 validation: NOT_RUN
- LEG-002 validation: NOT_RUN
- LEG-003 validation: NOT_RUN
- LEG-004 validation: NOT_RUN
- Owner raw REV1/REV2 benchmark: UNRESOLVED / NOT_RUN

Focused tests are committed for each completed leg, but current execution infrastructure cannot obtain a local checkout because raw network/DNS access to github.com is unavailable. No PASS claim is made. This also prevents repository-local `utils/backup.cjs` and `.agent-worklogs` generation in this session; the limitation is recorded in LEG-004 rather than treated as compliant evidence.

## Changed-file ledger
Canonical receipts:
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-001.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-002.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-003.md`
- `agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-004.md`

## Reviews / checks
- PR remains draft.
- Mergeability was TRUE at last reconciliation.
- No review threads were identified at the last inspection.
- Executed test/check evidence remains NOT_RUN.

## Highest current risk
LEG-005 must touch existing Utilities registration/UI authority while current main is moving. Live main/PR and installer patterns must be re-grounded before any such mutation. UI must not duplicate comparison decisions already owned by the XML-domain engine.

## Exact work location
Next work is limited to the new CSV Rev Compare UI module, `tabs/psnm-utility-tab.js` registration, focused UI tests, and delivery-state artifacts. Existing generic `Revision compare` behavior is protected.

## EXACT_NEXT_ACTION
Re-ground current `main`, PR #1184 merge base/drift, `tabs/psnm-utility-tab.js`, and existing Utilities installer/revision-compare UI patterns. If coordination is safe, implement LEG-005 staged Utilities UI as a pure consumer of `runSupportRevisionCompare()` and export APIs; preserve explicit ambiguous-lineage review and do not merge.
