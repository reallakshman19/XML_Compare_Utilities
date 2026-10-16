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

Use the **original pinned snapshot** at [commit `2e588a5469f463b177990d7f8683deb56ce48a0e`](https://github.com/reallakshman19/XML_Compare_Utilities/tree/2e588a5469f463b177990d7f8683deb56ce48a0e/Benchmark) when adjudicating exact source content. `TEXPECTED-PARTIALLLYDONE.CII` is spelled that way in the original. The original owner text is also reproduced verbatim in **Appendix A of Issue #106**.

## Supplementary provenance search (not a substitute for pinned fixtures)

The `tests/cii-workspace-phase2-owner-corpus-provenance.mjs` run inspects **every `.CII` under `Benchmark/`**, including these additional original checked-in fixtures: [CIICompare/SOURCE 3.CII](../../../Benchmark/CIICompare/SOURCE%203.CII), [CIICompare/TARGET 3-1.CII](../../../Benchmark/CIICompare/TARGET%203-1.CII), [CIICompare/BM_CII_SOURCE.CII](../../../Benchmark/CIICompare/BM_CII_SOURCE.CII), [BM_CII_TARGET1.CII](../../../Benchmark/CIICompare/BM_CII_TARGET1.CII), [BM_CII_TARGET2.CII](../../../Benchmark/CIICompare/BM_CII_TARGET2.CII). It also reads `TEXPECTED-PARTIALLLYDONE.CII` but never treats that *postimage* as an original TARGET.

**Observed on the frozen retained corpus:** 10 conforming original `.CII` files, 103 distinct Owner PS labels and 68 distinct Owner SL labels in non-pinned files; 38 owner rows have their PS and SL labels **somewhere** in the combined corpus, but **none** has both names in a single alternate CII. These are only provenance clues, not physical SOURCE→TARGET pair proof. Generated `owner-alternate-fixture-provenance.json` includes each file's recomputed SHA-256 and exact matching names. Preserve the pinned S1/S2/S3/T authority and frozen 428 rows.

## Required mapping: never confuse numeric NODE with NodeName

The user explicitly corrected the approach: **`NodeName → physical NODE`** must be decoded **first**. The CII format stores original node names indirectly:

1. Read each original `#$ ELEMENTS` 15-row fixed-field block and its named-node pointer.
2. Follow the pointer into the original `#$ NODENAME` FROM/TO name fields.
3. Assign each exact NodeName to its actual physical FROM/TO NODE ID, separately within S1, S2 and S3 and within T.
4. Build SOURCE `NodeName → [{memberId, nodeId}]` and TARGET `NodeName → [{nodeId}]` (multi-value indexes, no first-match coercion).
5. Convert each of the 428 immutable intended Owner row pairs to original physical candidate matches **in tests only**. Track both as-written column order and a **separately labeled reversed-column diagnostic**; the latter is not authorized to rewrite the benchmark.
6. Independently compare qualified solver output with uniquely resolved owner physical pair candidates; never use label agreement alone to certify physical correspondence.

**Known unmodified original owner input:** 428 paired lines among 436 text lines; 350 distinct first-column PS labels, 428 distinct second-column SL labels. `PS02687.1` appears 78 times and `PS02694.1` twice. Preserve `SL-263..5`, `SL-265..4`, `SL-275-A.8`.

## Reproduction

```bash
node tests/cii-workspace-owner-phase2-input.test.js
node tests/cii-workspace-phase2-owner-midcycle-forensics.test.js
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

A reproducible physical-node candidate oracle for every **resolvable** original owner row and honest exception classifications for all 428. Original S1+S2+S3 have **150 distinct physical nodes, 104 named**, so the literal **300/428 ≥70%** criterion needs an explicitly ratified occurrence/denominator contract; it cannot be satisfied by inventing multiple independent SOURCE NODE identities. On the pinned input, as-written PS(SOURCE)→SL(T) resolves zero; opposite orientation SL(SOURCE)→PS(T) resolves **33** uniquely grounded pairs corroborated by the existing AUTO solver, and does not resolve the remainder. Do not silently reverse owner columns or mark the 33 as `P2_VALIDATED_RECALL` without a proper approved benchmark and independent global physical proof.

**Method A five factors stay 35/25/20/10/10; Method B original ≥2 independent axes, topology, OD and ambiguity gates remain unchanged.** Normalized 100mm paths are dimensional evidence only. Writer1C/Writer2 gates, scope identity, original graph and exact-byte custody are never bypassed. Issue #106 remains open and PR #107 remains draft until independent qualification.
