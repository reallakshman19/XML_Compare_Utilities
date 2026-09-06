# PR1112 — CII Writer2 benchmark-exact repair work report

## PR Mission Control
- Mission: repair Utilities → CII Writer 2 — V11/V14 so exact retained S1/S2/S3 → T can be proven against `Benchmark/TEXPECTED-PARTIALLLYDONE.CII`, with independently correct Auto Anchor/correspondence, exact Transfer APPLY set/cardinality, exact Compare result, and full raw dotted NODENAME identity.
- Source task / issue: #1111; parent programme #1083.
- PR: #1112 — DRAFT / OPEN / OWNER_ONLY_MERGE.
- Branch: `fix/cii-writer2-benchmark-exact-wp006`.
- Base commit: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4`.
- Product HEAD before this report refresh: `de5fd8f86a7f229028f20aa474999dfd93ee0e2c`.
- Engineering status: PATCHED_PENDING_RETAINED_REAL_QUALIFICATION.
- Validation status: focused isolated checks PASS; repository checkout / retained-real / CI NOT_RUN.
- Merge authority: OWNER_ONLY; no merge is authorized.

## Handover in 60 Seconds
The visible `.X` symptom was not a fixed-column width defect. Three generic authority defects were found and repaired:

1. **Review-only canonical-name discovery could become automatic base authority.** `buildCiiSelectedBaseLoops()` accepted selected Method A/B-looking rows without rejecting `reviewOnly` / `EXISTING_NODE_NAME_REVIEW_DISCOVERY_ONLY` evidence. Canonical `SL-106` family matching could therefore influence physical correspondence.
2. **BM-001 exact aliases use optional leading `/` notation.** Raw CII `SL-106.3` did not directly equal BM `/SL-106.3`; lexical slash normalization is now allowed while `.X` remains exact.
3. **BM-001 correspondence and Writer2 cardinality were conflated.** BM-001 is the frozen 329-row `source alias -> target name` correspondence acceptance list. A Writer2 CREATE necessarily has blank target NODENAME and a DELETE necessarily has blank source NODENAME, so BM label-pair equality cannot itself be the CREATE/DELETE authorization rule. BM-001 now proves correspondence coverage; Writer2 CREATE/DELETE eligibility is separately derived from reviewed physical target cardinality.

Additional Transfer fixes:
- identical S1/S2/S3 physical mutations collapse to one deterministic APPLY with corroborating provenance;
- different dotted proposals for the same target (`SL-106.3` vs `SL-106.4`) are explicit conflicts and cannot auto-select;
- scope and Writer2 readiness both re-check these invariants;
- Transfer UI reports BM correspondence coverage separately from physical candidate/APPLY cardinality.

Core rule: **normalize notation for matching; preserve exact raw identity for writing.**

## Frozen inputs / oracle
Pinned at base commit `96b09485...`:

| Role | Path | Git blob | Size |
|---|---|---|---:|
| SOURCE S1 | `Benchmark/S1.CII` | `73c49165b9d33a8c776ef76f480efec3a90e0c93` | 108330 |
| SOURCE S2 | `Benchmark/S2.CII` | `a04622553720cb41a6fc2a4b85d8290eac7a3b0a` | 90961 |
| SOURCE S3 | `Benchmark/S3.CII` | `a20b1ab87dd4e854cf2f453f8fd206be4b566b42` | 90942 |
| TARGET0 | `Benchmark/T.CII` | `96b4a4b12bf66bcb0264c56e7767a857c4cc11e6` | 2866002 |
| EXPECTED | `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` | `b7d0913a3827deb184d65c880594ca0667562167` | 2866022 |

Direct retained-file source inspection established:

```text
T.CII CONTROL.NONAM                    = 1265
TEXPECTED-PARTIALLLYDONE CONTROL.NONAM = 1266
```

So the retained expected postimage has net NODENAME physical-row cardinality `+1`. This does **not** establish the total CREATE/DELETE APPLY count.

Owner checkpoint pairs remain frozen but semantically unresolved until the independent retained benchmark test executes:

```text
8870 -> 9040
10350 -> 10190
1005 -> 925
```

They are not hard-coded into production logic.

## Root-cause findings
### F-001 — raw source data is exact
Retained sources contain dotted sibling identities including `SL-106.2`, `SL-106.3`, and `SL-106.4`. Source fixture data is not truncated.

### F-002 — physical writer widths are sufficient
NODENAME FROM/TO widths are 26/25 characters. `SL-106.3` and two-digit suffixes such as `SL-121.14` fit. Writer2 relocation helpers preserve field width and adjacent-column position.

### F-003 — canonicalization is intentionally family-level
`cii-workspace-node-name-corroboration.js` maps siblings such as `SL-106.3` and `.4` to family key `SL-106`. That remains legitimate only for review/corroboration discovery.

### F-004 — canonical discovery leaked into selectable base authority
`cii-workspace-base-loop-selection.js` did not exclude review-only canonical discovery rows. Fixed by rejecting review-only/discovery-only authority before Method A/B loop projection.

### F-005 — exact BM alias notation mismatch
BM-001 stores aliases such as `/SL-106.3`; CII evidence may carry `SL-106.3`. Matching now treats one optional leading slash as lexical notation only. `SL-106`, `.3`, and `.4` remain different writable identities.

### F-006 — BM-001 is correspondence authority, not mutation value authority
The frozen BM table is 329 rows of source aliases mapped to target names. It is now used to require full exact correspondence coverage. Writer2 CREATE/DELETE is separately qualified from exact reviewed target identity plus before/proposed cardinality.

### F-007 — corroborating multi-source writes could inflate Transfer cardinality
Identical physical mutation keys are now grouped as one APPLY. Duplicate source claims remain recorded as corroboration and are EXCLUDE in the explicit scope.

### F-008 — same-target different aliases are conflicts
Different exact proposals for one physical target are blocked at scope bind and re-blocked at Writer2 readiness. Family similarity never resolves the conflict.

## Production changes
| File | Purpose |
|---|---|
| `tabs/cii-workspace/cii-workspace-base-loop-selection.js` | prevent review-only canonical-name suggestions from becoming automatic base loops |
| `tabs/cii-workspace/cii-workspace-multisource-preview.js` | exact BM alias binding with optional leading-slash notation only |
| `tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js` | separate BM correspondence coverage, Writer2 cardinality qualification, physical mutation identity/dedupe/conflict |
| `tabs/cii-workspace/cii-workspace-multisource-scope.js` | require full BM correspondence coverage; bind canonical physical CREATE/DELETE set; reject conflicts |
| `tabs/cii-workspace/cii-workspace-multisource-writer2-readiness.js` | revalidate coverage, APPLY qualification, duplicates/conflicts and existing custody at apply time |
| `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` | show correspondence coverage separately from physical candidates/APPLY; remove obsolete “BM-bound CREATE/DELETE” semantics |

Protected benchmark files, BM authority text/digest, converter, Writer1/Writer3, workflows, and unrelated CII sections are unchanged.

## Independent expected-data path
`tests/cii-workspace-multisource-texpected-oracle.js` is deliberately test-only and does **not** import production Writer2 transfer/mutation selection helpers. It independently reads CII section geometry to derive:
- target-node NODENAME CREATE/DELETE/REPLACE deltas;
- exact raw-name relocations;
- deterministic expected Transfer operation keys;
- strict whole-file comparison that may classify only an exact same-stem missing numeric suffix as `suffixOnly`.

A wrong target pointer, wrong sibling, line-count difference, non-NODENAME change, or outside-field change remains a real failure.

`tests/cii-workspace-multisource-texpected-benchmark.test.js` is the retained-real executable. From a normal repository checkout it reads `T.CII` and `TEXPECTED-PARTIALLLYDONE.CII`, asserts no same-node REPLACE requirement, derives the exact CREATE/DELETE key set/count/hash, and reports whether the three Owner checkpoint pairs are exact-name relocations.

## Regression inventory
- `tests/cii-workspace-base-loop-selection.test.js` — review-only canonical suggestion cannot produce base authority.
- `tests/cii-workspace-multisource-bm001-exact-alias.test.js` — exact slash/dotted identity, family/sibling negatives, full 329-row synthetic BM coverage, physical CREATE/DELETE semantics, corroboration dedupe, same-target sibling conflict.
- `tests/cii-workspace-writer2-nodename-dotted-regression.test.js` — `SL-106.3`, `SL-121.14`, field lengths, adjacent-column preservation.
- `tests/cii-workspace-multisource-transfer-cardinality-ui.test.js` — UI shows canonical physical count; duplicate corroboration counts once.
- `tests/cii-workspace-multisource-texpected-oracle-unit.test.js` — independent synthetic T/TEXPECTED parser/delta and strict suffix-only classifier.
- `tests/cii-workspace-multisource-texpected-benchmark.test.js` — retained-real oracle/count/checkpoint derivation.

## Validation ledger
| Validation | Status | Evidence |
|---|---|---|
| retained source/BM dotted identity inspection | PASS | exact `.X` aliases observed in S1/S2/S3 and BM text |
| base-loop review-only selection regression | PASS_ISOLATED | exact Git module/test mirror executed earlier; review-only candidate produced no qualified base loop |
| independent TEXPECTED oracle synthetic suite | PASS_ISOLATED | synthetic fixed CII CREATE/DELETE relocation, wrong-pointer and wrong-sibling falsifiers passed |
| repaired physical identity/cardinality logic | PASS_ISOLATED | current isolated mirror: identical claims dedupe; `.3` vs `.4` same target conflicts |
| dotted fixed-column serialization | PASS_ISOLATED | current isolated mirror: `SL-106.3` and `SL-121.14` preserved; TO column not shifted |
| full 329-row BM scope regression | AUTHORED_NOT_RUN | branch test exists; repository checkout execution unavailable in current connector runtime |
| Transfer cardinality UI regression | AUTHORED_NOT_RUN | branch test exists; repository checkout execution unavailable |
| retained-real `T -> TEXPECTED` benchmark | AUTHORED_NOT_RUN | full 2.86 MB private blobs could not be materialized into execution runtime |
| exact Transfer APPLY count/set | NOT_RUN | will be emitted by retained benchmark + production E2E |
| Owner checkpoint semantic derivation | NOT_RUN | retained benchmark executable probes all three pairs |
| final production postimage Compare vs TEXPECTED | NOT_RUN | requires retained-real production E2E |
| GitHub Actions / commit status | NOT_RUN | current PR head has zero workflow runs and zero statuses |
| full repository / browser | NOT_RUN | no branch checkout executor available here |
| external CAESAR acceptance | NOT_RUN | not executed |

## Current acceptance state
### Proven by source inspection / focused repair
- canonical family keys are no longer automatic anchor authority;
- exact dotted aliases remain distinct through BM matching and physical mutation identity;
- BM correspondence and Writer2 cardinality authorities are separated;
- identical multi-source physical writes are deduped;
- different dotted siblings for one target are conflicts;
- physical NODENAME field width does not require suffix truncation;
- no benchmark-specific production node/count/checkpoint branches were introduced.

### Still required before this PR can be called benchmark-exact
1. Execute `node tests/cii-workspace-multisource-bm001-exact-alias.test.js` from the repository checkout.
2. Execute `node tests/cii-workspace-multisource-transfer-cardinality-ui.test.js` and dotted-name regression.
3. Execute `node tests/cii-workspace-multisource-texpected-benchmark.test.js` to derive exact expected APPLY count/set/hash and checkpoint semantics.
4. Run real S1/S2/S3 + T through Auto Anchor/review → Transfer scope → Writer2 V11/V14 output.
5. Compare production postimage to TEXPECTED with missing/unexpected/wrong-target/wrong-action/wrong-name/duplicate/conflict all zero.
6. Run neighboring Writer2/bridge tests and broader repository/browser gates where available.

## Anti-gaming / rollback boundary
- No `if (nodeId === 8870)` or equivalent exists.
- Production does not read TEXPECTED or expected operation count.
- BM-001 data/digest is unchanged.
- TEXPECTED is not regenerated from production output.
- Scope does not tolerate wrong sibling aliases or non-suffix structural differences.
- If retained-real execution disproves the current authority split, rollback begins at the new multi-source BM correspondence/scope layer; do not weaken the independent oracle or fixed benchmark.

## Exact next action
Obtain a repository checkout/CI execution path for the draft PR head, run the focused branch tests and retained benchmark, then use the independently derived expected key set to compare the real Transfer APPLY set and final postimage. Keep any unresolved checkpoint interpretation as `NOT_RUN` rather than fitting production code to the supplied numbers.
