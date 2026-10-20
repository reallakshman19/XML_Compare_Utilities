# WIP-I126-A01 — Original-byte Method C candidate review prototype

**Owner authorization:** "proceed fix" after Owner-facing prototype request [Issue #126 comment #6269726896](https://github.com/reallakshman19/XML_Compare_Utilities/issues/126#issuecomment-6269726896). Deliver an A-ONLY *testable* prototype. Source-first takeover and Appendix A 1–5 completed at PR136 head; CONTINUE with narrowly scoped UI work, not B/C engineering authority.

**Base:** draft PR136 exact `0a0f28ab5d4932f1412815c8c69e1c16445aee9f`. `main` separate `9a5916f972af170f272c525907728237391b7ca8`. Parent #127 Method C source, PR #107 distinct draft modifies tabs multisource-writer2-ui.js but NOT Method C writer2-bridge; no edit to existing review consumer or Writer2 mutator. New branch `i126/a-only-candidate-review-prototype-20261020`, PR to be opened DRAFT against PR136 branch. Unreleased stack preserved, no merge.

## Owner problem / output

Actual original S1/T user screen shows 57 Method C A geometry rows, no next step despite useful candidates and "Input required" parent status. User must be able to select and investigate rows 4060/4970, annotate INVESTIGATE / REJECT / EVIDENCE_REQUESTED, export exact original evidence, and see physical B pending / Transfer disabled. No synthetic TARGET, BOUND or Writer2 Apply. Keep all original 57 statuses, including 41 near-node, 5 segment-only and 11 outside; use these as observed diagnostic counts, not physical certifier oracle.

## Source trace (5 Appendix A)

- A1 Producer: `docs/.../cii-workspace-method-c-writer2-bridge.js` builds original graphs, discovers one-anchor geometric pose, candidates, immutable A sidecar, calls `review.innerHTML=methodCAReviewMarkup(sidecar)`, switches compare tab; `getEvidence()` exposes A only. `docs/.../cii-workspace-method-c-a-review-markup.js` renders 57 inert rows.
- A2 Failure: no next review UI, no disposition controls/download, parent `Input required` depends on independent `selection.inspection`; Method C A does not set parent readiness, correctly.
- A3 Invariant: A-only flags in `cii-workspace-method-c-a-sidecar.js`: zero `qualifiedPhysicalIdentityCount`, `writerEligible=false`, `applyAuthorized=false`; original 4060 segment-only; Owner B policy absent; no overwrite of correspondence/Method A/B/BM001/transfer. PR107 separate tabs multi-source writer.
- A4 Falsifier: user can click real Next and annotate without mutating A sidecar; export includes every row + original SHA/epoch/pose/dispositions but zero B; old input changes/cancel/export attempt cannot resurrect old evidence; actual native Chromium uses authentic four original files. Synthetic unit tests separated from real browser.
- A5 Minimal: add a new pure review-and-export module mirrored to `tabs/` and `docs/`; edit only existing Method C Writer2 bridge mirrors to mount/reset controller and provide Next action; add new regression tests and task-scoped workflow for actual backup / binary selective undo / original browser. No edits to `multisource-writer2-ui.js`, `tab.js`, Method C registration/candidate policy, Python, fixtures or PR107-owned file.

**Before any existing bridge modification:** in a full checkout on this branch, run `node utils/backup.cjs save` for both original `docs/tabs/cii-workspace/cii-workspace-method-c-writer2-bridge.js` and `tabs/cii-workspace/cii-workspace-method-c-writer2-bridge.js`. Original both Git blobs `8ea39d62f230e5fef13bff5f67bc0f7047e66313`. Preserve real bytes, SHA256, backup ID/plan log as private CI artifact; `.agent-worklogs/i126-a01-20261020` created pre-edit with manifest. Later no-index patches from saved preimage and SHA-constrained undo. Do not imply job success without logs.

## Plan and status

| Module | Planned | Status | Real evidence |
|---|---|---|---|
| Real preedit custody | preserve both existing bridge files | PENDING | NOT_RUN |
| Candidate review state | bounded statuses + immutable A-only receipt | PENDING | NOT_RUN |
| Native UI hook | Next action, interactive details/notes/filters/dispositions/download | PENDING | NOT_RUN |
| Browser + unit tests | real S1/S2/S3/T, 4060, 4970, original custody, stale cancellation, zero Write | PENDING | NOT_RUN |
| Draft PR + selective undo | back up, verify original/modified exact hashes | PENDING | NOT_RUN |

**Exact next:** run preedit-binary-custody CI *before* editing existing bridge; then implement via new module and small bounded bridge integration; revalidate exact head and report. `METHOD_C_B=NOT_AUTHORIZED`, `WRITER2_APPLY=NOT_AUTHORIZED`, `P2=NOT_DONE`, `RELEASE=HOLD`.
