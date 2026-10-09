ISSUE_BASIS_ID: IB-ARCH-RECOVERY-1215-0001
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1215
ISSUE_SOURCE: https://github.com/reallaksh19/XML_Compare_Utilities/issues/1215
ISSUE_SOURCE_SNAPSHOT_AT: 2026-09-12T06:00:49Z
PREVIOUS_ISSUE_BASIS: NONE
CHANGE_AUTHORITY: INITIAL_CAPTURE
ISSUE_BASIS_STATUS: CURRENT

# Original task / acceptance ledger

- TASK-001 | Establish exact runtime/release identity: deployed Git SHA, build ID, timestamp, schema/profile versions and diagnostics surface | OPEN | issue #1215 AR-001
- TASK-002 | Replace or mechanically eliminate hand-maintained transitive ESM cache-version topology and prove one coherent module graph per release | OPEN | issue #1215 AR-002
- TASK-003 | Establish one authoritative current release-state ledger derived from Git/workflow/deployment/benchmark truth | OPEN | issue #1215 AR-003
- TASK-004 | Qualify bounded domain children in authority order without cross-domain engine duplication | IN_PROGRESS | #1216 P0, #1217 P1, #1218 P2
- TASK-005 | Exact deployed integration gate: candidate SHA deploys, all three utilities smoke on canonical inputs, release manifest agrees with running app | OPEN | issue #1215 AR-005

# Input ledger

- INPUT-001 | Repository main SHA | AVAILABLE | c7d4afa4c2bab4528c6d499e9ceabe058e376348 at this basis
- INPUT-002 | GitHub Pages deploy workflow `.github/workflows/deploy.yml` | AVAILABLE | current main deploy run 34674343442
- INPUT-003 | Support/Steel child #1216 | AVAILABLE | P0 authoritative evidence producer
- INPUT-004 | PS/SL Evidence Audit child #1217 | AVAILABLE | P1 downstream consumer
- INPUT-005 | CSV Rev Compare child #1218 | AVAILABLE | P2 separate lineage domain sharing release plane
- INPUT-006 | Last known successful Pages deployment | AVAILABLE | run 34381085579 / SHA 091d41d4daba80fd085eaf59cf448642daf22a32

# Benchmark / oracle ledger

- BM-001 | Running application exposes exact release SHA/build manifest | NOT_RUN | independent runtime identity gate
- BM-002 | Browser module graph is deterministic and does not instantiate the same physical module under unintended versioned URLs | NOT_RUN | runtime graph gate
- BM-003 | Repository `main` candidate SHA equals deployed SHA | FAIL | main c7d4afa... vs last successful Pages SHA 091d41d...
- BM-004 | Support/Steel #1216 canonical input -> bundle -> output -> browser smoke | NOT_RUN | child gate
- BM-005 | PS/SL Audit #1217 canonical evidence -> audit -> browser smoke | NOT_RUN | child gate
- BM-006 | CSV Rev Compare #1218 categorized XML -> lineage/events -> exported remarks -> browser smoke | NOT_RUN | child gate; inherited Phase-2 failure remains separate

# Roadmap ledger

- RM-001 | GitHub issue #1215 body | ISSUE_EXECUTION_PLAN / PROGRAM_ROOT | PRIMARY | ALIGNED | Owner-authorized architecture recovery program
- RM-002 | GitHub issue #1154 | ISSUE_EXECUTION_PLAN | LINKED_PRODUCT | ALIGNED_WITH_BLOCKER | Support Report remains separate product roadmap
- RM-003 | Common engineering-pr-delivery-v2@734286a3da99133c0f16faa29bb641103e29ada0 | PROCESS_CUSTODY | CURRENT | explicit Owner-selected protocol basis
- RM-004 | repository `AGENTS.md`@c7d4afa4c2bab4528c6d499e9ceabe058e376348 | PROJECT_OVERLAY | CURRENT_WITH_STALE_COMMON_POINTER | local backup/code-quality restrictions remain applicable; explicit Owner instruction selects v2 Common basis
- RM-005 | docs/roadmaps/ROADMAP_REGISTRY.md | NOT_APPLICABLE | no registry file located for this domain

# Owner qualification baseline

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

Issue #1215 contains architecture requirements and acceptance gates, but no Owner-authored Q1-Q5 takeover challenge pack. Domain-child qualification is maintained per child.