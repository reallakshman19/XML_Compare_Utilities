ISSUE_CURRENT_STATE_VERSION: 3
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0014
UPDATED_AT: 2026-09-11T07:42:00+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184; parser physical-record integrity repaired in LEG-009
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; audited lineage/common-support/candidate-authority defects repaired in LEG-009
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; ambiguity event/output barrier and multiplicity fixes repaired in LEG-009; load semantic-null and total-support attribution hardened in LEG-010
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184; review integrity/evidence and blocked-preview fixes repaired in LEG-009
- TASK-025 | owner benchmark behaviors | COMPLETE_QUALIFIED — all four ordered R2->R3 buckets qualified; one Phase-4 R3 oracle row explicitly unsupported because no R2 composite predecessor exists
- TASK-026 | surgical implementation/no competing authorities | REMEDIATED_AND_REGRESSION_QUALIFIED — existing XML Compare candidate-pair authority supplies candidate pairs/IDs; Phase-4 uses existing exact-pair component-graph events rather than a parallel row matcher
- TASK-027 | owner-only merge | PRESERVED — PR #1188 remains draft; merge not authorized

# Owner benchmark authority

- Unique SupportLocation item = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not unique and must not be used as support-location identity.
- PIPE may change across revisions only when stronger lineage evidence establishes continuity, such as persistent primary-support reference overlap plus corroboration.
- R3 `REMARKS (IF ANY)` is benchmark/oracle only and is blanked from both revisions before production comparison.
- Unsupported/non-mechanically-verifiable labels such as HOLD/Hold Removed are excluded from comparison evidence.
- Bucket order: Phase 1 `PS No. change`; Phase 2 `Support location change`; Phase 3 `Load change`; Phase 4 `Total no of support change`.
- Owner `proceed next` at 2026-09-11T03:36:20Z / 07:36:20+04:00 authorized one bounded progression to correct the remaining Phase-4 attribution defect, re-run the four-bucket gate and checkpoint. It did not authorize merge.

# Material history

LATEST_MATERIAL_LEG: LEG-010
LATEST_MATERIAL_LEG_FILE: agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-010.md
MATERIAL_HEAD: ce9210b8f1b9ba835e4e3ce12c78c61c7a45df15

LEG-010 completed Phase 3 and Phase 4 benchmark work. Phase 3 repaired semantic-empty load equivalence (`-` versus blank) while preserving raw audit values. Phase 4 repaired aggregate/family-field broadcast by requiring the governed total-support field delta to be corroborated by an exact source->target `SUPPORT_COMPONENT_SET_CHANGED` XML graph event on the same accepted lineage pair.

# Qualification evidence

QUALIFICATION_RECEIPT: agents/qualifications/CSV-REV-COMPARE-1181/QR-CSVRC-1181-0001.md
QUALIFICATION_RUN: 34559399072
QUALIFICATION_JOB: 103138837486
QUALIFICATION_CONCLUSION: SUCCESS
QUALIFICATION_VEHICLE: PR #1189 / `issue-1181-remediation-qualification` — qualification-only; never delivery/merge
QUALIFICATION_HEAD: fab90ca9e61a28fc29f428f0c174955384ef16da
DELIVERY_MATERIAL_HEAD: ce9210b8f1b9ba835e4e3ce12c78c61c7a45df15
R2_EXTRACT: `Load Data-Rev 2`, 144 rows x 36 columns
R3_EXTRACT: `Load Data-Rev 3`, 43 rows x 36 columns

# Benchmark ledger

- PHASE-1 | `PS No. change` | PASS
  - expected=1, detected=1, TP=1, FP=0, FN=0, precision=1, recall=1, F1=1
  - TP composite key: `SL-111001(REF)||BWGA-1000-FL-8"-M1610003-(FL-07)`
- PHASE-2 | `Support location change` | PASS
  - real benchmark expected=0, detected=0, FP=0, FN=0; real data is a negative control
  - dedicated executable positive relocation regression: PASS
- PHASE-3 | `Load change` | PASS
  - expected=2, detected=2, TP=2, FP=0, FN=0, precision=1, recall=1, F1=1
  - keys: `SL-111001(REF)||BWGA-1000-FL-8"-M1610003-(FL-07)::LOAD_SIGNATURE_CHANGED`; `SL-111009(REF)||/BWGA-1000-8"-P1110101-1006520P5-01::LOAD_SIGNATURE_CHANGED`
- PHASE-4 | `Total no of support change` | PASS_WITH_EXPLICIT_UNSUPPORTED_ORACLE
  - oracleExpected=3, unsupported=1, checkable expected=2, detected=2, TP=2, FP=0, FN=0, precision=1, recall=1, F1=1
  - TP: `SL-111064(REF)||BWGA-1000-2"-P8310001-13421-01` (1 -> 2)
  - TP: `SL-111069(REF)||BWGA-1000-2"-P8310007-253461P1-01` (2 -> 1)
  - unsupported: `SL-111064(REF)||BWGA-1000-3/4"-D8310024-253461P1-01` — `NO_LINEAGE_PREDECESSOR`; no R2 Civil+PIPE predecessor, therefore not mechanically checkable and not comparison evidence

# Current delivery status

ENGINEERING_STATE: COMPLETE
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PASS
WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
ACTIVE_ENDPOINT: EP-CSVRC-0014
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
CURRENT_HEAD_VALIDATION: FOUR_BUCKET_QUALIFICATION_PASS
QUESTION_SET: QS-CSVRC-1181-0001 CURRENT / REUSED
QUALIFICATION_SCOPE: QSCOPE-XMLCOMPARE-1181-CSV-XML-LINEAGE
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: PASS
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0014_COMMENT_SYNC
ISSUE_HANDOVER_SYNC_STATUS: STALE_PENDING_EP0014_COMMENT_SYNC
QUALIFICATION_VEHICLE: PR #1189 remains qualification-only and must never be merged as delivery
EXACT_NEXT_ACTION: synchronize EP-CSVRC-0014 to GitHub Issue #1181, then await Owner review and explicit merge/next-scope authorization. Do not merge or begin new material work without Owner authority.
