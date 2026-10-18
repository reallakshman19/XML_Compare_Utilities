# PR129 work report — I121-PERF-04 negative expansion cache

**Programme:** XML_Compare_Utilities · Issue [#121](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121) · BuddyRunner v2.0 RECOVERY · Engineering PR Delivery v3.6.  
**Result:** Product fix implemented and exact-head hosted Chromium GREEN; **independent P2 and release remain HOLD**.  
**Mode:** separate DRAFT PR #129 based on parent DRAFT PR #127; no direct PR127 product diff or merge.  
**Verified original base:** `48538daa218faf7a041ba8b6a3f1be95c556b91b`; **first passing implementation head:** `397b8b2b90cdd786e08962e8099aafab732e38d9`.  
**Other active work:** draft PR #107 at `86a2d3b40568c2bcb43dacbe32c862144d00fd53` has zero exact-file overlap with the two edited Method A modules.

## 1. Owner intent and prior failure

The native CII Writer2 must inspect the original S1/S2/S3/T CII source set responsively and preserve Method A/B/BM001 identity, the original V11↔V14 worker SHA, geometry tolerances, the 4060→900–905 segment-only negative, and Writer2's explicit BOUND/Apply authority. Issue #121 captured the real Edge tab freeze; real Chromium reproduced the original Inspect failure in #39051153797 (145-second watchdog) and #39128787659 (30-second locator timeout).

## 2. Observed cause — real original-file Chrome, not simulation

- [Diagnostic PR #128](https://github.com/reallakshman19/XML_Compare_Utilities/pull/128), all original S1/S2/S3/T SHA256 verified, original served `docs/index.html`.
- [Run #39131820115](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39131820115): S1/T normalization completes ~3.55s, first `PAIR_INSPECT` stalls.
- [Run #39132142420](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39132142420): graph intake and topology, source/target inspection summaries, and structural anchor first pass complete; physical Method A's 560 seeds block.
- [Run #39132489779](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39132489779): each of the first 19 physical seeds expands to 21 pairs, enumerates 1,296 bases (1,286 admissible), computes **826,255 pairwise comparisons** (~4.1s per expansion), and returns `AMBIGUOUS`. This work repeats for new seeds despite an identical count/rejected outcome; watchdog fires during the twentieth. Code has a successful-bases map but no negative-result cache.
- Important correction: frozen converter already uses a SHA-keyed 16-entry conversion cache; repeated Python conversion was not the predominant stall. A separate node-map microbenchmark showed an inefficiency but was not the root of the 90s original freeze.

## 3. Implementation and precise changed-file boundary

Only these two production paths modified with byte-identical postimages:
- `tabs/cii-workspace/cii-workspace-anchor-method-a.js`
- `docs/tabs/cii-workspace/cii-workspace-anchor-method-a.js`

Before Git blob: `02c6e582e87ebf5800c93a5a6632b871030c7178`. Both after: `6144c6389a1fe96d6c99ca2e0dfbc16a4ac26a32`.  
Before SHA256: `45c94cb46eec7f2ba7e2dc5ca7c4412624907ec6d30f614846d4043bab29fd85`.  
After SHA256: `253aa13a984cf1778cdf6400526c2e081b64024a75069983f9ad4fbb36524c5f`.

The `discoverCiiMethodABases` call now keeps a per-invocation Set `rejectedExpansionIds`. Once a deterministic expanded pair set returns non-READY from the unchanged `qualifyCiiGeometryTransform`, later identical expanded pair IDs are skipped. Its successful-bases map, selected seed ledger and READY handling are unchanged. The local graph, source/target point authority, fixed expansionEligible ordering and options are constant within the invocation, so repeated IDs resolve the same ordered pair set. No global cache/stale cross-session state. No changes to geometry solver, ambiguity policy, winner-gap, OD or 100mm tolerances, physical B, Method C C/Writer2 Apply, original fixtures or worker Python.

## 4. Legitimate existing-file backups and patch custody

**Backup executed on a real full checkout before either source file edit**, in [preimage workflow #39133008438](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39133008438) at commit `dacd331fadab3c03492c3459da3a8e96f5bc367c`.

Retained [artifact #12139065747](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39133008438/artifacts/12139065747), ZIP SHA-256 `41fadc6339319c4365da70d517be86a4c7a6450300413574ade2ef0744548ac7`. Actual `utils/backup.cjs save` returned backup **#90** (source) and **#91** (docs); both independently extracted and SHA-256 checked against the recorded preimage bytes. The workflow's extra `verify 1` / `verify 2` commands covered older entries, **not** the two new ones; independent verification of #90/#91 was separately completed. Preserve this distinction; no false verification receipt.

Local `.agent-worklogs/20261018_i121_negative_expansion_cache/` includes preimage vs postimage non-Git diff, module manifest/undo and pre/post hashes. The backup and module ledger are supplementary evidence; PR Git history is not a replacement for binary-safe preimages.

## 5. Validation and actual observed product result

At **exact implementation head `397b8b2`**, [run #39133233163](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39133233163):
- Original, unchanged `tests/cii-workspace-writer2-method-c-original-journey.test.mjs`: **PASS 1/1** in 14.278 seconds. Original SHA-pinned file upload/one intake; source-set READY at **9,411ms** from Inspect, Auto Anchor seeded 2/3; Method C A-only 57 S1 original evidence rows; NODE4060 only projects to original T ELEMENT 900–905, no invented BOUND; session invalidation and no Method C Apply remain tested. No page errors in 6s receipt.
- Existing 14 protected Method A, B, BM001, Writer2 jobs: **PASS 14/14** (~23.41s).
- Source/docs mirror and full-checkout backup/scope job **PASS**.
- Original benchmark/frozen Python files untouched. Native **Edge on actual Owner Windows machine NOT_RUN**. Independent PR review NOT_RUN.

Baseline preimage [#39133008438](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/39133008438) retains the earlier original Writer2 RED; run results must remain historically visible. No timeout was increased or oracle rewritten.

## 6. Reversibility and independent review gates

Exact undo: check current SHA256 equals `253aa13a984cf1778cdf6400526c2e081b64024a75069983f9ad4fbb36524c5f` for *each* corresponding file, check no later overlapping edits, then restore the matching binary-safe backup #90 or #91 from artifact #12139065747. Never reset/revert unrelated work. Re-run original/oracle and protected suites after selective undo.

**HOLD:** independent qualified P2 review of the change and all A/B/Writer2 invariants; Owner Windows Edge reproduction; Owner explicit promotion/merge; integration coordination if/when PR129's two files become part of PR127 or main. Until then PR129 and PR127 remain DRAFT.

## 7. Appendix A / qualification honesty

Source-backed self-check (not independent P2): A1 production trace (20/20), A2 failure isolation (20/20), A3 authority and invariants (20/20), A4 independent original-file falsifier and validation path (17/20), A5 minimal patch and rollback (20/20), aggregate **97/100 SELF-ASSESSED**. These scores require independent checker confirmation; they do not confer review or merge authority.

## 8. EXACT_NEXT_ACTION

1. Obtain independent checker (not the implementation agent) to examine PR129 exact diff and compare pre/post original-file evidence. Prioritize collision/ordering proof for `baseId`, negative vs READY caching, and mirror parity.
2. Repeat true native S1/S2/S3/T Chromium and perform actual Owner Windows Edge availability/responsiveness run. Confirm downstream 2 Compare Review / 3 Transfer Preview remains governed.
3. If all gates PASS, request explicit Owner merge decision on the standalone PR chain; **do not self-merge or un-draft**.
