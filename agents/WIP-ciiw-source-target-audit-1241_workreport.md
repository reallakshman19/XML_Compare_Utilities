# WIP — CII Writer2 complete Source→Target correspondence audit (#1241)

## Recovery header

- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1241`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL / AUDIT_SURFACE
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `STACKED_ON`: draft PR #1240 exact head `8eb2685a0c6d401d22e266b0abf5dfa6918bbd96`
- `BRANCH`: `feat/cii-writer2-source-target-audit-1241`
- `PR_STATE`: NOT_CREATED_YET

## Handover in 60 seconds

Issue #1241 adds the missing source-first correspondence census to retained multi-source Writer2. Compare Review currently starts from emitted correspondence rows, so it cannot tell the user which SOURCE nodes were never emitted. This slice must enumerate SOURCE custody first and left-join correspondence/review output onto that inventory.

It is intentionally stacked after #1240 so the audit can consume corrected evidence-qualified review fields when available. It must not change correspondence algorithms or writer authority.

## Product contract

For each S1/S2/S3 source node, produce exactly one census row containing:

- source member/node/name;
- emitted correspondence row count;
- all target node IDs/names observed for that source node;
- `BOUND` / `REVIEW` / `UNRESOLVED` / `UNEMITTED` classification;
- confidence/workflow/authority/evidence-basis/decision/change-family summaries;
- stable audit row ID.

If more than one correspondence row claims a source node, preserve all target/evidence values in the one source-node census row and make multiplicity visible; do not silently choose a winner.

Complete CSV/JSON exports are required. UI may cap visible rows only if the cap is explicit and exports remain complete.

## SOURCE census authority

The preview exposes `sourceDocument`. For retained CII piping nodes, source-node custody will be derived deterministically from:

1. every `from` / `to` endpoint in `sourceDocument.parsed.elements`;
2. every explicit `sourceDocument.nodeNames` key, unioned to avoid dropping named endpoints not seen through a malformed/partial element list.

This is a source-document census, not a reconstruction from correspondence rows.

## Benchmark boundary

`TEXPECTED-PARTIALLLYDONE.CII` remains test/validation-only known-positive authority. No production import, fetch, hard-coded target list, or matcher feedback is permitted.

A later validation step may feed the new audit model/export to the existing independent T→TEXPECTED oracle to report known-positive coverage. It must never use TEXPECTED to create correspondence or Writer2 operations.

## Planned files

Production:

- new `tabs/cii-workspace/cii-workspace-multisource-correspondence-audit.js` — pure census/model/export/markup helpers;
- `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` — retained UI wiring + dedicated export actions only.

Tests:

- pure audit-model/export regression;
- lightweight registration/UI contract test if needed.

Protected: matching/geometry, Writer1C/Writer2, bridge/projector, Benchmark files, workflows, deployment, persistence.

## Coordination

- #1240 is intentional stack dependency and changes Compare Review projection/UI only.
- #1234 changes anchor search/source-set/filter-shell paths and does not overlap the planned pure audit module; source-set semantics remain an upstream dependency.

## Validation ledger

| Gate | Status | Notes |
|---|---|---|
| source issue/spec | PASS | #1241 |
| stack base exactness | PASS | #1240 head `8eb2685a...` |
| source-document census seam identified | PASS | preview exposes `sourceDocument.parsed.elements` and `nodeNames` |
| production mutation | NOT_STARTED | pure module first |
| focused execution | NOT_RUN | pending implementation |
| benchmark reconciliation | NOT_RUN | test-only follow-on; no production TEXPECTED import |

## Environment limitation

Authenticated GitHub mutation is available, but a full authenticated local checkout is not. Do not claim repository-local backup/worklog artifacts that cannot be produced. Use this report + Git history as remote recovery evidence; any checkout-capable successor must establish required local backup ledger before further local edits.

## EXACT_NEXT_ACTION

Implement the pure source-first audit model/export with synthetic N>K coverage tests before wiring retained Writer2 UI.