# CII Phase 2 — original Owner inputs, physical custody and mid-cycle correction

**Governance:** [Issue #106: Mid cycle correction](https://github.com/reallakshman19/XML_Compare_Utilities/issues/106), [draft PR #107](https://github.com/reallakshman19/XML_Compare_Utilities/pull/107). This directory holds **test-only** owner input. Do not import its names, ordinals, mappings or expected target values into a production matcher, confidence calculation, Writer2 scope or automatic-seed selection.

## Complete input ledger (as supplied, unmodified)

| Role | Location in repository | Original SHA-256 |
|---|---|---|
| S1 SOURCE | [Benchmark/S1.CII](../../../Benchmark/S1.CII) | `9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b` |
| S2 SOURCE | [Benchmark/S2.CII](../../../Benchmark/S2.CII) | `7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd` |
| S3 SOURCE | [Benchmark/S3.CII](../../../Benchmark/S3.CII) | `c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa` |
| T TARGET | [Benchmark/T.CII](../../../Benchmark/T.CII) | `abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060` |
| Partial postimage only | [Benchmark/TEXPECTED-PARTIALLLYDONE.CII](../../../Benchmark/TEXPECTED-PARTIALLLYDONE.CII) | Verified by separate 36-delta oracle; not the 428-row golden |
| Owner original attachment | [owner-phase2-original.txt](./owner-phase2-original.txt) | `a84bd6cd59b774d32dbd32ee74efc0f9da2fc1ac0e485d2a8b2f6a67350a113f` |
| Owner original metadata | [owner-phase2-manifest.json](./owner-phase2-manifest.json) | Describes attached source bytes, row/line counts, initial proposed target 70% |
| Owner-confirmed direction and counting | [owner-confirmed-direction.json](./owner-confirmed-direction.json) | SL(S1/S2/S3) → PS(T), original 428 rows preserved |

Use the **original pinned snapshot** at [commit `2e588a5469f463b177990d7f8683deb56ce48a0e`](https://github.com/reallakshman19/XML_Compare_Utilities/tree/2e588a5469f463b177990d7f8683deb56ce48a0e/Benchmark) when adjudicating exact source content. `TEXPECTED-PARTIALLLYDONE.CII` is spelled that way in the original. The original owner text is also reproduced verbatim in **Appendix A of Issue #106**.

## Supplementary provenance search (not a substitute for pinned fixtures)

The `tests/cii-workspace-phase2-owner-corpus-provenance.mjs` run inspects **every `.CII` under `Benchmark/`**, including these additional original checked-in fixtures: [CIICompare/SOURCE 3.CII](../../../Benchmark/CIICompare/SOURCE%203.CII), [CIICompare/TARGET 3-1.CII](../../../Benchmark/CIICompare/TARGET%203-1.CII), [CIICompare/BM_CII_SOURCE.CII](../../../Benchmark/CIICompare/BM_CII_SOURCE.CII), [BM_CII_TARGET1.CII](../../../Benchmark/CIICompare/BM_CII_TARGET1.CII), [BM_CII_TARGET2.CII](../../../Benchmark/CIICompare/BM_CII_TARGET2.CII). It also reads `TEXPECTED-PARTIALLLYDONE.CII` but never treats that *postimage* as an original TARGET.

**Observed on the frozen retained corpus:** 10 conforming original `.CII` files, 103 distinct Owner PS labels and 68 distinct Owner SL labels in non-pinned files; 38 owner rows have their PS and SL labels **somewhere** in the combined corpus, but **none** has both names in a single alternate CII. These are only provenance clues, not physical SOURCE→TARGET pair proof. Generated `owner-alternate-fixture-provenance.json` includes each file's recomputed SHA-256 and exact matching names. Preserve the pinned S1/S2/S3/T authority and frozen 428 rows.

## Repository-wide corroboration beyond Benchmark/

A repository-tree inspection found **13 non-mirrored `.CII` files** (10 under `Benchmark/`, two under `converters/scripts/`, and the root `output.cii`). The supplementary parser now checks **all 13** in a single fixture-provenance run while deliberately excluding `docs/` copies of the same inputs:

- [converters/scripts/inputxml_profile_bm_cii_2019.cii](../../../converters/scripts/inputxml_profile_bm_cii_2019.cii)
- [converters/scripts/inputxml_profile_sys30_b7410250_benchmark.cii](../../../converters/scripts/inputxml_profile_sys30_b7410250_benchmark.cii) — **fails strict independent 15-row ELEMENTS decoding** and therefore is reported as `ORACLE_ELEMENT_ROW_COUNT_NOT_MULTIPLE_OF_15`, not silently skipped or assigned names
- [output.cii](../../../output.cii)

On the retained corpus, **12 parsed successfully; one did not**. The additional converter/root files contribute **no additional original Owner PS/SL pairs**, so the pinned benchmark mismatch remains: 33 unique reverse-direction physical candidates, the other 395 original rows unresolved. [Issue #106](https://github.com/reallakshman19/XML_Compare_Utilities/issues/106) governs any new Owner-sanctioned original fixture source and alternate physical denominator.

## Owner-confirmed direction, conditional physical scoring and acceptance cap

Owner confirms the second original column **SL** is the SOURCE NodeName in S1/S2/S3; the first original column **PS** is the TARGET NodeName in T. The raw order and all 428 relations remain immutable. Run `node tests/cii-workspace-phase2-owner-conditional-coverage.test.js` and `node tests/cii-workspace-phase2-owner-physical-acceptance.test.js`, followed by the retained 428-row benchmark runner above. The pure [test-only conditional physical scorer](../../cii-workspace-phase2-owner-conditional-coverage.js) independently compares SOURCE-member+physical NODE IDs and T physical NODE IDs to the matcher-produced full source-target audit, with wrong-target, global competing TARGET, ambiguous-source and duplicate-credit vetoes. The original 428-row denominator and `P2_VALIDATED_RECALL: null` never change. Unverified production BOUND claims outside the original-name-resolvable 33 are **not** misreported as physical benchmark passes or false positives.

The benchmark additionally exports `owner-confirmed-one-to-one-acceptance.json` and the Owner-confirmed decision fixture. **Required 300 distinct physical credits versus at most 150 original SOURCE physical nodes** means the 70% threshold **FAILS STRUCTURALLY ON THESE PINNED FILES** under the one-to-one source/target counting rule; observed 33/33 conditional AUTO agreement does not establish globally certified R. The benchmark exports `owner-original-physical-conditional-coverage.json`, `owner-original-physical-conditional-coverage-428.csv`, `owner-original-physical-conditional-agreements.csv`, and the [Owner's adjudication packet](https://github.com/reallakshman19/XML_Compare_Utilities/issues/106) as `owner-benchmark-adjudication-packet.{md,json}`, with the full 33-member mapping table, missing original label samples and exact requested fixture/occurrence decisions.

## Owner clarification: SOURCE is the cumulative **S1 + S2 + S3** physical set

The original source set is not any one CII file or whichever file has the most nodes. In all acceptance calculations, **SOURCE = the member-scoped union `(S1,NODE_ID) ∪ (S2,NODE_ID) ∪ (S3,NODE_ID)`**. A repeated numeric node ID from two SOURCE members represents **two distinct physical source-node occurrences**, never one collapsed numeric ID. Member-scoped original elements/NODENAME pointers remain independent, and TARGET is original T.CII only.

| Original file | Original physical SOURCE NODEs | Original named physical NODEs | Owner SL NodeNames found | Owner SL→PS pairs uniquely resolved |
|---|---:|---:|---:|---:|
| S1.CII | 57 | 38 | 1 | 0 |
| S2.CII | 47 | 34 | 24 | 19 |
| S3.CII | 46 | 32 | 21 | 14 |
| **Cumulative SOURCE** | **150** | **104** | **46** | **33** |

These are **aggregate real-file results**, not a SOURCE=one-file shortcut. The frozen Owner table has 428 original relations. Across cumulative SOURCE versus T, **33 rows have both names, 13 have only SOURCE SL, 73 only TARGET PS, 309 neither**; 428 rows accounted for. The report distinguishes repeated cross-member numeric IDs and cross-member NodeName aliasing from valid uniquely attributed pairs.

Replay `node tests/cii-workspace-phase2-cumulative-source-reconcile.mjs`. This produces `owner-cumulative-S1-S2-S3-reconciliation.{json,md}` and the full `owner-cumulative-S1-S2-S3-428-rows.csv`, with member-specific candidates for every original Owner row. If all 150 cumulative SOURCE physical NODEs were correctly matched **once each**, the one-to-one physical ceiling would still be **150/428 = 35.05%**, below the original 300/428 target. This counting result is not a claim that the 33/33 conditionally agreed pairs are globally physically certified, nor that the user has authorized any different row-denominator contract.

## Full original SOURCE population reconciliation — no authorized ≥300-node replacement

The reproducible [population reconciliation test](../../cii-workspace-phase2-original-population-reconcile.mjs) independently parses **all 13 non-mirrored CII files in the repository**, counting **distinct numeric physical FROM/TO NODE IDs** rather than element counts, repeated names, or raw golden rows. Its outputs are `owner-original-physical-population-reconciliation.{json,md}` and `owner-source-population-candidate-inventory.csv`, archived with the 428-row acceptance artifact.

- Original pinned SOURCE: **S1 57 + S2 47 + S3 46 = 150** distinct member-scoped physical NODEs. Exact SOURCE SL label presence: S1 1 physical node, S2 24, S3 21. **382** of the original 428 owner rows reference an SL label absent from all three.
- Original TARGET T: **1,619** physical NODEs; **322** of the owner rows refer to a PS target label absent from original T. Only **33** original owner physical SOURCE→TARGET candidate pairs resolve uniquely and agree conditionally with AUTO results.
- Alternative [SOURCE 3.CII](../../../Benchmark/CIICompare/SOURCE%203.CII): **221** original physical NODEs but **0 owner SL SOURCE NodeNames**; alternative [TARGET 3-1.CII](../../../Benchmark/CIICompare/TARGET%203-1.CII) has **225** physical NODEs and **0 owner SL SOURCE NodeNames**. Other candidate source files: at most **66** physical NODEs, with **0** matching owner SL source names.
- Only **[T.CII](../../../Benchmark/T.CII)** and the **[partial TARGET postimage](../../../Benchmark/TEXPECTED-PARTIALLLYDONE.CII)** have ≥300 original physical NODEs, but neither is an admissible SOURCE. One CII converter file fails strict original ELEMENTS parsing and is excluded.
- The physical one-to-one 428-row contract has an upper bound of **150/428=35.05%**, below required **300/428**; the benchmark therefore has a **structural FAIL**. Neither merging unrelated CII jobs nor relabeling TARGET nodes as SOURCE creates a defensible acceptance fixture.

Original pinned S1/S2/S3/T files each have only one GitHub commit affecting their tracked path (original upload dated 2026-09-03), so no earlier **tracked revision under those same paths** provides a replacement SOURCE population. This statement does **not** prove an external Owner file does not exist. An independently supplied and byte-hashed original SOURCE fixture with ≥300 eligible physical node obligations and valid Owner NodeName/occurrence provenance is necessary before the original ≥70% requirement can be qualified.

## Required mapping: never confuse numeric NODE with NodeName

The user explicitly corrected the approach: **`NodeName → physical NODE`** must be decoded **first**. The CII format stores original node names indirectly:

1. Read each original `#$ ELEMENTS` 15-row fixed-field block and its named-node pointer.
2. Follow the pointer into the original `#$ NODENAME` FROM/TO name fields.
3. Assign each exact NodeName to its actual physical FROM/TO NODE ID, separately within S1, S2 and S3 and within T.
4. Build SOURCE `NodeName → [{memberId, nodeId}]` and TARGET `NodeName → [{nodeId}]` (multi-value indexes, no first-match coercion).
5. Convert each of the 428 immutable intended Owner row pairs to original physical candidate matches **in tests only**. Track original as-written columns and the Owner-confirmed **SL SOURCE → PS TARGET** interpretation separately; raw bytes are not rewritten.
6. Independently compare qualified solver output with uniquely resolved owner physical pair candidates; never use label agreement alone to certify physical correspondence.

**Known unmodified original owner input:** 428 paired lines among 436 text lines; 350 distinct first-column PS labels, 428 distinct second-column SL labels. `PS02687.1` appears 78 times and `PS02694.1` twice. Preserve `SL-263..5`, `SL-265..4`, `SL-275-A.8`.

## Reproduction

```bash
node tests/cii-workspace-owner-phase2-input.test.js
node tests/cii-workspace-phase2-owner-midcycle-forensics.test.js
node tests/cii-workspace-phase2-owner-physical-acceptance.test.js
node --max-old-space-size=4096 tests/cii-workspace-phase2-owner-retained-measure.mjs
```

Implementation: [independent original CII fixed-field parser](../../cii-workspace-multisource-texpected-oracle.js), [NodeName index and per-row candidate resolver](../../cii-workspace-phase2-owner-nodename-index.js), [mid-cycle row reason/duplicate analysis](../../cii-workspace-phase2-owner-midcycle-forensics.js), [original retained benchmark diagnostic](../../cii-workspace-phase2-owner-retained-measure.mjs).

The retained benchmark generates artifacts in `test-results/cii-phase2/` (not inputs):

- `original-source-nodename-to-node.csv` (complete S1/S2/S3 original-name→physical-node assignments)
- `original-target-nodename-to-node.csv` (complete original T name→node assignments)
- `owner-golden-physical-pair-resolution.csv` (428 rows, as-written and reversed candidate lists)
- `owner-midcycle-as-written-428.csv` and `owner-midcycle-transposed-428.csv` (all rows, exact name occurrence/ambiguity and reason)
- `owner-midcycle-33-resolved-physical-pairs.csv` (only uniquely resolved reverse-direction candidate oracle)
- `owner-midcycle-reconciliation.json` (complete categories, duplicate physical-pair credits, per-SOURCE counts)
- `phase2-owner-diagnostic.csv` and `phase2-owner-diagnostic.json` (existing retained comparison report)

[Previously published real-file index artifact](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/38836598948/artifacts/12019302054); later workflow runs add mid-cycle reports.

## Expected outcome and release caveats

A reproducible physical-node candidate oracle for every **resolvable** original owner row and honest exception classifications for all 428. Original S1+S2+S3 have **150 distinct physical nodes, 104 named**, so **Owner-confirmed physical counting** admits at most 150 distinct SOURCE-node credits, **150/428 = 35.05%**, below the required 300/428, irrespective of matcher tuning. On the pinned input, as-written PS(SOURCE)→SL(T) resolves zero; Owner-confirmed SL(SOURCE)→PS(T) resolves **33** uniquely grounded pairs corroborated by existing AUTO output, and does not resolve the remainder. Keep the raw PS-first owner file untouched; the Owner explicitly confirmed the *physical* SL-first interpretation, not a new fixture revision or multiple credits per source. Do not mark those 33 as independently certified `P2_VALIDATED_RECALL` without full physical proof.

**Method A five factors stay 35/25/20/10/10; Method B original ≥2 independent axes, topology, OD and ambiguity gates remain unchanged.** Normalized 100mm paths are dimensional evidence only. Writer1C/Writer2 gates, scope identity, original graph and exact-byte custody are never bypassed. Issue #106 remains open and PR #107 remains draft until independent qualification.
