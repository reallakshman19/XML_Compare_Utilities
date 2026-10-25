# PR #168 — E1-PTR-GUARD-1 bounded source repair

**Authority:** [Oracle #173 GO](https://github.com/reallakshman19/XML_Compare_Utilities/issues/173#issuecomment-6398683938) to coder 6adddf80 (Owner-reported routing), limited to the existing draft PR. **Verdict:** SELF_ASSESSED source-only implementation; independent specialist #170 and Oracle challenge pending. No editor, writer, private original CII, new PR, deployment or merge.

## Baseline and current evidence

The verified original PR head was 3595a7cf350d22a982157d7dffdec2becf6b0f4a; base was 80e693bd81f54003a487cb763421f9bfd0d3dfc2. Exact source reader blob 814578a093f9a9f51c142137561adffa3a46d42b and test blob 786c79836df9cc55f9b5e113a7af9931aea9a0a2 were read from a SHA-verified full native Git checkout (GitHub artifact 12598017481). Native Git history and fsck passed. Before editing the source/test were clean; open PRs #176, #174 and #171 did not overlap the E1 paths. Later branch ownership/head changes must be checked afresh.

The changed modules are tools/ciifr-wbs4/readonly-catalog.mjs and tests/ciifr-wbs4-readonly-catalog.test.mjs. This PR workreport is the third and only new tracked file; .backups/ and .agent-worklogs/ remain local recovery data, never staged.

## Implementation contract

Read-only v14 ELEMENTS catalogue: six main CONTROL count fields, then 13 auxiliary fields in 6+6+1 slots. Pointer counts #1–11 use auxiliary positions #1–11; #12 NODENAME uses main NONAM; #13 REDUCERS uses main NORED; #14 FLANGES uses main NUMFLG; #15 EQUIPMNT uses auxiliary #13. Auxiliary #12 is the IZUP vertical-axis flag, not a record count (validate 0/1).

Every nonzero ELEMENTS auxiliary pointer is bounded by its source-declared *logical* count; missing referenced sections or missing positive-count sections fail closed. Overflow diagnostics identify the element ordinal (one-based), pointer ordinal, section, pointer value, logical count and byte start. Existing WBS4_RIGID_POINTER_RANGE and WBS4_NODENAME_POINTER_RANGE error prefixes, special NodeName handling, shared RIGID owners, zero-as-absent and real numeric lexemes remain intact.

The physical record lengths validated here are BEND 3 lines, RIGID 1, EXPJT 1, NODENAME 1, REDUCERS 1, FLANGES 12 and EQUIPMNT 6. Other auxiliary body shapes remain explicitly UNVALIDATED_RECORD_SHAPE. The sectionCounts return is a *physical nonblank line* inventory and never used as a logical pointer limit. This remains a source catalogue, NOT engineering semantics, writer acceptance or a CAESAR II importer claim.

## Source basis and candid limits

Hexagon v14 Auxiliary Element Data: https://hexagonppm.fluidtopics.net/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418 . Hexagon v12 CONTROL: https://docs.hexagonppm.com/r/ru-RU/CAESAR-II-Users-Guide/Version-12/337039 and v15 CONTROL: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/337039 . The v12 and v15 CONTROL ordinal descriptions agree and bracket the v14 auxiliary/element layout; **direct v14 CONTROL-page retrieval NOT_RUN**, so an independent specialist must challenge this version-bracketed source interpretation before acceptance. Blank counted NODENAME admissibility, unqualified physical auxiliary shapes, units, field semantics and genuine v14 native CAESAR import remain unresolved; no original private CII was transferred or examined.

## Tests, preimages and undo

RAN: node --test tests/ciifr-wbs4-readonly-catalog.test.mjs tests/cii-fnr-vnext-branch-scope.test.mjs. **30/30 PASS (11 E1, 19 retained NodeName), zero failures and zero skipped.** RAN: node --check on both changed source files PASS; git diff --check PASS.

Invented negative cases: BEND count0/pointer9 rejects; BEND count1/pointer1 with three physical lines accepts range, count1/pointer2 rejects, missing section and two-line body reject. EXPJT count0/pointer1 rejects, count1 with one line accepts range. IZUP1/EQUIPMNT count0/pointer1 rejects; IZUP0/EQUIPMNT count1 with six lines accepts range; IZUP2 rejects. All 15 auxiliary pointer ordinals reject declared-count-zero references. RIGID/NODENAME range errors, shared RIGID owner and zero-pointer distinction retained. Unsupported RESTRANT body marks UNVALIDATED_RECORD_SHAPE. Tests are author-run, not independent engineering acceptance.

Before/after SHA256 reader: 8b554e0db3764f5c09ea7d717f4107c8befb3f8ea00179d4a26c7ad4bd96f323 / 54646da3db0c89a6de86e518971bf363c1d49477bface50642b2627b172ba1b0.
Before/after SHA256 tests: a0df175845ca0bd92f974d1750ada32c16e2b4a3e6e524c823e36f084d1c3005 / f1baf7f81d422b0f6b5cb76ddc0fdcb729e41d923e87216cb8310030bb4dd2a1.

Local backup #90 preserves reader; #91 preserves tests. Both verified against original SHA. The accidentally tracked .backups/log.json is expected locally modified after backup saves; do NOT manually restore, discard, stage or commit that log. Local ignored .agent-worklogs/20261025_1845_e1-ptr-guard-1/ contains pre-edit snapshots, manifest, module logs and three history-independent git diff --no-index --binary patches (source, test, report). Reversal requires checking current hashes and subsequent edits before any selective replacement from verified backups; do not use blanket reset or overwrite someone else's work.

## Risk, review and EXACT_NEXT_ACTION

Highest risk: the direct v14 CONTROL source was not independently retrievable. All field/unit meanings, unsupported record shapes, private original validation, native importer and producer/editor authority remain HOLD. **EXACT_NEXT_ACTION:** Oracle challenges fresh exact PR #168 head and recorded mapping; distinct independent specialist #170 replays BEND, EXPJT and IZUP/EQUIP negative cases. Keep PR DRAFT and withhold merge, E2/E3 and TARGET1 until authorized.

---

## R2 correction after independent R1 failure — 2026-10-25

**This R2 section supersedes the preceding R1 claims where contradicted.** [Independent review #170](https://github.com/reallakshman19/XML_Compare_Utilities/issues/170#issuecomment-6400040909) is **FAIL** for overall E1 R1 acceptance. [Oracle's bounded R2 GO](https://github.com/reallakshman19/XML_Compare_Utilities/issues/173#issuecomment-6400196426) authorizes only F1/F2 and a source-based F3 decision on the same draft PR. The original all-15 pointer guard, RIGID/NodeName behavior and E2/E3/TARGET1 HOLD remain unchanged.

**F1 (FIXED):** For a CONTROL-positive auxiliary logical count, a section header without any nonblank physical records fails closed as `WBS4_AUX_SECTION_EMPTY section=<name> count=<n> physicalLines=0`, distinct from a missing section (`WBS4_AUX_SECTION_MISSING`). In particular, invented RESTRANT count1/pointer #4=1 with bare `#$ RESTRANT` is REJECTED. Nonblank RESTRANT bodies retain explicit `UNVALIDATED_RECORD_SHAPE` and are **not** a source-qualified complete restraint claim; no RESTRANT 6-DOF × 4-line parser was added.

**F2 (FIXED):** `REDUCERS` physical length is **two** lines per logical record, not one; each of the two documented source lines carries five values. Invented NORED1/pointer #13=1 plus two five-value physical lines passes **cardinality only**; one/three/zero rows and missing section reject. The exact v14 source is [Hexagon Auxiliary Element Data, Version 14](https://hexagonppm.fluidtopics.net/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418) (REDUCERS). Old one-line assertions are explicitly invalid.

**F3 (PARTIAL / NOT IMPLEMENTED):** `VERSION_BRACKETED_CONTROL_SHAPE_UNRESOLVED`. Official v12/v15 CONTROL specify `2X,6I13` for main and 13 auxiliary fields arranged 6+6+1, but the exact v14 CONTROL page could not be independently obtained, and actual v14 native-importer acceptance of trailing surplus slots was **NOT_RUN**. Therefore **NO new strict row-width/prefix guard** was added: extra CONTROL fields may still be accepted. The independent reviewer must not treat F3 as PASS; format release/qualification remains HOLD until v14 source or admissible equivalent resolves the question. This deliberately preserves compatibility rather than inventing strictness.

**Predeclared red/green:** Against exact R1 source, new F1 and F2 contrary-case tests yielded **2 expected failures (30/32 PASS)**. After the bounded source fix, native `node --test tests/ciifr-wbs4-readonly-catalog.test.mjs tests/cii-fnr-vnext-branch-scope.test.mjs` **32/32 PASS (13 E1 + 19 NodeName)**, zero failures or skipped. `node --check` for both JS paths PASS; `git diff --check` PASS. No private CII or native CAESAR importer input was used. These are coder-authored synthetic tests; independent verification is pending.

**Exact pre-R2 provenance:** Authenticated full Git history from GitHub Actions artifact 12598017481; verified old native repo at `3595a7c`, then re-created GitHub R1 tree `b9df34cf8f75bd1aba0f0465c23c6d7a4187b551` from fetched, SHA-matched Git blobs and re-created the precise byte-for-byte Git commit object `01d94e1f19e39c1fb5863f539e56c2f06d5405d2` (including original Git author/committer time zone). Native HEAD and checkout were clean and `git fsck` passed **before new backups**. This did not create a separate GitHub branch/PR or edit unrelated work. Remote PR parent was independently rechecked unchanged before R2 preparation. Original tracked paths (before SHA-256 / Git blob): reader `54646da3db0c89a6de86e518971bf363c1d49477bface50642b2627b172ba1b0` / `74041b0e49c56a444593bb281b383401008db227`; tests `f1baf7f81d422b0f6b5cb76ddc0fdcb729e41d923e87216cb8310030bb4dd2a1` / `8c1487891cb1dac05e9270466bd689e010fd7852`; workreport `62040c0e1b8a5af757aed94639a915ff5900280cddf85f62400fc19f066d1109` / `e85a9eb67fd869b4c6ebc22471c8c91d4381e7f9`.

**R2 backups:** NEW in this fresh verified workspace, not R1 records: `node utils/backup.cjs save` gave #90 (reader), #91 (test) and #92 (report), all **verified** against the R1 SHA-256 and prior exact Git blobs. Tracked `.backups/log.json` has `M` as expected and **its active entries were NOT manually reset, rewritten or staged**. Ignore-list path `.agent-worklogs/20261025_2115_e1-r2/` contains the pre-edit manifest, three verified original snapshots, per-file binary-safe no-index patch and rollback hashes. Only the two JS files and workreport are authorized for commit. Scope: no editor, writer, private file, deployment, new branch/PR or merge.

**R2 disposition:** SELF_ASSESSED F1 PASS, F2 PASS, F3 PARTIAL/UNRESOLVED. Publication, repaired-head CI and independent rereview must be assessed **at the actual new PR head**, never inferred from this local self-check. `EXACT_NEXT_ACTION`: Oracle and reviewer #170 independently challenge empty RESTRANT, two-line REDUCERS, CONTROL shape ambiguity and untouched pointer regressions. E1 acceptance remains HOLD pending external verdict.
