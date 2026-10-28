# Concept Note: Incremental Shared-Service Refactor of the XML Comparison Tab

**Status:** Proposed — for architectural review; not implementation authorization  
**Version / date:** 0.1 / 28 October 2026  
**Decision basis:** Software MCDA Option B (4.32/5, *estimated*), with a 50% safety-weight crossover to Option C  
**Code baseline:** XML_Compare_Utilities, PR #209 merged at `f3a743fc5dc1ada9a07853328465bb4c1ca4be19`  
**Intended audience:** Architecture owner, comparison/transfer maintainers, engineering reviewers, QA, and release owner

## 1. Decision requested

Approve **Option B — incremental shared-service refactor** as the preferred architecture for *design and proof-of-concept work*, subject to explicit safety gates, regression evidence, and owner approval at each implementation stage. Do **not** authorize an immediate broad rewrite, automatic engineering-property updates, or a production release on the basis of this concept note.

The essential design decision is to retain PR #209's shared composite identity policy and the existing three-tab experience while separating: **(i)** candidate discovery, **(ii)** engineering identity qualification, **(iii)** read-only audit evidence, and **(iv)** transfer authorization. Audit and transfer may consume the same verified identity result but must not share approval authority or mutable approval state.

## 2. Executive rationale and MCDA provenance

The original Comparison tab evolved from generic XML and revision comparison into cross-source engineering reconciliation. Generic similarity and proximity logic are valuable candidate-discovery tools, but were not a sufficient authority for deciding that two engineering records identified the same support. The audit and transfer experiences also shared state constructs that could imply approval beyond what the underlying evidence established.

PR #209 corrected the most important identity-level defects: reusable composite keys, explicit ISO role contracts, `Support No` to `PS NO` mapping without overwriting raw input, preservation of noncanonical identifiers, separate business and row-instance keys, `NODE_NAME`/note-token consistency, and guarded individual/bulk/manual candidate approval. It did **not** make the entire comparison workflow an independently state-isolated engineering audit platform.

The referenced MCDA compares four equivalent-scope strategies on six weighted benefit criteria. Option B scored **4.32/5** versus **3.92** for a standalone ISO subsystem (C), **3.72** for a full rewrite (D), and **2.87** for controller patches (A). Weights: safety 30%, maintainability 20%, delivery 15%, migration 15%, reproducibility 12%, scalability 8%. All values are **estimated engineering judgments**, not measured delivery effort, operational performance, security assurance, or release readiness. Option C overtakes B when the safety weight exceeds 50%, with other weights proportionally rescaled. Revalidate the MCDA if the owner changes the criteria, weights, or actual measured evidence.

## 3. Scope, boundaries, and exclusions

**In scope:** Source metadata and provenance contracts; domain adapter and composite-identity integration; a centrally enforced approval command boundary; audit-only identity links; immutable comparison/audit snapshots; finding lineage and typed-evidence aggregation; performance and UI orchestration hardening; end-to-end regression and deployment qualification; backward-compatible migration of the generic revision/transfer experience.

**Explicitly out of scope:** Replacing the three-tab UI; rewriting the transfer engine; automatically changing DTXR, restraints, support gaps, model geometry or target XML based on an audit finding; inferring geometric compliance from keywords; accepting similarity scores as ISO identity proof; introducing unqualified new domain adapters; adding confidential raw engineering source records to the repository.

**Baseline evidence:** The reference input reconciliation establishes 2,778 S1 rows, 819 S2 rows, seven exact composite identities, 713 same-support/different-pipeline hazards, and 43 noncanonical identifiers (28 S1 + 15 S2). These numbers are regression reference expectations, not claims that 713 wrong approvals occurred in production. A synthetic corpus replicates these distributions; the original inputs still require controlled live-workflow reconciliation.

## 4. Root cause and architectural problem statement

The design problem is **authority leakage across semantic boundaries**, not merely an incorrect regex. Candidate scoring, identity verification, engineering compliance evidence and permission to transfer require different contracts and cannot inherit one another's approval semantics.

1. **Generic records had insufficient domain authority.** Display names, support numbers and coordinate correspondence could be treated as persuasive even though ISO identity requires normalized pipeline **and** full support ID.
2. **Identity, provenance and row-instance keys were not always separated.** Noncanonical identifiers and repeated placeholders must remain traceable without being fabricated into valid identities.
3. **Approval enforcement was controller-centric.** PR #209 fixed loaded-document scoping in the tab; direct lower-level approval reducers still exist and should not become a second, ungated entry point in future callers.
4. **The audit reused generic approval workspace state.** `linkExactIsoNotePairs()` rebuilds canvas state and registers verified identities in `approvedMatchSet`, even though audit links confer no transfer authority.
5. **Evidence completeness and provenance were not fully modeled.** An individual typed clearance can agree while another S2-only clearance remains unverified; row-local finding references do not alone establish cross-run reproducibility.
6. **Rendering drives repeated derived work.** The existing workspace assembly builds audit results during Tab 3 rendering and emits complete tables, creating avoidable recomputation and potential UI latency for large extracts.

## 5. Non-negotiable invariants

| ID | Required invariant | Proof expectation |
|---|---|---|
| H1 | Running, rerunning, exporting or navigating an audit does not create, alter or authorize transfer matches, plans, target XML or transfer history. | Before/after serialized transfer-state equality and unchanged target bytes. |
| H2 | Every domain-scoped approval transition is checked by one authoritative command boundary; missing records, out-of-scope roles, duplicates, noncanonical IDs and unequal composite keys fail closed. | Individual, bulk, manual, direct-caller and adverse-input tests. |
| H3 | The same immutable source snapshots, parser/adapter/rule/policy versions and configuration yield identical normalized results and finding identifiers. | Repeat/reload/reordered-run deterministic comparison and hash checks. |
| H4 | A similarity score or an audit identity match cannot authorize model-property transfer. | Type/contract checks and negative end-to-end tests. |
| H5 | Raw identifiers, original headers/cells and original source references survive normalization and export. `NODE_NUM` never substitutes for a support identity. | Raw-to-canonical lineage assertions and exceptional-ID corpus. |
| H6 | Aggregate status never communicates complete clearance agreement where any required typed evidence is unresolved. | Typed-gap matrix and counterexamples. |
| H7 | Non-ISO generic comparison, revision review, connector approval and validated transfer remain compatible unless a separately approved migration specifies otherwise. | Baseline/golden-master and regression suite comparisons. |

H1–H3 are the MCDA hard gates. **They are commitments proposed for Option B, not verified passes.** A hard-gate failure blocks release irrespective of weighted MCDA score.

## 6. Proposed target architecture

### 6.1 Logical processing and trust boundaries

```text
Source A / Source B
    │  raw bytes + source role + extract scope
    ▼
Source Registry / Dataset Snapshot Service
    │  immutable raw data, parser diagnostics, fingerprint
    ▼
Domain Adapter + Composite Identity Policy
    │  raw ID + canonical key + instance ID + validity evidence
    ▼
Pure Comparison Snapshot Builder
    │  exact links, unmatched/review items, typed evidence, policy versions
    ├───────────────────────────────┐
    ▼                               ▼
Read-only Audit Service      Transfer Approval Command Service
AuditIdentityLinks           independently authorized transfer decisions
Findings + review notes      readiness/stage/apply/export proof
Audit CSV/JSON               controlled target mutation only after proof
    │                               │
    └───────────────┬───────────────┘
                    ▼
             Thin three-tab UI
```

The diagram is a **proposal**, not a statement that these services already exist as isolated modules. In particular, the proposed `AuditIdentityLinks` must not be an alias of `approvedMatchSet`.

### 6.2 Service responsibility and ownership contracts

| Service / boundary | Owns | Must not own |
|---|---|---|
| Source Registry | Source bytes/fingerprint, role, original headers, raw row/cell references, parser version, extract scope and validation diagnostics | Identity approval or transfer permission |
| Domain Adapter + Identity Policy | Domain-specific canonical parts, token normalization, ID validity, role constraints, duplicate interpretation | UI-selected candidates, mutation or engineering geometry proof |
| Comparison Snapshot Builder | Deterministic matches/reviews/coverage, immutable evidence and rule references | Human approval or mutable target XML |
| Audit Service | Audit-only identity link projections, per-type requirements, findings, reviewer dispositions, read-only exports | `approvedMatchSet`, transfer stage/apply/export rights |
| Transfer Approval Command Service | Centralized policy gate, authorized approval commands, auditable decisions and transfer readiness | Creation of authority from audit finding or fuzzy score |
| Tab UI / controller | Source selection, presentation, navigation, input validation and command dispatch | Business-rule implementation or bypass of service guards |

### 6.3 Data model proposals (illustrative, versioned)

**DatasetSnapshot.v1**: `snapshotId`, `contentSha256`, `sourceRole`, `sourceName`, `extractScope`, `parserVersion`, `schemaVersion`, `capturedAt`, `originalHeaders`, `rawRows`, `diagnostics`. A content digest must be computed over a canonical, documented byte representation; a noncryptographic UI hash is not sufficient for evidence custody. `capturedAt` is metadata, not an input to deterministic matching.

**IdentityResolution.v1**: `policyId`, `policyVersion`, `rawIdentityParts`, `normalizedParts`, `compositeKey`, `instanceKey`, `validity`, `reasonCodes`, `sourceRefs`, `tokenEvidence`. `compositeKey` identifies an engineering entity; `instanceKey` identifies a particular source occurrence. Neither substitutes for the other.

**ComparisonSnapshot.v1**: `comparisonId`, source and target `snapshotId`s, adapter/policy/rule versions, configuration digest, matched pairs, unmatched rows, ambiguous/duplicate rows, coverage summary, typed engineering evidence and diagnostic ledger. All derived content must be immutable from the viewpoint of callers.

**AuditIdentityLink.v1**: `sourceInstanceKey`, `targetInstanceKey`, `compositeKey`, `identityPolicyVersion`, `status=VERIFIED_IDENTITY`, and proof references. **It has no transfer-approved status or transfer permission bit.**

**AuditFinding.v2**: distinct `logicalFindingKey` and `findingInstanceId`, `comparisonId`, `sourceRefs`, domain/type, per-type result, aggregate result, original evidence, parser rule, review action and explicit uncertainty. The logical key supports lineage across extracts; the instance ID binds a finding to exact input snapshots and policy versions.

**TransferApprovalCommand.v1**: `commandId`, domain scope, source/target identities, source/target snapshot references, requested action, policy decision and explicit approval provenance. Transfer applicability is validated independently; a valid identity is a necessary but insufficient condition for property transfer.

All names are **proposed interfaces**, not existing code exports. Schemas require review of persistence, serialization compatibility, and sensitive-data retention before implementation.

## 7. Core workflows and state transitions

### 7.1 Audit flow (pure, read-only)

1. Load both sources into immutable dataset snapshots, retaining original evidence and exact role assignments.
2. Apply the versioned domain identity policy. Assign missing, noncanonical, conflict, duplicate, exact and out-of-scope evidence explicitly.
3. Compute comparison snapshot and coverage. Never infer physical support absence merely from an unmatched record without certified extract scope.
4. Evaluate typed REST/GUIDE/LINE STOP requirements independently. Example: GUIDE=MATCH with LINE_STOP=UNVERIFIED implies overall=REVIEW/PARTIAL, not unconditional MATCH.
5. Produce audit-only `AuditIdentityLinks`, findings and exports from the immutable comparison snapshot.
6. Switching between tabs, downloading an audit or selecting a finding must not mutate transfer approvals or target data.

### 7.2 Transfer flow (independent authorization)

1. A user initiates a transfer approval command explicitly from the transfer workflow.
2. The central service loads authoritative source/target records and identifies the applicable domain policy from the source metadata—not from a mutable UI flag.
3. It rejects missing, ambiguous, cross-role, wrong-pipeline, duplicate or noncanonical identities unless a separately defined/manual authorization policy permits and records the exception.
4. A successful identity check makes a candidate **eligible for further validation**, not automatically transferable. Property-specific validation and authorization remain mandatory.
5. Only the existing validated transfer stage/apply/proof/export path may mutate or export a patched target. Audit data cannot mint the necessary authorization.

### 7.3 State ownership

Keep UI/navigation state transient. Store `auditSession`, `comparisonSnapshot` and `auditIdentityLinks` independently of `transferSession`, `approvedTransferMatches`, `transferStage`, `transferAudit` and `exportHistory`. State-machine commands must be named and scoped; hidden side effects from a render or tab change are prohibited. The original `approvedMatchSet` remains supported through a compatibility facade during migration, but audit code must stop writing to it.

## 8. Incremental migration strategy

| Phase | Change boundary | Deliverables | Exit gate |
|---|---|---|---|
| 0 — Baseline and contracts | No production mutation | Call-site inventory, golden-master outputs, current module mapping, accepted schema/invariant specifications | Reviewed scope and reproducible baseline |
| 1 — Central approval authority | Approval commands and adapter dispatch only | Pure service with typed command contract; UI and direct reducers invoke the same validation boundary | H2 negative/positive cases, no change to unrelated revision workflow |
| 2 — Audit/transfer state isolation | Audit projections and tab orchestration | `AuditIdentityLinks`, separate audit session, zero audit writes to `approvedMatchSet` | H1 before/after state+target-byte proof across all Tab 3 actions |
| 3 — Snapshots and evidence semantics | Ingestion/versioning, comparison service, reporting | Content fingerprints, deterministic audit snapshot, stable finding lineage, PARTIAL/REVIEW aggregation | H3, H5, H6 and export parity |
| 4 — UI/performance qualification | Presentation and test harness | Snapshot memoization, virtualized/paginated large grids, real three-tab Playwright flow, benchmarks | Performance target agreed and observed; H7 regression parity |
| 5 — Deployment and handover | Build/deploy contract | Production/docs synchronization verification, qualified release artifacts, rollback recipe, ownership/runbook | Maintainer and engineering review sign-off; deployment smoke and original-input replay |

Each phase should be a small, independently reviewable PR. Do not merge a change that only relocates code without proving a behavioral invariant. Protect unrelated WIP and preserve exact pre-edit recovery evidence as required by the repository's `AGENTS.md`.

### Compatibility and rollback

Maintain existing public API signatures with adapters while new service contracts are introduced. Version stored state and emitted JSON/CSV schemas rather than silently repurposing fields. Preserve generic revision compare, candidate-review, validated transfer and export behaviors. For each phase, record changed-file ledger, baseline/after evidence, reversible migration actions and target-data invariants. Use file-specific backups/diffs for rollback; do not assume reversing a commit is safe in a repository with intervening work.

## 9. Test, qualification and evidence plan

### 9.1 Mandatory functional corpus

- Full synthetic distribution: S1 2,778 / S2 819 / 7 exact identities / 713 wrong-pipeline hazards / 43 noncanonical IDs; every hazard must remain non-approved.
- Source fidelity: `Support No` alias, source header collisions, source-row/cell references, blank `NODE_NAME`, no `NODE_NUM` identity fallback, malformed IDs, duplicate canonical keys, repeated `PS-XXXX`, `.1` versus `.10`, and `/DATUM` normalization.
- Approval paths: individual, bulk, pending manual, direct service invocation, stale record IDs, reversed and same-role candidates, empty bulk requests, out-of-scope documents, and concurrent state changes.
- Evidence: ambiguous/negated REST, GUIDE and LINE STOP; mismatched typed gaps; partial S2-only gap; untyped values; no numeric gap matches when S1 has no comparable typed values.
- Audit state: repeated Tab 3 open/close, selection, export, rerun and switching tabs produce **zero transfer-state changes** and byte-for-byte unchanged target text.
- Provenance: run twice on identical inputs (same semantic finding IDs); change one source/policy version (new instance ID); retain original row evidence and stable logical keys where appropriate.

### 9.2 End-to-end and nonfunctional qualification

Run actual browser navigation **upload → parse → Tab 1 candidate review → Tab 3 audit → prohibited transfer action → CSV/JSON export → Tab 2 unchanged state**. The dedicated ISO browser regression added by PR #209 evaluates modules in Chromium but does not itself prove this complete UI journey.

Measure cold parsing, incremental recomputation, memory, initial audit presentation, scrolling and export time using the benchmark-sized corpus and larger expected production extracts. Agree numerical service-level targets before treating performance as PASS; the MCDA's 4/5 scalability rating is currently an estimate. Validate output and deployment parity between production and published `docs/` code, and independently smoke-test the deployed site with cache-aware version verification.

**Evidence ledger:** Every gate should record exact command, input source/fingerprint, baseline and candidate commit, expected and observed result, PASS/FAIL/NOT_RUN, and linked logs/artifacts. The PR #209 XML workflow excludes a legacy startup build-stamp assertion as an explicitly nonblocking test; it should not be counted as a clean, unqualified full XML run.

## 10. Risks, mitigations, and unresolved dependencies

| Risk | Architectural impact | Mitigation / verification |
|---|---|---|
| Refactor bypasses a legacy approval call site | Safety regression | Enumerate all reducers/events and enforce one command boundary; negative direct-call tests |
| Audit state migration loses user-approved transfer links | User-data/workflow regression | No destructive migration; frozen baseline, compatibility adapter and pre/post state diff |
| Snapshot identity changes on harmless serialization variations | False cross-run differences | Explicit canonical hash contract; golden vectors and versioned serialization |
| Finding schema/CSV changes break consumers | Export compatibility | Schema version, old/new parity and consumer inventory before modification |
| Performance worsens despite memoization | User-facing latency | Profile real workflows, explicit cache invalidation, bounded memory and virtualized result views |
| Safety and delivery estimates diverge from MCDA | Wrong architectural choice | Same-scope B-versus-C proof of concept; update owner-approved weights and observed ratings |
| Test fixture does not reflect production extract scope | False acceptance | Controlled original-input replay, source manifest and pipeline coverage reconciliation |
| Published JS differs from merged source | Incorrect release assessment | Build artifact checksums, deployment SHA evidence, cache-bypass browser smoke |

The available material does not provide approved service-level objectives, a reviewed implementation estimate, production telemetry or an audited source-extract manifest. These are dependencies for implementation authorization—not facts to fill with assumptions.

## 11. Governance and review decisions required

| Decision | Proposed disposition | Accountable reviewer |
|---|---|---|
| D1: Architectural direction | Accept Option B for design/POC; re-run MCDA with evidence before implementation approval | Architecture/owner |
| D2: Hard gates | Adopt H1–H3 as release-blocking and H4–H7 as acceptance constraints | Architecture + QA + engineering |
| D3: Audit/transfer link semantics | Use separate `AuditIdentityLinks`; no implicit promotion into approval state | Compare/transfer maintainers |
| D4: Exception policy | Noncanonical/missing/conflicting IDs remain REVIEW; manual transfer exceptions require explicit independent governance | Engineering owner |
| D5: Typed-gap aggregation | Individual matches permitted; aggregate must be PARTIAL/REVIEW with unverified types | Engineering domain owner |
| D6: Finding and dataset fingerprint policy | Approve canonical hashing, retention, schema version and logical-vs-instance IDs | Architecture + data owner |
| D7: Migration/release | Approve bounded PRs, rollback proof, real UI E2E and original-input deployment smoke | QA + release owner |
| D8: Performance and delivery estimates | Set target SLOs and staffing estimates, then update MCDA evidence | Delivery/architecture |

## 12. Definition of done and recommendation

The refactor is accepted **only** when: H1–H3 have independent observed PASS evidence; H4–H7 are satisfied; original input reconciliation matches approved reference totals with explicit exceptional-ID dispositions; all approval paths fail closed; generic revision and transfer regression tests pass; findings and their policy lineage reproduce; the deployed three-tab workflow is validated; and migration/rollback evidence is reviewable. Pending items remain NOT_RUN or UNKNOWN, never silently promoted to PASS.

**Recommendation:** proceed with **Option B as a bounded architecture proof of concept**, beginning with a centralized approval boundary and separate audit identity state. Maintain PR #209's identity logic and existing UI; avoid broad rewriting. If the POC reveals that meaningful isolation cannot be guaranteed inside the shared shell, or if owner-approved safety weighting rises above the MCDA crossover, reopen **Option C** as a credible alternative.

## References and evidence classification

- Source audit text supplied for this decision: architecture review of the XML Comparison tab after PR #209. **Source-derived.**
- MCDA method: `Common/skills/software-mcda/SKILL.md` at commit `8e08f355f430ca2edac389c7f327ff633144fb0f`. **Method-derived.** https://github.com/reallakshman19/Common/tree/8e08f355f430ca2edac389c7f327ff633144fb0f/skills/software-mcda
- MCDA decision/report from prior analysis: Option B 4.32, C 3.92, D 3.72, A 2.87, with estimated scores and hard-gate commitments. **Estimated analysis.**
- PR #209 and merge commit. **Repository baseline.** https://github.com/reallakshman19/XML_Compare_Utilities/pull/209
- Code touchpoints: `tabs/xml-compare-tab.js`; `xml-compare/XmlCompareCanvasStateController.js`; `xml-compare/XmlCompareCompositeApprovalGate.js`; `xml-compare/XmlCompareCompositeIdentityPolicy.js`; `xml-compare/XmlCompareIsoNoteEngineeringRules.js`; `xml-compare/XmlCompareIsoNoteEngineeringFindings.js`; `xml-compare/rev-compare/rev-compare-iso-note-mode.js`; ISO table-categorizer parser/profile. **Inspected code baseline.**
- Proposed service names, schema fields, phased sequence and performance controls. **Design proposals requiring review.**
