# WIP — CII v14 Find & Replace padded logical Find + visible scroll

## Mission

Owner report on 2026-09-04:

- rebase CII v14 Find & Replace onto current main;
- explain/fix `FIXED_WIDTH_LENGTH_MISMATCH:25:6` seen in the editable Preview;
- add/restore a visible vertical scrollbar on the editor table.

## Basis / custody

- Repository: `reallaksh19/XML_Compare_Utilities`
- Branch: `fix/ciifr-padded-find-scroll-v14`
- Exact base: `main@0245adf3329433009900f446d14faa22c454b6e6`
- Open overlapping Find & Replace PRs: none found before branch creation.
- FORCE/FORCMNT remains de-scoped/fail-closed.
- TARGET0 overwrite remains prohibited.
- Writer1/Writer2 remain outside Find & Replace.

## RCA hypothesis

Current `smartDocumentQualifiedFieldPlan()` compares qualified NODENAME semantic text as `span.semanticValue.trim() === findText`. If the editor/Excel input carries the physical fixed-width Find text including trailing padding (25 bytes), the semantic side is trimmed while the editor side is not. A valid qualified NODENAME therefore fails smart recognition and falls through to the generic unequal-length blocker, producing `FIXED_WIDTH_LENGTH_MISMATCH:25:6`.

Falsifier: if an exact retained/synthetic qualified NODENAME with padded Find input still cannot be claimed after normalizing only the smart semantic comparison, do not widen generic DOCUMENT matching.

## Scroll hypothesis

Current CSS already contains a fixed-height `.ciifr-sheet-wrap` with `overflow-y: scroll`, but the Find & Replace stylesheet URL is still pinned to `?v=20260903-scroll-state-2`. The current browser report is consistent with stale stylesheet lineage or overlay-scrollbar behavior. This leg will keep the fixed viewport, make the scroll contract explicit in focused tests, and advance the stylesheet cache token so current Pages/runtime loads the intended scrollbar CSS.

## Validation plan

1. Add focused padded-NODENAME smart-field regression.
2. Preserve existing smart numeric ambiguity/fail-closed behavior.
3. Run focused smart-field / editor / scroll UI tests from exact branch source when possible.
4. Keep full repository/browser acceptance truth separate; do not promote NOT_RUN.

## Environment limitation

This connector-only substrate cannot execute repository-local `utils/backup.cjs` or maintain `.agent-worklogs/` as a local checkout would. Preimage Git blob SHAs and GitHub branch history are the durable custody record for this leg.
