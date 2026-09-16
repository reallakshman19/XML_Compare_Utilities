# Issue Basis — SUPPORT-PRIMARY-1225

ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1225-0001
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1225
ISSUE_SOURCE: https://github.com/reallaksh19/XML_Compare_Utilities/issues/1225
ISSUE_SOURCE_SNAPSHOT_AT: 2026-09-16T11:21:31Z
PREVIOUS_ISSUE_BASIS: NONE
CHANGE_AUTHORITY: INITIAL_CAPTURE
ISSUE_BASIS_STATUS: CURRENT
PROGRAM_ID: SUPPORT-PRIMARY-1222
PROGRAM_WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
ISSUE_ROLE: WORK_PACKAGE
WORK_PACKAGE_ID: WP-QUAL-001
PARTITION_KEY: SUPPORT-PRIMARY-1222/RELEASE-HARDENING
INHERITED_PROGRAM_BASIS_REVISION: #1222 current issue/chain state observed at PR #1223 head 759612b4e355a585aed7d64b566f199340429bdf

### Original task / acceptance ledger
TASK-001 | Freeze one immutable release-candidate SHA and keep all qualification receipts on that SHA. | OPEN | issue #1225 WP-QUAL-001A
TASK-002 | Prove popup orphan configuration is invocation-scoped and simultaneous popups cannot mutate each other. | OPEN | issue #1225 WP-QUAL-001B
TASK-003 | Prove build invalidation/generation leases are popup-local. | OPEN | issue #1225 WP-QUAL-001B
TASK-004 | Prove nested browser ESM cache-token propagation reaches changed dependencies. | OPEN | issue #1225 WP-QUAL-001B
TASK-005 | Prove field-level totalSupportPointsOnSecondary provenance agrees with final assembly/orphan count authority. | OPEN | issue #1225 WP-QUAL-001B
TASK-006 | Prove structural outputs are invariant when relationship/axis channels are added. | OPEN | issue #1225 WP-QUAL-001B
TASK-007 | Execute hardened focused Node qualification on a clean trusted checkout of RC_SHA. | OPEN | issue #1225 WP-QUAL-001C
TASK-008 | Execute real repository 1884/1885 ZIP benchmark on RC_SHA and retain protected count evidence. | OPEN | issue #1225 WP-QUAL-001D
TASK-009 | Execute Playwright browser qualification including current/reference relationship scoping, popup isolation, rebuild invalidation, Column 22/23, Debug/Trace. | OPEN | issue #1225 WP-QUAL-001E
TASK-010 | Keep real 1835 relationship gate NOT_RUN until authoritative Owner relationship XML is supplied; when supplied prove PS-11167=6 and PS-11236=4 through production path. | OPEN | issue #1225 WP-QUAL-001F
TASK-011 | Reconcile #1216 authority, final PR head/reviews/threads/checks, and readiness without upgrading NOT_RUN evidence. | OPEN | issue #1225 WP-QUAL-001G
TASK-012 | Do not reopen product algorithms unless a concrete reproducible failing case identifies the first wrong production boundary. | OPEN | issue #1225 protected no-patch boundary
TASK-013 | Keep PR draft/unmerged unless fresh explicit Owner authorization changes readiness/merge authority. | OPEN | issue #1225 acceptance ledger

### Input ledger
INPUT-001 | PR #1223 source at release-candidate head | AVAILABLE | observed head 759612b4e355a585aed7d64b566f199340429bdf
INPUT-002 | benchmarks/1884.zip | AVAILABLE | governed repository input; blob previously pinned 63acc3c0b413f6ee727189ec36d4b76fba44d73a
INPUT-003 | benchmarks/1885.zip | AVAILABLE | governed repository input; blob previously pinned 5f27f2d6736693eb21dc2e7981fecad22952819a
INPUT-004 | real 1835 Clash-within-Supports/support-to-support relationship XML | UNRESOLVED | separate authoritative Owner input absent
INPUT-005 | current/reference Support Report + relationship browser fixtures | AVAILABLE | coded regression surface in PR #1223; execution still governed
INPUT-006 | Node 22 clean trusted checkout/runner | UNRESOLVED | hosted Actions historically reached no executable steps

### Benchmark / oracle ledger
BM-001 | Real 1885 PS-12060 | NOT_RUN | expected 1 | Owner oracle from #1222/#1225
BM-002 | Real 1885 PS-12877 | NOT_RUN | expected 4 | Owner oracle from #1222/#1225
BM-003 | Real 1885 PS-12860 | NOT_RUN | expected 6 | Owner oracle from #1222/#1225
BM-004 | Real 1885 PS-12120 | NOT_RUN | expected 14 | Owner oracle from #1222/#1225
BM-005 | Structural positive control PS-11168 -> PS-14168 | NOT_RUN for this work package | expected retained structural typicality | Owner oracle
BM-006 | Real 1835 relationship PS-11167 | NOT_RUN | expected 6 when authoritative relationship XML exists | Owner oracle
BM-007 | Real 1835 relationship PS-11236 | NOT_RUN | expected 4 when authoritative relationship XML exists | Owner oracle
BM-008 | Hardened focused Node suite | NOT_RUN for this work package | must actually execute; no-step jobs are NOT_RUN | repository-owned tests
BM-009 | Playwright browser qualification | NOT_RUN for this work package | real UI/build/debug path | repository-owned test + retained debug evidence

### Roadmap ledger
RM-001 | github:reallaksh19/XML_Compare_Utilities#1222 | OWNER/PROGRAM ISSUE AUTHORITY | PRIMARY | ALIGNED | parent Primary Support Assembly roadmap
RM-002 | github:reallaksh19/XML_Compare_Utilities#1179 | GOVERNING TYPICALITY PROGRAM | SUPPORTING | ALIGNED | structural typicality authority
RM-003 | github:reallaksh19/XML_Compare_Utilities#1216 | GOVERNING SOURCE AUTHORITY | PROTECTED | ALIGNED | Support/Steel carrier/steel producer authority
RM-004 | https://github.com/reallaksh19/Common/tree/main/skills/engineering-pr-delivery-v2 @ fed57820909f4984a97d67437340df952b73a5ab | DELIVERY PROTOCOL | GOVERNING | CURRENT | live Common basis read before bootstrap

### Owner qualification baseline
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE — no Owner-authored Q1-Q5 pack found for #1225
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE
INHERITED_AGENT_QUALIFICATION_REFERENCE: agents/qualifications/SUPPORT-PRIMARY-1222/QS-SUPPORT-PRIMARY-1222-0001.md — technical history only; not reusable as the #1225 work-item question set
