# PR1112 — CII Writer2 retained benchmark repair work report

## Mission control
- Mission: repair Utilities → **CII Writer 2 — V11 / V14** for frozen `S1.CII` + `S2.CII` + `S3.CII` applied to untouched `T.CII`.
- Owner acceptance: preserve the benchmark placement/cardinality represented by `TEXPECTED-PARTIALLLYDONE.CII`, but replace partial family-only names such as `SL-106` with the exact selected source identity such as `SL-106.3`.
- Issue: #1111; parent programme: #1083.
- PR: #1112 — **DRAFT / OPEN / UNMERGED**.
- Branch: `fix/cii-writer2-benchmark-exact-wp006`.
- Pinned base/main: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4`.
- Takeover disposition: `SALVAGE_PARTIAL`.
- Current qualification state: `PATCHED_PENDING_RETAINED_REAL_EXECUTION`.
- Retained end-to-end verdict: **NOT_RUN**.
- Merge authority: **OWNER_ONLY / NOT GRANTED**.

## Corrected authority boundary — PB-0002
The prior PR report treated `TEXPECTED-PARTIALLLYDONE.CII` as exact final NODENAME text. That is contradicted by the Owner's current instruction and by the retained file itself: TEXPECTED contains family-only values such as `SL-106`, while S1/S2/S3 and BM-001 contain distinct dotted siblings such as `SL-106.3` and `SL-106.4`.

Final authority is now split explicitly:

1. **Partial TEXPECTED structural authority**
   - CONTROL.NONAM consequence;
   - ELEMENT NODENAME-pointer placement;
   - NODENAME row count/order;
   - physical CREATE/DELETE target placement;
   - exact text when TEXPECTED already contains an exact name;
   - family-only structural identity when TEXPECTED intentionally contains a partial name such as `SL-106`.
2. **Exact writable raw-name authority**
   - exact raw NODENAME present in the selected S1/S2/S3 source member;
   - exact BM-001 source-alias ↔ target-name pairing, allowing only the optional leading `/` notation difference;
   - canonical family matching may corroborate review only and may never choose a sibling or become emitted text.
3. **Target-preservation authority**
   - original `T.CII` remains exact authority outside Writer2 NODENAME CONTROL/pointer/NODENAME consequences.
4. **Owner checkpoint values**
   - `8870→9040`, `10350→10190`, `1005→925` are frozen acceptance diagnostics/tests only;
   - no production branch uses those IDs;
   - their exact retained-real interpretation remains `NOT_RUN` until the full retained path executes.

This correction is also recorded durably on Issue #1111.

## Frozen retained inputs
| Role | Path | Git blob | Size |
|---|---|---|---:|
| S1 | `Benchmark/S1.CII` | `73c49165b9d33a8c776ef76f480efec3a90e0c93` | 108330 |
| S2 | `Benchmark/S2.CII` | `a04622553720cb41a6fc2a4b85d8290eac7a3b0a` | 90961 |
| S3 | `Benchmark/S3.CII` | `a20b1ab87dd4e854cf2f453f8fd206be4b566b42` | 90942 |
| TARGET0 | `Benchmark/T.CII` | `96b4a4b12bf66bcb0264c56e7767a857c4cc11e6` | 2866002 |
| PARTIAL EXPECTED | `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` | `b7d0913a3827deb184d65c880594ca0667562167` | 2866022 |

Benchmark/source files are unchanged in PR #1112.

Known retained structural metadata:
```text
T.CII CONTROL.NONAM                    = 1265
TEXPECTED-PARTIALLLYDONE CONTROL.NONAM = 1266
```
This is a net physical NODENAME-row consequence only; it is not by itself an APPLY-count oracle.

## Production findings retained from the salvageable PR
### F-001 — canonical family evidence could leak into base authority
`cii-workspace-base-loop-selection.js` excludes review/discovery-only name evidence from Method A/B base selection. Canonical `SL-106` cannot become physical anchor authority.

### F-002 — exact BM aliases are sibling-sensitive
Optional leading `/` is treated as notation only. `SL-106`, `SL-106.3`, and `SL-106.4` remain different writable identities. A family-only or wrong-sibling value cannot bind the exact BM row for another sibling.

### F-003 — correspondence coverage and mutation cardinality are separate
`cii-workspace-multisource-bm001-correspondence.js` separates:
- BM-001 correspondence coverage;
- Writer2 CREATE/DELETE cardinality qualification;
- exact physical mutation keys;
- duplicate corroboration;
- same-target competing exact-name conflicts.

### F-004 — multi-source duplicates do not inflate APPLY
Identical S1/S2/S3 claims collapse to one physical APPLY with provenance. Different dotted proposals for one physical target are a conflict and no proposal wins by source order.

### F-005 — FORTRAN/fixed-column width is not the `.X` loss
NODENAME FROM/TO fields are 26/25 characters. Existing branch regressions cover `SL-106.3` and two-digit suffixes such as `SL-121.14` without adjacent-column movement.

### F-006 — Auto Anchor remains topology-only and fail-closed
`ciiAutomaticBaseSelection()` ranks existing qualified topology evidence only. Review/name discovery is excluded; REVIEW remains manual; equally strong different topology outcomes are `AMBIGUOUS`.

**UI auto-seeding remains deliberately disabled until retained-real qualification passes.**

## New takeover repair — partial expected + exact raw identity oracle
Added `tests/cii-workspace-multisource-partial-texpected-oracle.js`.

It enforces two independent gates:

### Structural gate
The produced CII must reproduce the partial expected Writer2 consequence:
- CONTROL.NONAM exact;
- ELEMENT NODENAME pointers exact;
- NODENAME physical row count/order exact;
- exact name where TEXPECTED is exact;
- only a same-family dotted expansion is allowed where TEXPECTED is family-only;
- unrelated sections remain equal to original T.

Example:
```text
partial expected: SL-106
actual:           SL-106.3   -> structural family expansion allowed
actual:           SL-107.3   -> fail
partial expected: SL-106.3
actual:           SL-106.4   -> fail, wrong sibling
```

### Exact raw-name gate
For each selected physical Writer2 mutation:
- CREATE value must exist exactly in that operation's S1/S2/S3 source member;
- CREATE value must match an exact BM-001 source alias for the operation's bound BM target name;
- DELETE value must equal the exact target preimage name at the physical target node;
- after Writer2 apply, each CREATE target node must contain the exact selected raw value;
- a final family-only `SL-106` is therefore rejected when the selected raw source value is `SL-106.3`.

Valid Writer2 CREATE operations have an empty target preimage. The independent raw-name checker therefore reads the BM target name from `bm001Acceptance.targetName`, falling back to target evidence only when available. This mirrors the production contract without importing production selection logic.

## Retained hard gate correction
`tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js` now evaluates:

```text
S1/S2/S3 exact retained sources
 -> topology Auto Anchor
 -> reviewed correspondence
 -> canonical physical Transfer set
 -> partial-TEXPECTED structural action/target/family equality
 -> exact S1/S2/S3 + BM raw-name identity
 -> 329-row BM correspondence coverage
 -> bound Writer2 scope/readiness
 -> V11/V14 apply to a target copy
 -> partial-TEXPECTED structural postimage equality
 -> exact raw dotted-name emission
 -> original-T preservation outside Writer2 authority
```

The three Owner checkpoint pairs are printed as diagnostics only; they do not enter production selection or acceptance key generation.

`tests/cii-workspace-multisource-texpected-benchmark.test.js` was also corrected to call the TEXPECTED-derived set **structural**, not exact raw-name authority. It records S1/S2/S3 + BM-001 as the raw-name authority.

## Independent retained-file observation
A detached analysis commit projected the frozen TEXPECTED blob onto `Benchmark/T.CII` only to obtain a server-side Git diff. Observed:
- 64 additions;
- 63 deletions;
- 127 changed lines.

The diff includes the expected Writer2 NODENAME/CONTROL/pointer changes **and unrelated support/comment and ALLOWBLS edits**. Those foreign TEXPECTED edits are explicitly non-authoritative and are not reproduced by production.

## Changed-file ledger
### Production inherited/salvaged
- `tabs/cii-workspace/cii-workspace-base-loop-selection.js`
- `tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js`
- `tabs/cii-workspace/cii-workspace-multisource-preview.js`
- `tabs/cii-workspace/cii-workspace-multisource-scope.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js`

### Tests/evidence
- `tests/cii-workspace-base-loop-selection.test.js`
- `tests/cii-workspace-multisource-bm001-exact-alias.test.js`
- `tests/cii-workspace-multisource-partial-texpected-oracle.js` — takeover addition
- `tests/cii-workspace-multisource-partial-texpected-oracle.test.js` — takeover addition
- `tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js` — corrected retained acceptance boundary
- `tests/cii-workspace-multisource-texpected-benchmark.test.js` — corrected partial/structural terminology and keying
- `tests/cii-workspace-multisource-texpected-oracle-unit.test.js`
- `tests/cii-workspace-multisource-texpected-oracle.js`
- `tests/cii-workspace-multisource-transfer-cardinality-ui.test.js`
- `tests/cii-workspace-writer2-nodename-dotted-regression.test.js`
- `agents/PR1112_workreport.md`

An inherited branch workflow modification was removed because repository policy forbids workflow changes without explicit Owner authorization. The current PR diff contains no workflow file.

## Takeover qualification — Appendix A
| Challenge | Score | Evidence |
|---|---:|---|
| A1 Production trace | 19/20 | source custody → topology base → correspondence → engineering delta/BM binding → transfer → scope/readiness → Writer2 relocation/write → V11/V14 apply traced in current branch |
| A2 Current failure isolation | 19/20 | source/BM retain dotted names; fixed-column width is sufficient; stale retained oracle incorrectly promoted partial TEXPECTED family names to final exact-name authority |
| A3 Authority / invariant | 20/20 | structural partial expected, exact source/BM raw identity, original-T outside authority, no canonical family write authority |
| A4 Independent validation | 17/20 | retained blob server diff + isolated executed oracle harness; full retained application remains NOT_RUN |
| A5 Minimal patch / no-patch boundary | 18/20 | production salvage retained; repair is test/oracle boundary plus stale retained benchmark test; benchmark and writer format are not altered |
| **Total** | **93/100** | all individual challenges >=17/20 |

Implementation-authority decision: `SALVAGE_PARTIAL` with fail-closed retained qualification.

## Validation ledger
| Gate | Status | Observation / oracle |
|---|---|---|
| base/main + PR overlap grounding | PASS | live GitHub repository/PR inspection |
| frozen benchmark files unchanged | PASS | Git blob inventory / PR changed-file list |
| retained T vs partial TEXPECTED mixed-domain diff | PASS_SERVER_DIFF | independent Git object diff; no production code involved |
| exact source/BM sibling authority inspection | PASS_INSPECTION | exact BM rows distinguish `.3`, `.4`, etc.; optional leading slash only |
| new partial-expected oracle syntax | PASS_ISOLATED_EXECUTED | Node syntax check in isolated mirror |
| partial family expansion / wrong-family / wrong-sibling tests | PASS_ISOLATED_EXECUTED | focused Node harness |
| exact raw source/BM validation including empty CREATE preimage contract | PASS_ISOLATED_EXECUTED | focused Node harness |
| truncated final `SL-106` rejected for selected `SL-106.3` | PASS_ISOLATED_EXECUTED | focused Node harness |
| unrelated-section mutation rejected | PASS_ISOLATED_EXECUTED | focused Node harness |
| inherited production regressions on current branch | NOT_RUN | no full repository checkout executor available in this connector session |
| full retained S1/S2/S3 → T Auto Anchor/correspondence | NOT_RUN | no branch Actions run/status; no checkout executor |
| exact retained Transfer structural set/cardinality | NOT_RUN | hard gate authored but not executed on retained files |
| 329/329 BM retained production coverage | NOT_RUN | hard gate authored but not executed |
| retained Writer2 V11/V14 apply | NOT_RUN | hard gate authored but not executed |
| final exact dotted-name postimage | NOT_RUN | hard gate authored but not executed |
| `8870→9040`, `10350→10190`, `1005→925` retained semantics/results | NOT_RUN | diagnostics authored; no retained execution |
| browser/UI regression | NOT_RUN | no browser checkout executor in current connector path |
| merge | NOT_APPLICABLE | Owner authorization not granted |

`PASS_ISOLATED_EXECUTED` must not be promoted to retained-real PASS.

## Repository-local backup / patch ledger status
The connected GitHub execution surface does not expose a writable repository filesystem, so `utils/backup.cjs` and the Git-ignored local `.agent-worklogs/` ledger cannot be executed or truthfully fabricated in this session. All GitHub writes were made as sequential branch commits and the limitation is explicitly recorded here. A real-checkout continuation must create/refresh the required local backup/worklog before any further product-file mutation.

## Highest remaining risk
The full retained Auto Anchor/correspondence may expose a non-suffix structural mismatch that isolated tests cannot reveal. If so, the first failing correspondence/Transfer boundary must be repaired generically; do not weaken the structural or raw-name oracle and do not enable automatic UI seeding merely to obtain a benchmark pass.

## Anti-gaming invariants
- no benchmark CII file modified;
- no production branch on `8870`, `9040`, `10350`, `10190`, `1005`, `925`;
- no production read/import of TEXPECTED;
- no expected-data regeneration from actual output;
- no tolerance that accepts a wrong dotted sibling;
- no canonical-family fallback as writable identity;
- no reproduction of unrelated TEXPECTED support/ALLOWBLS edits;
- no workflow-file change in the final PR diff;
- no merge without separate explicit Owner authorization.

## EXACT_NEXT_ACTION
From a real checkout of `fix/cii-writer2-benchmark-exact-wp006`, first create the repository-required local backup/worklog, then execute:

```text
node tests/cii-workspace-base-loop-selection.test.js
node tests/cii-workspace-multisource-bm001-exact-alias.test.js
node tests/cii-workspace-multisource-transfer-cardinality-ui.test.js
node tests/cii-workspace-writer2-nodename-dotted-regression.test.js
node tests/cii-workspace-multisource-texpected-oracle-unit.test.js
node tests/cii-workspace-multisource-partial-texpected-oracle.test.js
node tests/cii-workspace-multisource-texpected-benchmark.test.js
node tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js
```

If the retained hard gate fails, repair only the first demonstrated production boundary and preserve every authority rule above. If it passes, record the exact Transfer count/set/hash and the three checkpoint diagnostics before considering any UI Auto Anchor seeding. Keep PR #1112 draft and unmerged until Owner review/authorization.
