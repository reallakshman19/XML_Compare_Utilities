# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main base | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR984 | CII M1 Spatial / M2 Network evidence separation | `agent/cii-m1-m2-evidence` | IMPLEMENTATION COMPLETE / FOCUSED VALIDATION PASS / FULL-CHECKOUT NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | stacked on PR983 `070ef903` | M1/M2 evidence + confidence/ranking + winner gap; no propagation | SAFE STACK on PR983/PR982 | keep draft; Phase 5 propagation in separate stacked PR |
| PR983 | CII benchmark oracle/preflight + truthful capability states | `agent/cii-oracle-capability-states` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / STACKED DRAFT | ENGINEERING_CRITICAL | stacked on PR982 `aacbcf9e` | CII intake capability publication + test-only benchmark oracle/preflight | SAFE STACK; PR984 depends on it | keep draft; execute full benchmark tests in qualified runner, then retarget after PR982 merge |
| PR982 | CII fixed-field ELEMENT parser qualification | `agent/cii-fixed-field-parser` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / DRAFT UNMERGED | ENGINEERING_CRITICAL | `ceb0c019` | fixed-field parser + benchmark regression | SAFE; PR983/PR984 depend on it | keep draft pending owner merge/review decision |
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | `b0f13c99` | historical CII Workspace V1 | HISTORICAL | none |

## PR984 GE-984-002 snapshot

Validated implementation head: `2cf30cb8df4e6540d73bd4649f4f42fcece59738`. Later commits update recovery/status records only.

- M1 Spatial uses Euclidean midpoint distance; 90/90/90 mm => ~155.9 mm and fails the 100 mm default tolerance.
- M2 Network uses structural topology/neighbourhood/path evidence; OD/WT are removed from topology tokens.
- OD and wall are independent ±10% supporting evidence with weights 30/30; identity weight is 50.
- M1 FAIL + M2 PASS produces MEDIUM confidence; MEDIUM remains workflow REVIEW until engineer approval.
- Both identity methods failing produces score=0/rankingScore=0 even if dimensions match.
- M1/M2 selecting different targets produces `METHOD_A_B_DISAGREE` / REVIEW.
- Candidate confidence and ranking are separated: repeated-network focused case retains confidence 100 for both candidates but M2/ranking discriminates correct 90.0/95.0 from wrong 84.8/92.4.
- Branch topology and rigid-kind contradictions remain hard conflicts.
- Focused reconstructed Node execution passes M1/M2, gang winner-gap, alignment semantics and hard-conflict slices. Literal current-head repository test commands remain `NOT_RUN` because a complete authenticated checkout is unavailable in this environment.
- Stacked diff contains 11 intended files; no parser, converter, propagation, transfer, Revision Compare or model-converter edits.

See `agents/PR984_workreport.md`, `agents/status/PR984.yaml`, and `agents/claims/PR984.yaml`.

## PR983 GE-983-002 snapshot

PR983 publishes truthful CII capability states and a test-only benchmark oracle/preflight. Unsupported/unparsed Hanger/SIF/general Weight/Line-number families remain `count:null`; numbering offsets are non-authoritative hints. Real all-three-file benchmark execution remains `NOT_RUN` in the current environment.

See `agents/PR983_workreport.md`, `agents/status/PR983.yaml`, and `agents/claims/PR983.yaml`.

## PR982 GE-982-001 snapshot

PR982 fixes canonical CAESAR II fixed-field ELEMENT parsing using widths `[15,13,13,13,13,13]`. SOURCE `255→260` is independently decoded as `DX=0`, `DY=-0.000488281`, `DZ=-271.602`, `OD=60.3`. Literal repository test execution remains `NOT_RUN` in the current environment.

See `agents/PR982_workreport.md`, `agents/status/PR982.yaml`, and `agents/claims/PR982.yaml`.

## PR981 historical snapshot

PR981 is merged. Its historical validation and limitations remain in `agents/PR981_workreport.md`. Stage06 target mutation remains `NOT_IMPLEMENTED`/blocked in the current product authority chain.
