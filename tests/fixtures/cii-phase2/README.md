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

## Midcycle info W15 — genuine native Method B physical basis attempt, eight disputed TARGETs

W15 tests all **eight** untrusted geometric SOURCE→TARGET hypotheses against the **existing production-native** `qualifyCiiMethodBRunBasis()` evaluator on the original normalized SOURCE and TARGET topology graphs. This is *not* owner golden seeding, automatic base selection, permitted Writer2 authority, or an alternate identity rule. Native Method B tests retain their **two independent PIPE-run axis hard gate**, OD-scaled tolerance, topological terminal and run mapping requirements. Method A evidence is taken strictly from *already discovered native qualified loops*—never from manufacturing new three-anchor bases containing a proposed golden pair.

**Exact original real-file outcome:**

| SOURCE physical NODE | Provisional original T | Production-reviewed original T | Native independent SOURCE/T axes | Native B status |
|---|---:|---:|---|---|
| S1:3970 | 890 | 885 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S1:4020 | 895 | 890 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S1:4050 | 900 | 895 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S2:220 | 10140 | 10150 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S2:230 | 10150 | 10160 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S3:1810 | 9090 | 9100 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S3:1820 | 9100 | 9130 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |
| S3:1840 | 9130 | 21840 | 1 / 1 | REVIEW, TWO_AXIS_GATE_NOT_MET |

**All 8 fail the two-axis physical Method B basis** on both original SOURCE and proposed TARGET; **zero** have a native discovered exact-pair suggestion or existing qualified Method A base containing that pair. No qualifying exact-pair winner gap exists. The direct B evaluator operates on *a hypothetical pair* and cannot create a real auto-selected correspondence even if its physical basis had passed. W15's measured outcome: **0 new production BOUND / 0 independently certified original SOURCE physical NODE matches**.

Replay:
```bash
node tests/cii-workspace-phase2-midcycle-w15-native-basis-direct-probe.test.js
node --max-old-space-size=4096 tests/cii-workspace-phase2-owner-retained-measure.mjs
```

The real retained benchmark writes `midcycle-w15-eight-untrusted-native-methodab-direct-probes.json` and `.csv`, containing original physical SOURCE/T NODE IDs, native source/target axis counts, original qualified run basis, OD-scaled tolerance, Method A discovered anchor loop membership, native exact-pair suggestions/winner-gap, full blocker codes and zero physical credit. [Read-only W15 genuine Method B probe](../../cii-workspace-phase2-midcycle-w15-native-basis-direct-probe.js); [native axis and nonpromotion negative tests](../../cii-workspace-phase2-midcycle-w15-native-basis-direct-probe.test.js).

**Contract preserved:** Midcycle SOURCE census remains **150**, independently certified **105/150 = 70% PASS** with **45** unverified. Original 428 Owner rows remain immutable and ≥300/428 release requirement separate/blocked. No Method A fixed 35/25/20/10/10 reweighting, Method B independent axes/winner-gap change, benchmark fixture substitution, AUTO/MANUAL provenance, arbitrary coordinate transform or Writer2 authority.

## Midcycle info W14: missing native Method A/B evidence and original CII registration

W14 reads **actual original pinned S1/S2/S3 and T CII** `#$ UNITS` and `#$ COORDS` registration, the unmodified production `baseAnchorSuggestions`, previously selected production loops, the previously certified 105 physical NODE pairs, and all eight production-vs-provisional TARGET disputes. The verifier is **test-only**, does **not** import W10 geometry guesses into native matching or create a new Writer2 eligible correspondence.

**Eight root-conditioned provisional T hypotheses (none can be credited):**

| SOURCE member:physical NODE | Provisional original T NODE | Existing production-reviewed T NODE |
|---|---:|---:|
| S1:3970 | 890 | 885 |
| S1:4020 | 895 | 890 |
| S1:4050 | 900 | 895 |
| S2:220 | 10140 | 10150 |
| S2:230 | 10150 | 10160 |
| S3:1810 | 9090 | 9100 |
| S3:1820 | 9100 | 9130 |
| S3:1840 | 9130 | 21840 |

For **all eight exact proposed SOURCE+TARGET node pairs**, the original native AUTO base-anchor suggestion enumeration has **zero matching records**. Therefore none has a *documented* READY Method A spatial three-anchor base, a *documented* READY Method B independent native topology/axis/OD qualification, or a verifiable native score/winner gap for that exact pair. Existing production review records address **a different T NODE** and do **not** confer authority on a root-conditioned geometric candidate. Absence of a suggestion **does not prove the physical hypothesis false**; it means no native A/B identity authority for it has been produced in this run. The standard **35/25/20/10/10 Method A weights**, Method B independent ≥2-axis/branch/OD/winner-gap hard gates, target nonreuse, AUTO/MANUAL custody and Writer2 remain unchanged.

**Three displacement failures and actual original registration:**

- Original CII COORDS provides **one absolute coordinate seed in each SOURCE member** S1/S2/S3 and **three in T**. Every source/target file labels length units **SI (mm)** and parses with zero contradictory original coordinate seeds. Registration is only valid in each seed-reachable original graph component; it is not a license to create an unconstrained inter-file rotation.
- **69** of the previously independently certified 105 physical SOURCE→TARGET roots have explicit absolute coordinate reconstruction available on **both** original SOURCE and T sides; across this covered sample no per-member offset discrepancy exceeds 100 mm. This is **registration corroboration on covered components**, not an approved transform or support for 36 unregistered root pairs.
- Source **S1:5200**, **S1:5220**, **S1:5229** each has three previously root-linked original TARGET path comparisons in the retained W12/W13 audit. The independently registered SOURCE–T relative signed-displacement residuals are approximately **111.803 mm** in each case, **above the unchanged 100 mm cap**. All original seed/root/end coordinates needed for these nine candidate-relative comparisons are available. A change of global coordinate translation cancels out of relative vectors; no unapproved rotation/axis swap is allowed, and none of these three gains identity credit.

**Reproducible artifacts:** `midcycle-w14-native-methodab-and-original-cii-coordinate-registration.json` contains all eight pair-specific missing Method A/B prerequisites, native SOURCE suggestion counts, production alternatives and evidence, 105 root coordinate availability, per-file original mm units/COORDS custody and all nine signed-vector comparisons. `midcycle-w14-eight-missing-native-methodab-evidence.csv` and `midcycle-w14-three-original-coordinate-registration.csv` are its review exports. Code: [W14 original registration and native method audit](../../cii-workspace-phase2-midcycle-w14-methodab-registration-review.js), [W14 adversarial controls](../../cii-workspace-phase2-midcycle-w14-methodab-registration-review.test.js), [retained original runner](../../cii-workspace-phase2-owner-retained-measure.mjs).

**Accounting:** W14 yields **zero new independent SOURCE physical NODE→TARGET certifications**. Midcycle first-stage acceptance remains **105/150=70.00% PASS**, **45 SOURCE NODEs unverified**. Original 428-row Owner benchmark remains separate, blocked, and unmodified. W14 never edits original CII geometry, expected NodeNames, Method A/B code or Writer2. PR #107 remains **DRAFT/unmerged**.

## Midcycle info W13: original CII component-type evidence and competing TARGET adjudication

W13 independently decodes original fifteen-row `#$ ELEMENTS` records rather than inferring **PIPE** from a straight, constant-OD geometric path. The element records retain explicit auxiliary references for bends, rigids, expansion-joint slots, SIF/tees and reducers; a nonzero relevant reference **vetoes** a plain PIPE segmentation hypothesis, while zero references only mean **plain-PIPE-compatible**, *not* an independently proven explicit PIPE type. The [original-record classifier](../../cii-workspace-phase2-midcycle-w13-actual-element-type-and-target-arbitration.js) and its [adversarial tests](../../cii-workspace-phase2-midcycle-w13-actual-element-type-and-target-arbitration.test.js) reject bend/rigid/reducer references, invalid element indexes, changed 100mm tolerance and unqualified Method A/B target claims.

**Original segmented-run candidate:** **S3 physical SOURCE NODE 1750**. Eight nearest original TARGET segment-run alternatives were examined. Some original SOURCE paths **contain nonplain auxiliary references**, and none of the eight satisfies the entire original **100 mm independent path-length + signed-vector + constant-OD straight-run geometry comparison**. Therefore the alleged split plain PIPE has **NO independently verified equivalent original element-type geometry**, and **zero NODE identities or Writer2 operations** result.

**Three displacement exceptions:** **S1 NODE 5200, 5220, 5229**. Each has three original length-compatible, signed-vector-incompatible original T path alternatives in the retained forensic sample, **none** passes the 100mm **reversed-direction** test. Re-registering by simple translation cannot alter relative vectors; no coordinate-frame transform is approved. The original SOURCE/T element indexes, signed root vectors, residual magnitude, orientation cosine and alternative TARGET IDs are retained to distinguish real revision/rotation evidence from any guessed orientation.

**Eight production-vs-provisional TARGET conflicts:** **S1:3970→production T:885, S1:4020→T:890, S1:4050→T:895; S2:220→T:10150, S2:230→T:10160; S3:1810→T:9100, S3:1820→T:9130, S3:1840→T:21840**. For each, the provisional geometric TARGET agrees with its **previously trusted original-root conditional geometry**, while the different original-T NODE in the existing production review does **not** satisfy that same complete check. Neither alternative can be promoted: the eight production reviews are **NOT production BOUND**, the required Method A/B confidence, independent two-axis/topology, winner-gap, ambiguity and global custody standards remain in force. No diagnostic input is injected into production matching.

The full retained replay exports `midcycle-w13-original-element-type-segment-vector-methodab.json`, `midcycle-w13-segmented-run-element-type-receipts.csv`, `midcycle-w13-three-original-displacement-frame-checks.csv` and `midcycle-w13-eight-production-methodab-target-conflicts.csv`, together with all W12/W11/W10 evidence and original physical NODE index/105 certificates.

**Midcycle numerator remains 105/150=70.00% PASS**, 45 physical SOURCE nodes unverified; **W13 newly qualified matches = 0**. Original 428-row Owner acceptance stays separate and blocked. No original input bytes, Method A (35/25/20/10/10), Method B gates, original 100mm path budget, AUTO/MANUAL arbitration or Writer2 authority changed. **PR #107 remains DRAFT/unmerged.**

## Midcycle info W12: original segmented-run and competing TARGET review

W12 is a **test-only read-only** follow-up to the proven **105/150 physical Midcycle PASS**. Its original-CII decoder searches shortest unique original paths from **independently verified** SOURCE(member,NODE)→T roots and recomputes each path's **original CII ELEMENTS** numeric OD, per-element signed displacement, total path length and branch incidence, keeping the physical dimensional budget fixed to **100 mm**. Candidate comparison does **not** assign production identity.

In the **23** previously root-located SOURCE nodes lacking a qualifying T candidate:
- **20** original source/T search cases have no candidate surviving the **100 mm aggregate path-length** stage after previous original OD/branch checks.
- **3** have original-OD/branch paths within **100 mm in length** but none satisfying the **100 mm signed displacement** gate. These are original-coordinate/revision diagnostics, **not** automatic orientation or segment equivalences.
- Among the displayed nearest OD/branch-compatible TARGET path alternatives, only **1** is flagged as a *constant-OD straight-path element-count difference proxy*; **no PIPE element-type, original engineering segment edit, or correspondence identity has thereby been proved**. A difference in element count never relaxes 100 mm or becomes a NODE match.

For the **8** original SOURCE nodes where production reviewed **a different TARGET** from the original-geometry hypothesis, W12 records both target NODE IDs, independent original shortest-root paths, original OD/branch flags, aggregate lengths, signed vectors and current TARGET non-reuse. It neither declares the production alternative wrong nor marks the W10 hypothesis correct.

The independent [W12 original geometry reviewer](../../cii-workspace-phase2-midcycle-w12-original-path-review.js) and [positive/negative fixture tests](../../cii-workspace-phase2-midcycle-w12-original-path-review.test.js) explicitly compare one straight constant-OD source element to a split two-element original TARGET route with the same total length and displacement, while rejecting **150 mm aggregate loss**, **reversed displacement**, **OD mismatch**, and attempts to change the mandatory 100 mm budget. The split-route check is **geometry-only**, not a proven PIPE TYPE or authorized Writer operation.

The CI replay exports `midcycle-w12-original-revision-geometry-and-eight-competing-targets.json`, `midcycle-w12-23-original-route-segmentation-review.csv`, and `midcycle-w12-eight-competing-targets-review.csv`, alongside 105 independent physical certificates, 22 production-qualification reviews and all 428 immutable Owner source rows. **W12 grants zero new correspondences.**

**Next evidence (W13):** review the **one** constant-OD segmentation proxy using the original ELEMENT TYPE and engineering branch/OD topology; independently adjudicate the **eight** different-T candidates against production Method A/B confidence and legitimate winner gaps; verify whether original revisions or SOURCE/T displacement registration explain the **three** signed-vector exceptions. Preserve all ambiguity/collision vetoes and Writer2 fail-closed scope. The original 428-relation release contract is unchanged.

## Midcycle info continuation: remaining 45 physical SOURCE nodes (W10)

After independently verifying **105/150**, a test-only [original-CII unresolved-node investigator](../../cii-workspace-phase2-midcycle150-unverified-forensics.js) reconciles the **remaining 45 member-scoped original SOURCE NODEs** against all **1,619 original T physical NODEs**. The original 105 physical certificates are the *only* trusted geometry roots. Original CII physical shortest-hop lengths, signed vectors, OD, branch incidence, globally occupied TARGET IDs and up to three nearest independently certified SOURCE physical roots constrain candidates; **none is automatically imported into Method A/B or Writer2**.

| Cumulative SOURCE member | SOURCE NODEs still unverified | Exactly one provisional original T candidate | No T candidate satisfying these original-geometry constraints |
|---|---:|---:|---:|
| S1 | 22 | 6 | 16 |
| S2 | 11 | 6 | 5 |
| S3 | 12 | 10 | 2 |
| **Total** | **45** | **22** | **23** |

**Current matcher state:** 34 unverified SOURCE nodes have **UNEMITTED** physical correspondences and 11 **UNRESOLVED**; no new BOUND node has been granted. All original unverified nodes are included, with original member:NODE, NodeName (where available), matcher reasons, trusted physical anchor evidence, original T candidate IDs and reason codes in:

- `midcycle150-unverified-45-original-geometry-forensics.json` and `.csv`;
- `midcycle150-priority-22-original-T-candidate-leads.csv` (a **read-only review queue**, explicitly `vettedPhysicalIdentity=false`);
- independent negative controls: `node tests/cii-workspace-phase2-midcycle150-unverified-forensics.test.js`.

**Important qualification:** A unique geometric candidate *conditional on up to three trusted original roots* is **not yet a production-qualified correspondence**. These 22 leads require independent Method A (five-factor weighted confidence) or Method B (≥2 independent axes, original graph branch/OD/winner gap) review and source/target custody before any canonical binding. The 23 missing candidates require investigation for genuine revision topology, OD/segment changes and original-graph path coverage, not arbitrary relaxation of 100mm or false reassignment. Do not create manual seeds from diagnostic Owner names or expected pairs.

**Midcycle accepted score stays exactly 105/150=70%; 45 remain uncredited.** The frozen original 428-row ≥300 distinct one-to-one SOURCE obligation is unchanged and separate.

## Midcycle info: 150-node first-stage independent physical milestone — 70% PASS

Owner explicitly directed the **first** physical milestone as **150 cumulative SOURCE physical NODEs** (S1=57, S2=47, S3=46) with **≥105/150 = 70%** independently verified correspondences. **This is separate from the original frozen 428-row golden and does NOT count as a PASS for the original ≥300/428 requirement.**

The retained original S1/S2/S3→T pipeline emitted **105** distinct physical SOURCE NODE bindings: **35 S1 + 36 S2 + 34 S3**, all passing the independent test-only ORIGINAL-CII fixed-field geometric and graph verification:

1. **33** independent Owner-golden PS/SL name relations were mapped to unique original numeric physical SOURCE/T NODEs and matched the engine outputs, with immutable Owner SHA-256 custody.
2. **14** additional physically distinct SOURCE/T nodes received independent root qualification from exhaustive original TARGET 3D coordinate translation search over complete bound-connected SOURCE subgraphs. No alternative exact original-target geometric placement was available in the unchanged original coordinate frame.
3. **58** other physical nodes received trusted-root proof via independent original SOURCE/T shortest-hop topology, signed displacement, path length ±100mm, original OD compatibility and branch veto; **all 1,619 original T physical NODEs** were searched for alternatives at each propagation step. An untrusted pair of mutually consistent AUTO candidates cannot certify one another. Duplicate SOURCE, reused TARGET, multiple original shortest paths, wrong original SHA and incorrect/ambiguous TARGET all veto certification.

**Result: independently rooted physical certificates = 105/150 = 70.00%, MIDCYCLE_150_VALIDATED_RECALL=0.70, first-stage PASS**; zero global TARGET custody conflicts. The remaining **45 SOURCE physical NODEs** (22 S1, 11 S2, 12 S3) are unverified and cannot be credited. Original CII **OD and branch evidence match for all 105**; wall thickness differs on some original SOURCE→T segments (for example SOURCE 25.4mm versus TARGET 18.3mm). Wall is reported as a separate engineering discrepancy rather than silently relaxed or incorrectly treated as physical identity.

**Replay:**
```bash
node tests/cii-workspace-phase2-midcycle150-score.test.js
node tests/cii-workspace-phase2-midcycle150-original-path-witness.test.js
node tests/cii-workspace-phase2-midcycle150-rooted-verify.test.js
node --max-old-space-size=4096 tests/cii-workspace-phase2-owner-retained-measure.mjs
```

Source: [150-node scorer](../../cii-workspace-phase2-midcycle150-score.js), [original fixed-field path and OD/branch verifier](../../cii-workspace-phase2-midcycle150-original-path-witness.js), [global TARGET shape search](../../cii-workspace-phase2-midcycle150-global-shape-verify.js), [trusted-root exhaustive alternative verifier](../../cii-workspace-phase2-midcycle150-rooted-verify.js) and [independent original Owner-golden certificate builder](../../cii-workspace-phase2-midcycle150-owner-golden-certificates.js). The retained CI artifact includes `midcycle150-assessment.json`, `midcycle150-trusted-root-physical-verified.json` (all 105 physical source member/NODE and T NODE evidence), `midcycle150-original-path-witnesses.json`, `midcycle150-independent-global-shape.json` and the complete original Owner corpus.

**Safety boundary:** These independent verification files belong strictly under `tests/`; no expected Owner relation was injected into production matching, MANUAL seed selection, Method A/B weighting, topology ambiguity policies or Writer2 eligibility. Original ≥300/428 remains structurally unattainable under the separate one-to-one 150-SOURCE-node population.

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
