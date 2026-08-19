# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|
| PR986 | CII Compare Review + engineering deltas | `agent/cii-compare-review-deltas` | IMPLEMENTATION COMPLETE / EXACT FOCUSED PASS / FULL INTEGRATION NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | downstream deltas + Compare Review view/UI/export; no identity or transfer mutation | SAFE STACK on PR985/984/983/982 | keep draft; qualify geometry-delta coordinate basis and remaining property parsers before transfer expansion |
| PR985 | CII anchor-seeded network propagation | `agent/cii-anchor-propagation` | IMPLEMENTATION COMPLETE / FOCUSED PASS / FULL-CHECKOUT NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | one-anchor propagation + frontier assignment/custody | SAFE STACK on PR984/983/982 | keep draft; PR986 consumes correspondence read-only |
| PR984 | CII M1 Spatial / M2 Network evidence | `agent/cii-m1-m2-evidence` | IMPLEMENTATION COMPLETE / FOCUSED PASS / FULL-CHECKOUT NOT_RUN / STACKED DRAFT | ENGINEERING_CRITICAL | M1/M2 evidence + confidence/ranking | SAFE STACK | keep draft; endpoint-coordinate correction is authority |
| PR983 | capability states + benchmark oracle/preflight | `agent/cii-oracle-capability-states` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / STACKED DRAFT | ENGINEERING_CRITICAL | intake authority + test-only oracle | SAFE STACK | keep draft |
| PR982 | fixed-field ELEMENT parser | `agent/cii-fixed-field-parser` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / DRAFT | ENGINEERING_CRITICAL | fixed-field parser + regression | SAFE STACK | keep draft pending owner merge decision |
| PR981 | CII Workspace V1 | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 | ENGINEERING_CRITICAL | historical CII Workspace V1 | HISTORICAL | none |

## PR986 GE-986-002

Validated implementation head: `10f999c26368c08224e6efda0bc52e5bec96f39f`; later commits update recovery/status records only.

- Engineering deltas are generated only after identity is bound and have `identityMutationAuthority = NONE_READ_ONLY_DOWNSTREAM`.
- Qualified downstream comparisons include parsed location/vector/length, OD, wall, node name, exact numeric restraint codes/raw rows, partial P1/T1 evidence, and qualified RIGID mass custody.
- Restraint gap/friction semantics are intentionally not invented; Hanger/SIF/Line/general-weight capability gaps remain visible rather than becoming false zeros/unchanged values.
- Compare Review exposes independent M1/M2 evidence, OD/WT, winner gap, alternatives, confidence, workflow status, engineering changes, and Accept/Reject/Lock decisions.
- Candidate-set ambiguity projects to REVIEW even when the individual winner has HIGH evidence.
- The shell now presents the permanent `Inputs & Match Basis -> Compare Review -> Transfer Preview` top-level workflow; Stage06 remains disabled.
- Correspondence CSV now exports `confidence` separately from `workflowStatus` and includes engineering change count/families.
- Exact focused Node execution PASS after materialized file Git blob SHAs were verified against GitHub: engineering-delta separation, ambiguity projection, and CSV confidence/workflow separation.
- Full shell lifecycle, real SOURCE/TARGET1/TARGET2 end-to-end Compare Review, and Chromium visual validation remain `NOT_RUN`.
- Known geometry limit: node-location delta currently reports parsed native coordinate evidence and is not registration-normalized.

See `agents/PR986_workreport.md`, `agents/status/PR986.yaml`, and `agents/claims/PR986.yaml`.

## PR985 GE-985-002

Validated implementation head: `6e35a8997d6c2c4dcdc914b634d111277092f633`; later commits are recovery/status only.

- Production one-anchor preview uses bounded multi-hop propagation; multi-anchor unique-path code is unchanged.
- Every frontier is solved as a one-to-one assignment with assignment winner-gap and per-pair PR984 candidate evidence.
- Edge and node custody are checked before commit; ambiguity/custody failure remains audit-visible and stops that frontier.
- MEDIUM identity may propagate while remaining workflow `REVIEW`.
- Incomplete source/target component coverage forces overall `UNRESOLVED`, preserving transfer fail-closed behavior.
- Focused reconstructed execution PASS: 4-edge multi-hop; 205 200-mm node shift; TARGET1 250 OD/WT change; TARGET2 102xx redistributed 250 gang; symmetric branch ambiguity stop.
- TARGET2 test contains explicit 102xx IDs and no `+20000`/offset production rule.
- Literal full-checkout repository tests remain `NOT_RUN` because the current container cannot resolve GitHub for a complete checkout.

See `agents/PR985_workreport.md`, `agents/status/PR985.yaml`, `agents/claims/PR985.yaml`.

## PR984 GE-984-003 correction

M1 Spatial is **endpoint-coordinate based**, not midpoint based. For each candidate edge it evaluates both direct and reversed endpoint custody and uses the maximum matched-endpoint displacement. This closes the benchmark trap where a 200 mm node-205 move would appear as only 100 mm at the element midpoint. Focused endpoint regression pins `[0, 200] mm` and M1 FAIL at a 100 mm tolerance, including reversed element storage.

All earlier PR984 invariants remain: OD/WT are supporting evidence only, M2 tokens contain no dimensions, method disagreement is REVIEW, and unsupported identity scores 0.

## PR983 / PR982 retained state

PR983 retains truthful capability states and test-only benchmark preflight. PR982 retains fixed-field decoding for the reported adjacent negative scientific field. Both remain draft/unmerged and owner merge authority is unchanged.

## Transfer boundary

Stage06 target-CII mutation/export remains `NOT_IMPLEMENTED` / blocked. No PR in this stack enables target mutation.
