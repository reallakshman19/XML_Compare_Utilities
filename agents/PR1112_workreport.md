# PR1112 — CII Writer2 benchmark-exact repair work report

## PR Mission Control
- Mission: repair Utilities → CII Writer 2 — V11/V14 so exact retained S1/S2/S3 → T matches `Benchmark/TEXPECTED-PARTIALLLYDONE.CII`, with independently correct Auto Anchor/correspondence, exact Transfer APPLY set/cardinality, exact Compare result, and full raw dotted NODENAME identity.
- Source task / issue: #1111; parent programme #1083.
- PR number: 1112
- Branch: `fix/cii-writer2-benchmark-exact-wp006`
- Base commit: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4`
- Current HEAD at report creation: `7cca066a805fee041441d84b258e46c6514fa479`
- PR status: DRAFT / OPEN / OWNER_ONLY_MERGE
- Current stage: Stage 1 — live grounding + first-wrong-boundary isolation
- Last completed stage: branch/report/PR allocation
- Engineering status: INVESTIGATING
- Validation status: PARTIAL_SOURCE_INSPECTION; runtime NOT_RUN
- Current blocker: none for Stage 1 investigation; no production patch until first wrong boundary is proven.
- Exact next action: add focused regression proving exact raw NODENAME across engineering delta → transfer operation → BM-001 binding; if exact there, move downstream; if wrong there, isolate correspondence/source-node selection.

## Handover in 60 Seconds
- Current main/base is `96b09485...`; retained benchmark files and TEXPECTED are present on that exact commit.
- Old branch `agent/cii-writer2-multisource-nodename-transfer` is diverged from current main and is not being revived.
- Open PR #1064 is read-only Writer2 runtime evidence with no production patch authority; no production overlap blocks this repair.
- Exact BM-001 alias binding is trimmed-string exact and preserves dotted names.
- Multi-source preview infers BM-001 binding from `operation.sourceEvidence.value ?? operation.proposed`; transfer-plan delta operations carry `delta.sourceValue` directly.
- Therefore first-wrong-boundary testing should begin at engineering-delta/transfer/BM-binding and move upstream/downstream based on evidence.
- Do not assume the fixed-column writer is the defect; wrong sibling correspondence can mimic truncation.

## Mission / acceptance
1. Inputs: `Benchmark/S1.CII`, `S2.CII`, `S3.CII`, `T.CII`, `TEXPECTED-PARTIALLLYDONE.CII`.
2. TEXPECTED is an independent retained-real expected postimage; never regenerate it from product output.
3. Intermediate gate: benchmark equivalence excluding only suffix-only `.X` differences = 100%; every non-suffix difference = 0.
4. Final gate: expected and actual operation sets equal; missing/extra/wrong-target/wrong-action/wrong-name/duplicate/accepted-conflict = 0; Compare differences = 0.
5. Auto Anchor/correspondence must be proven independently; NODENAME is corroboration only, not physical identity authority.
6. Transfer tab must have exact APPLY set and exact APPLY row count; count equality alone cannot PASS.
7. No production hard-coding of owner checkpoints `8870→9040`, `10350→10190`, `1005→925`, benchmark hashes, aliases, or fixture-specific node IDs.

## Governing invariants
- `raw_name` = exact writable source identity (example `SL-106.3`).
- `canonical_key` = review/corroboration family only (example `SL-106`).
- `emission_name` must equal the raw name of the physically selected source node.
- Canonical family equality cannot pick a sibling among `.2/.3/.4/...` and cannot authorize a mutation.
- Existing V11 Writer2 + frozen V11↔V14 bridge remain mutation authority unless a falsifier proves the first wrong boundary there.
- No Writer1/Writer3/topology authority expansion; no physical source merge; no workflow changes; no oracle/tolerance weakening.

## Mission Status
| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Independent T→TEXPECTED delta/oracle | P0 | NOT_STARTED | 2 | retained files pinned |
| Auto-anchor/correspondence proof | P0 | INVESTIGATING | 1/3 | production path traced |
| Transfer exact set/cardinality proof | P0 | NOT_STARTED | 3 | issue acceptance fixed |
| Exact dotted NODENAME repair | P0 | INVESTIGATING | 1/4 | exact source/BM names observed |
| Compare exact closure | P0 | NOT_STARTED | 5 | issue acceptance fixed |
| Neighbor/end-to-end regressions | P1 | NOT_STARTED | 6 | NOT_RUN |

## Engineering Item Register
| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | defect | P0 | INVESTIGATING | multi-source result can lose dotted suffix or select family-level identity |
| RISK-001 | risk | P0 | ACCEPTED | visible truncation may mask wrong sibling/correspondence |
| DEC-001 | decision | P0 | ACCEPTED | normalize for review; preserve raw exact identity for write |
| DEC-002 | decision | P0 | ACCEPTED | TEXPECTED/BM expected data remain independent from product output |
| QST-001 | question | P0 | INVESTIGATING | derive exact engineering meaning of owner checkpoints before using them as assertions |
| RISK-002 | risk | P0 | ACCEPTED | stale diverged WP-001 branch must not be replayed over current main |

## Stage Roadmap
### Stage 1 — Grounding + first-wrong-boundary isolation
Trace exact raw NODENAME through source graph → correspondence → engineering delta → transfer operation → BM binding → Writer2 relocation/write. Add focused tests before production mutation.

### Stage 2 — Independent benchmark model
Derive T→TEXPECTED expected mutation rows outside production Writer2/transfer helpers, including a strict suffix-only classifier and deterministic expected operation keys.

### Stage 3 — Auto Anchor/correspondence + Transfer exactness
Prove topology/neighbourhood/loop/source provenance and target arbitration. Require exact Transfer APPLY key set + exact count, zero missing/extra/duplicate/wrong-target/wrong-action/conflict rows.

### Stage 4 — Exact raw-name repair
Patch the smallest proven boundary. Canonical smart-name matching remains discovery/corroboration only.

### Stage 5 — Compare acceptance
Before final suffix repair: only suffix-only residuals. After repair: zero benchmark differences.

### Stage 6 — Regression / retained-real closure
Focused multi-source, transfer, Writer2 NODENAME, bridge, retained-real, repository/browser gates where executable. Keep PASS/FAIL/NOT_RUN distinct.

## Current Technical Findings
### F-001 BM-001 preserves exact aliases
`cii-workspace-multisource-nodename-authority.js` stores dotted aliases exactly; `ciiMsBm001AliasKey()` is exact trimmed `sourceName + targetName` and does not canonicalize `.X` away.

### F-002 Multi-source BM binding consumes operation raw evidence
`cii-workspace-multisource-preview.js::inferredAcceptanceBinding()` uses `operation.sourceEvidence.value ?? operation.proposed` and only binds on exact BM-001 alias+target membership.

### F-003 Transfer operation consumes engineering delta value directly
`cii-workspace-transfer-plan.js::deltaOperation()` sets `sourceEvidence.value = delta.sourceValue`; therefore a correct engineering delta should preserve the dotted identity through this boundary.

### F-004 Smart-name canonicalization is a potential authority-leak boundary
`cii-workspace-node-name-corroboration.js` intentionally collapses dotted siblings to a canonical family for comparison/review. That is acceptable only while excluded from physical identity and writable value selection.

## Changed-File Ledger
| File | Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---|---|---|
| `agents/PR1112_workreport.md` | 1 | living report / handover | no product semantics | source review |
| `agents/WIP-wp006-benchmark-repair_workreport.md` | 1 | pre-PR report to be removed after PR binding | no | superseded |

## Validation Ledger
| Validation | Status | Evidence |
|---|---|---|
| exact source/BM dotted-name inspection | PASS | retained source/BM text contains exact dotted identities |
| BM alias-key exactness inspection | PASS | exact trimmed alias key; no suffix canonicalization |
| engineering-delta → transfer sourceValue path inspection | PASS_SOURCE_INSPECTION | `delta.sourceValue` carried directly |
| first-wrong-boundary focused runtime | NOT_RUN | test not yet authored/executed |
| independent T→TEXPECTED delta | NOT_RUN | pending Stage 2 |
| Auto Anchor benchmark | NOT_RUN | pending Stage 3 |
| Transfer exact-set benchmark | NOT_RUN | pending Stage 3 |
| final Compare / retained-real apply | NOT_RUN | pending Stages 5/6 |
| repository npm/browser | NOT_RUN | pending Stage 6 |

## Explicitly Not Validated
- owner checkpoint semantics;
- exact T→TEXPECTED operation cardinality;
- exact first wrong production boundary;
- browser Transfer/Compare row counts;
- full repository regressions.

## Next-Agent Handover
- PR / branch: #1112 / `fix/cii-writer2-benchmark-exact-wp006`.
- Start at: focused test around `deltaOperation` + multi-source `inferredAcceptanceBinding`; then inspect engineering-delta source lookup and correspondence row source-node selection.
- Do not redo: current main/old branch/open-PR overlap grounding.
- Do not assume: formatter is defective; checkpoint meanings; row-count equality proves Transfer correctness.
- Highest risk: wrong source sibling hidden by family-level symptom.
- Exact next action: author focused source-value preservation and ambiguous-sibling rejection regression, run where execution exists, then patch only the first proven wrong boundary.
