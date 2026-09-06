# PR1112 — CII Writer2 benchmark-exact repair work report

## Mission control
- Mission: repair Utilities → CII Writer 2 — V11/V14 for retained S1/S2/S3 → T, preserving exact dotted NODENAME identity, topology-driven correspondence, exact Transfer physical mutations, and a defensible Compare oracle.
- Issue: #1111; parent programme: #1083.
- PR: #1112 — DRAFT / OPEN / UNMERGED.
- Branch: `fix/cii-writer2-benchmark-exact-wp006`.
- Base commit: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4`.
- Current qualification state: `PATCHED_PENDING_RETAINED_REAL_EXECUTION`.
- Retained end-to-end verdict: `NOT_RUN`.
- Auto Anchor UI state: selector implemented and tested in isolation, deliberately **not auto-enabled in the UI** until the retained end-to-end gate executes successfully.
- Merge authority: none granted by this work package.

## Executive summary
The `.X` symptom was not a fixed-width serialization defect. The repaired architecture now separates three kinds of authority that were previously able to bleed into one another:

1. **Name-family corroboration** — canonical `SL-106` matching is discovery/review evidence only.
2. **Physical correspondence** — BM-001 validates exact retained source-alias ↔ target-name correspondence, including exact dotted sibling identity; one optional leading `/` is notation only.
3. **Writer2 mutation authority** — CREATE/DELETE is derived from reviewed physical target cardinality and exact raw proposed/before value, not from a BM label pair.

Identical multi-source physical mutations collapse to one APPLY with provenance; different exact proposals for the same physical target are conflicts. Exact raw dotted names are preserved through mutation identity and the fixed-width writer regression.

A second benchmark issue was discovered: `TEXPECTED-PARTIALLLYDONE.CII` is a **mixed-domain artifact**. Git server-side comparison of frozen `T.CII` and TEXPECTED found 127 changed lines (64 additions / 63 deletions). The expected file contains Writer2 NODENAME changes, but it also contains changes outside Writer2 NODENAME authority, including support/comment and `ALLOWBLS` changes. Production was **not** modified to reproduce those unrelated fixture edits.

The benchmark is therefore now evaluated with two simultaneous, non-weakening gates:
- inside Writer2 NODENAME authority, actual output must match TEXPECTED exactly (CONTROL.NONAM, ELEMENT NODENAME pointers, NODENAME row count/order/fixed fields and exact physical names);
- everywhere outside that authority, actual output must remain equal to original T.

This preserves both benchmark intent and target semantic safety.

## Frozen retained inputs
Pinned at `96b09485...`:

| Role | Path | Git blob | Size |
|---|---|---|---:|
| S1 | `Benchmark/S1.CII` | `73c49165b9d33a8c776ef76f480efec3a90e0c93` | 108330 |
| S2 | `Benchmark/S2.CII` | `a04622553720cb41a6fc2a4b85d8290eac7a3b0a` | 90961 |
| S3 | `Benchmark/S3.CII` | `a20b1ab87dd4e854cf2f453f8fd206be4b566b42` | 90942 |
| TARGET0 | `Benchmark/T.CII` | `96b4a4b12bf66bcb0264c56e7767a857c4cc11e6` | 2866002 |
| EXPECTED | `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` | `b7d0913a3827deb184d65c880594ca0667562167` | 2866022 |

Known retained source identities include dotted siblings such as `SL-106.2`, `SL-106.3`, and `SL-106.4`; source data is not truncated.

Known retained metadata:
```text
T.CII CONTROL.NONAM                    = 1265
TEXPECTED-PARTIALLLYDONE CONTROL.NONAM = 1266
```
This proves net physical NODENAME-row cardinality +1 only; it does not by itself determine Transfer APPLY count.

Owner checkpoint pairs are retained diagnostics, not production authority:
```text
8870 -> 9040
10350 -> 10190
1005 -> 925
```
Their exact engineering meaning remains `NOT_RUN` until the retained end-to-end diagnostic executes. The test reports each pair both as a possible source→target correspondence and as a possible exact-name target relocation.

## Production findings and repairs
### F-001 — canonical name review could leak into base authority
`cii-workspace-base-loop-selection.js` now excludes review/discovery-only suggestions before projecting Method A/B base loops. Canonical-family equality cannot become physical identity authority.

### F-002 — BM slash notation was lexical, not semantic
BM aliases such as `/SL-106.3` and raw CII `SL-106.3` are treated as the same lexical alias. `SL-106`, `SL-106.3`, and `SL-106.4` remain different writable identities.

### F-003 — BM correspondence and Writer2 cardinality were conflated
New `cii-workspace-multisource-bm001-correspondence.js` separates:
- exact BM correspondence coverage;
- Writer2 NODENAME cardinality qualification;
- physical mutation keys;
- duplicate corroboration grouping;
- same-target competing-proposal conflicts.

### F-004 — duplicate corroboration could inflate Transfer cardinality
Identical S1/S2/S3 physical mutations now select one deterministic APPLY. Other identical claims are retained as corroboration and explicitly excluded from mutation count.

### F-005 — sibling conflicts need defense in depth
`SL-106.3` and `SL-106.4` proposed for the same physical target remain separate physical keys and create a conflict. Scope binding and Writer2 readiness both block them.

### F-006 — physical writer width is not the suffix defect
NODENAME FROM/TO fields are 26/25 characters. Regressions cover `SL-106.3` and `SL-121.14`, exact field width, and no adjacent-column shift.

## Conservative Auto Anchor selector
`ciiAutomaticBaseSelection()` was added at the existing base-selection boundary. It is generic and benchmark-independent.

Eligibility:
- qualified Method A/B topology only;
- review/name discovery excluded;
- default minimum confidence MEDIUM;
- REVIEW remains manual.

Ranking uses existing evidence only:
1. HIGH > MEDIUM;
2. Method A+B > Method A > Method B;
3. strongest existing Method A/B weight;
4. winner gap;
5. structural score;
6. deterministic ordering only after evidentiary equality.

Safety behavior:
- no qualified base → `REVIEW_REQUIRED`;
- equally strong different topology outcomes → `AMBIGUOUS`;
- equally strong cards resolving to the same physical Method-A base are equivalent and may resolve READY.

**Important:** this selector is not yet auto-seeded into `selectedBySource` in the UI. That wiring is intentionally held behind the retained end-to-end benchmark gate. Existing manual/selected-base UI behavior remains in control.

## Transfer / readiness behavior
The source-set scope now requires:
- retained source-set/target custody;
- transfer plan PREVIEW_READY;
- complete exact BM-001 correspondence coverage;
- no physical mutation conflicts;
- exact Writer2 CREATE/DELETE cardinality operations only.

Writer2 readiness independently revalidates those conditions at apply time.

Transfer UI reports separately:
- BM correspondence coverage;
- canonical physical Writer2 candidates;
- duplicate corroborations;
- actual APPLY count;
- EXCLUDE count.

Row count alone is never a benchmark PASS criterion; physical key-set equality is required.

## Independent benchmark oracle
Test-only `tests/cii-workspace-multisource-texpected-oracle.js` does not use production mutation selection to derive expected operations.

It independently parses:
- CONTROL.NONAM;
- 15-row ELEMENT records and NODENAME pointer field;
- fixed-width NODENAME FROM/TO fields;
- physical node → exact raw name state.

It derives:
- CREATE / DELETE / REPLACE physical name delta;
- exact-name relocations;
- deterministic Transfer keys `ACTION|targetNode|exactName`;
- Writer2-authorized encoding equality;
- physical semantic equality;
- preservation outside Writer2 authority.

Suffix-only mode is diagnostic only: actual `SL-106` vs expected `SL-106.3` may be classified as suffix-only, but wrong sibling, wrong target/pointer, row count, other field, or unrelated section change remains a real failure.

### Mixed-domain retained expected artifact
An unattached Git analysis commit `d5304e82ee4257a513a86526e380b97b27893dfb` projected the frozen TEXPECTED blob onto `Benchmark/T.CII`, allowing GitHub to compare the two retained blobs server-side without modifying a branch or benchmark file.

Observed retained diff:
- 64 additions;
- 63 deletions;
- 127 changed lines.

Besides Writer2 NODENAME/CONTROL/pointer changes, the diff contains unrelated changes including a support/comment record and `ALLOWBLS` values. These are recorded as foreign expected-file deltas, not mutation instructions.

Final postimage acceptance is therefore:
```text
TEXPECTED exact equality inside Writer2 NODENAME authority
AND
original T exact preservation everywhere outside Writer2 NODENAME authority
```

## Retained end-to-end hard gate
New:
`tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js`

It is designed to execute the complete retained path without manual benchmark anchors:
1. load S1/S2/S3/T/TEXPECTED;
2. inspect all three sources through the frozen V11↔V14 bridge;
3. independently run conservative topology Auto Anchor for S1/S2/S3;
4. require all three unique READY topology bases;
5. build first production preview;
6. auto-review only identity-bound HIGH/MEDIUM rows, preserving LOCKED and not auto-accepting REVIEW;
7. rebuild production preview;
8. require correspondence READY with zero conflicts;
9. derive canonical physical Transfer mutation set;
10. require exact row count and exact set equality to the independent T→TEXPECTED oracle;
11. bind scope and require complete 329-row BM correspondence coverage;
12. require Writer2 readiness;
13. apply to a target copy through the frozen bridge;
14. require exact TEXPECTED encoding/semantics inside Writer2 authority;
15. require original-T preservation outside Writer2 authority;
16. print Auto Anchor, correspondence, Transfer, BM, Compare, and owner-checkpoint diagnostics.

This test contains no manual retained node anchors and does not use the three owner checkpoint pairs as authority.

## Changed files
### Production
- `tabs/cii-workspace/cii-workspace-base-loop-selection.js`
- `tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js`
- `tabs/cii-workspace/cii-workspace-multisource-preview.js`
- `tabs/cii-workspace/cii-workspace-multisource-scope.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js`

### Tests / evidence
- `tests/cii-workspace-base-loop-selection.test.js`
- `tests/cii-workspace-multisource-bm001-exact-alias.test.js`
- `tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js`
- `tests/cii-workspace-multisource-texpected-benchmark.test.js`
- `tests/cii-workspace-multisource-texpected-oracle-unit.test.js`
- `tests/cii-workspace-multisource-texpected-oracle.js`
- `tests/cii-workspace-multisource-transfer-cardinality-ui.test.js`
- `tests/cii-workspace-writer2-nodename-dotted-regression.test.js`
- `agents/PR1112_workreport.md`

Benchmark files, BM authority data/digest, workflows, Writer1/Writer3, and unrelated target data are not modified.

## Validation ledger
| Gate | Status | Evidence |
|---|---|---|
| retained source dotted-name inspection | PASS | exact dotted identities observed |
| exact BM alias / family / sibling logic | PASS_ISOLATED | exact `.X` positive; family/wrong-sibling negatives |
| BM correspondence vs cardinality separation | PASS_ISOLATED | helper/scope regressions authored; focused mirror executed |
| duplicate corroboration / sibling conflict logic | PASS_ISOLATED | identical claims collapse; different aliases same target conflict |
| dotted fixed-width serialization | PASS_ISOLATED | `.3` and `.14` preserved with stable columns |
| canonical review-only base leak | PASS_ISOLATED | review-only row cannot project Method A/B base |
| conservative Auto Anchor policy | PASS_ISOLATED | strongest/equivalent/ambiguous/review cases covered |
| scoped benchmark oracle synthetic suite | PASS_ISOLATED | exact, suffix-only, wrong-pointer, wrong-sibling, foreign ALLOWBLS cases covered |
| mixed-domain TEXPECTED discovery | PASS_SERVER_DIFF | frozen retained blobs compared server-side; 127-line mixed-domain diff |
| full 329-row BM branch test | AUTHORED_NOT_RUN | repository checkout executor unavailable |
| retained expected Transfer count/set/hash | AUTHORED_NOT_RUN | retained diagnostic test will derive it |
| retained Auto Anchor → correspondence | AUTHORED_NOT_RUN | new hard-gate test exists |
| retained Transfer exact set/cardinality | AUTHORED_NOT_RUN | new hard-gate test exists |
| retained Writer2 apply / final Compare | AUTHORED_NOT_RUN | new hard-gate test exists |
| owner checkpoint semantics | NOT_RUN | hard-gate diagnostic will derive evidence |
| GitHub Actions / commit status | NOT_RUN | no PR workflow run/status observed |
| full repository/browser regression | NOT_RUN | no branch checkout executor available in current environment |
| external CAESAR validation | NOT_RUN | not executed |

`PASS_ISOLATED` is not promoted to retained-real PASS.

## Current acceptance state
### Proven / implemented
- exact dotted raw names are distinct writable identities;
- canonical families cannot authorize physical anchors or writes;
- BM correspondence and Writer2 mutation authority are separated;
- duplicates do not inflate physical Transfer APPLY count;
- competing exact siblings cannot silently win;
- fixed-width writing retains suffixes;
- benchmark expected data is not read by production;
- mixed-domain TEXPECTED foreign edits do not authorize unrelated production mutations;
- conservative topology-only Auto Anchor selection exists with ambiguity veto.

### Explicitly not yet proven
- exact expected Transfer APPLY count and set for the real retained files;
- which exact Auto Anchor each S1/S2/S3 retained source chooses;
- retained correspondence row set / zero-conflict result;
- retained BM 329/329 coverage through the real production preview;
- retained final Writer2 postimage;
- exact meanings/results of `8870→9040`, `10350→10190`, `1005→925`;
- exact Compare=0 result under the scoped three-way oracle.

## Anti-gaming boundary
- no production branch on benchmark node IDs, checkpoint IDs, expected row count, or expected aliases;
- production does not import or read TEXPECTED;
- BM authority text/digest is unchanged;
- no tolerance for wrong sibling or wrong target;
- no attempt to copy TEXPECTED's unrelated support/ALLOWBLS edits;
- Auto Anchor is not enabled in UI before retained qualification;
- no merge/ready status until retained hard gate and neighboring regressions execute.

## Exact next action
Run the branch from a real repository checkout capable of reading the retained 2.86 MB files:
```text
node tests/cii-workspace-base-loop-selection.test.js
node tests/cii-workspace-multisource-bm001-exact-alias.test.js
node tests/cii-workspace-multisource-transfer-cardinality-ui.test.js
node tests/cii-workspace-writer2-nodename-dotted-regression.test.js
node tests/cii-workspace-multisource-texpected-oracle-unit.test.js
node tests/cii-workspace-multisource-texpected-benchmark.test.js
node tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js
```

Only if the retained end-to-end gate passes should `ciiAutomaticBaseSelection()` be wired into the multi-source UI's `selectedBySource` seed. If it fails, use its stage diagnostics to repair the first wrong Auto Anchor/correspondence/Transfer boundary; do not weaken the oracle or hard-code the benchmark.
