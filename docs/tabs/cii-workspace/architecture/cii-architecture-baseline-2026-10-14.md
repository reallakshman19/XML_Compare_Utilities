# CII architecture migration — A0 reconciliation and causal baseline (2026-10-14)

**Record:** [parent issue #69 ARCH-01 rev 1](https://github.com/reallakshman19/XML_Compare_Utilities/issues/69#issuecomment-6164439111); semantic Owner specification #50, census #51 and runtime #49.

**Evidence classification:** READ-ONLY REPOSITORY INSPECTION + OWNER SCREENSHOT; **NOT** an executed retained-file replay, benchmark acceptance, independent review, CI success, v3.6 TASK_EVIDENCE or writer release.

## Starting commit and scope custody

- Observed default-branch commit at the time of the read: `655f874a9a345ba7e0f0d6a6b08afa51fe5fe327`.
- #71 merged to `main` in commit above; #72 merged **into branch** `fix/cii-writer2-frontier-diagnostics-69`; #73 merged **into branch** `fix/cii-writer2-locked-anchor-physical-evidence-69`. “Merged” on a stacked PR is **not** proof that its diff is on current `main`. Resolve real commit ancestry before differential testing.
- Separate draft #70 owns physical lexical-label inventory, **not** a complete independent Owner lexical oracle.
- Frozen Owner benchmark references: `Benchmark/S1.CII` SHA `9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b`; `S2.CII` `7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd`; `S3.CII` `c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa`; `T.CII` `abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060`.
- Ordered source-set digest: `5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3`. These are the parent-issue frozen expectations; **not** independently recomputed during this document-only task.
- Existing partial postimage: `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` has **36 known-positive** NodeName mutations (35 REPLACE, 1 CREATE, 0 DELETE) according to retained oracle; a **lower bound**, not a full identity mapping or absolute output count.

## Counter dictionary: never equate unrelated populations

| Counter | Population and definition | Owner current session | Provenance / status |
|---|---|---:|---|
| SOURCE_NODES | Original physical graph nodes in S1 + S2 + S3 | 150 = 57+47+46 | Owner screenshot, not independently rerun |
| SOURCE_NODE_BOUND | NODE rows with current effective identity binding | 38 = S1 35 + S2 1 + S3 2 | Screenshot, **manual/automatic mixed** authority selection |
| SOURCE_NODE_UNRESOLVED | Explicit unresolved NODE outcomes | 13 | Screenshot |
| SOURCE_NODE_UNEMITTED | Original SOURCE NODEs with no emitted matched/ambiguous outcome | 99 | Screenshot |
| REVIEW_HIGH_ELIGIBLE | HIGH confidence Compare Review rows, mixed NODE/ELEMENT | 27 | Screenshot; **not** bound NODE count |
| REVIEW_MEDIUM_ELIGIBLE | MEDIUM confidence Compare Review rows, mixed NODE/ELEMENT | 43 | Screenshot; **not** bound NODE count |
| NODE_NAME_CANDIDATE_CANONICAL | Candidate *mixed Writer1C/Writer2* canonical mutations in UI, excluding duplicate physical keys | 28 | Screenshot and `transferMutationSummary` code; family partition **NOT_RUN** |
| BM001_OBSERVED_ROWS | Exact BM-001 lexical-row matches carried by `bm001Acceptance` on transfer operations / total frozen rows | 0/329 | Screenshot; may remain observation PARTIAL and status READY if no invalid BM binding |
| SCOPE_APPLY | Hash/custody-bound, explicitly selected operations | UNBOUND | Screenshot; **not 0 authorized mutations** |
| GOLDEN_KNOWN_POSITIVE | Exact semantic differences in independent T to partial TEXPECTED | 36 | Parent-issue oracle; not a requirement for 36 anchors |
| AUTO_ONLY_HISTORICAL_BOUND | Separate prior automatic-base run SOURCE NODE bound count | 105 | Previously reported exact-head benchmark; **not comparable to mixed screenshot without reproducing configurations** |

**Census reconciliation:** 38+13+99=150 is consistent for the current SOURCE-node population. `27+43=70` is a different review-row population. `28` is not 28 Writer2 structural changes or a certified APPLY count. `0/329` is not node correspondence coverage. `36` belongs to a test-only partial postimage population.

## Reproducible causal trace of the current design

1. Manual anchor entry in `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` sets `manualBySource` and calls `selectedBySource.set(id, new Set())`; selected Method A/B bases are cleared for that SOURCE. It tells users manual anchors replace automatic loops.
2. `tabs/cii-workspace/cii-workspace-core.js::workspaceMultiBaseAuthority` dispatches mutually exclusively on explicit `baseLoops`, `anchorPairMode='INDEPENDENT_SEEDS'`, or legacy anchors. In a joint-evidence future contract, manual assertion must **not** silently suppress competing automated hypotheses.
3. The current multi-base/projection graph uses local propagation; when a frontier is ambiguous a physically plausible region can remain UNEMITTED. `applyCiiNodeCustodyGates` considers REVIEW/UNRESOLVED/CONFLICT adjacent elements when determining NODE identity.
4. `tabs/cii-workspace/cii-workspace-multisource-preview.js::combinedCorrespondence` marks aggregation not READY if any member is unresolved; `combinedTransferPlan` inherits source-member and aggregate correspondence blockers, making the transfer BLOCKED.
5. `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js::transferMarkup` disables the bind button unless raw transfer `status === 'PREVIEW_READY'`. `cii-workspace-multisource-writer2-readiness.js` emits `BOUND_SCOPE_REQUIRED` and `NO_EXPECTED_NODENAME_MUTATIONS` because no scoped APPLY exists. Those are downstream consequences, **not independent physical mismatch causes**.
6. `cii-workspace-multisource-bm001-correspondence.js::ciiBm001CorrespondenceCoverage` counts BM rows from matched operation acceptance; `status` depends on invalid bindings, not on complete lexical coverage. `ciiCanonicalWriter2MutationSelection` includes Writer1C replacements where present; its UI name is misleading.
7. In the screenshot the current S2 manual `420→415` has a 91.7% OD mismatch, and current S3 manual `1580→7880` is **not** the prior `1560→7880`. Retained S2 `420→10330` / S3 T88xx path candidates are only independent counterfactuals, not authority to reassign an Owner LOCK.

## Existing transfer capability inventory (code observed)

- `tabs/cii-workspace/cii-workspace-engineering-delta.js`: NODE_NAME, RESTRAINT, PROCESS P1/T1/T2 and further families already contribute deltas.
- `tabs/cii-workspace/cii-workspace-transfer-policy.js`: `writerProcess()` maps P1/T1/T2 to **Writer1A cardinality-preserving** element-field policy, other supported fields to Writer1B; not a global P1 permission.
- `tabs/cii-workspace/cii-workspace-restraint-transfer.js`: paired RESTRAINT records have separate authority/identity requirements.
- `tabs/cii-workspace/cii-workspace-writer2-composite-routing.js`: conditional restraint slot and delete routes, and blocked CREATE cases.
- `tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js`: mixed NodeName Writer1C/Writer2 canonical selection with exact field/cardinality predicates.
- `docs/tabs/cii-workspace/architecture/cii-transfer-capabilities-v1.md`: proposed future interface; read-only spec, **not** current implementation.

## Tests to execute before declaring A0 complete (NOT_RUN)

- Independently SHA-check original S1/S2/S3/T plus partial TEXPECTED bytes; pin normalized v11/v14 hashes and bridge.
- Deterministically rerun: (a) AUTO_ONLY; (b) MANUAL_ONLY with exact screenshot current locks; (c) MIXED additive evidence **shadow-only**; identical input hashes and options per variant. Capture 150-node census per member, element/path counts, base-set selection and all warnings.
- Build rowwise mutation table: NODE_NAME Writer1C REPLACE vs Writer2 CREATE/DELETE; original target record/field/span, normalized and original address, source member, authority, candidate vs ready vs APPLY.
- Compare the output set to 36 partial TEXPECTED known positives by **exact normalized TARGET semantic field**, not total-count subtraction; BM-001 lexical discrepancy in separate column.
- Retained positive and negative physical controls: S1 ambiguities, S2 420→415, S2 420→10330, S3 1580→7880 current, S3 1560→7880 historical, S3 target subdivision T88xx; no auto-lock or benchmark-ID injection.
- Run existing focused tests and Chromium retained workflow; record PASS/FAIL/NOT_RUN and exact commit/test command; independent validation required. **No test run claimed in this document.**

## Governance and exit

This is **A0 initial evidence/reconciliation**, not an accepted result. v3.6 work-specific Owner-approved `relay/AIM/<WORK>.yaml`, label-bound plan and authorizations have not been verified in this read-only operation. Do not invent canonical tasks/Owner acceptance, execute lifecycle publisher or merge/release. No production code, transfer plans, fixture bytes, writer binaries or confidence thresholds may be changed by this docs-only A0 artifact.

**A0 exit requires exact replay evidence, measured per-family partition, independent diff, and immutable raw+normalized provenance.** Subsequent A1 schema remains draft until reviewed.
