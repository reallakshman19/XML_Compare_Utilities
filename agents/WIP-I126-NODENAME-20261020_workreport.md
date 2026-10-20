# WIP-I126-NODENAME-20261020 — independent original-CII NodeName pointer regression

## Handover in 60 seconds
- **Owner instruction:** 2026-10-20 "proceed next", following I126-B-ORACLE-01 read-only finding: correct incorrect Method C ELEMENT->NODENAME pointer custody, preserve original geometry and Writer2 firebreak.
- **Current workpack:** Phase 1 of a deliberately staged engineering-critical correction: **new independent red regression ONLY**, no production, oracle rewrites, schema changes or release.
- **Basis:** `main@9a5916f972af170f272c525907728237391b7ca8`; PR137 `69eebe419e6b662ec5ac96412ebd01e44d4f1350`; PR138 `68256d9b10ba9f69cdc3752474ffe9b663883aa4`, retained as this branch's start/base; separate PR107 `86a2d3b40568c2bcb43dacbe32c862144d00fd53`; PR118 geometry authority overlap.
- **Current authority:** READ_ONLY for existing engineering-sensitive production. New original-file independent regression may be committed as a draft investigation. **No authority to edit existing parser until local `node utils/backup.cjs save` preimages, full Appendix A qualification, PR118 coordination, test impact assessment and independent expected values are preserved.**
- **Discovered before modification:** production `tabs/cii-workspace/cii-workspace-method-c-original-geometry.js` `originalElements()` uses record `offset+12`, numeric field `0` for NODENAME row ordinal. Existing physically encoded original CII/independent `tests/cii-workspace-multisource-texpected-oracle.js` reads record `offset+13`, numeric field `5`; 4 originals have 49/42/40/1265 NODENAME records and exactly as many nonzero +13 field5 references, while the +12 field0 yields 14/10/9/317. Incorrect recovered named physical nodes 18/14/13/444 vs independently recovered 38/34/32/950. Independent `tests/cii-workspace-method-c-independent-benchmark.test.js` mirrors the *wrong* +12 field0 and is implementation-coupled on this dimension, not an independent NodeName oracle. Existing original geometry synthetic test also tests the wrong pointer.
- **Critical examples:** S1 3910 original `SL-098.7`, parsed empty by Method C; S3 1370 original `PS-010.1`, Method C currently substitutes `SL-103.5`; T 30 original `PS02352.1`, currently empty. No physical SOURCE↔TARGET identity is certified by these names.
- **Invariants:** full original SHA-256 and raw byte custody, signed FROM/TO+XYZ/OD/wall, component/physical NODE census 57/47/46/1619, registration and bounded geometric A unchanged; no Method C new BOUND, no confidence/review/Writer2 mutation grant, no benchmark fixture substitutions.
- **Next action:** commit *new-only* independent red-before original-CII test; explicitly record NOT_RUN if task environment cannot execute full Node fixtures; require external review/coordination of existing PR118 geometry ownership and task-local protected pre-edit backups before any production change.

## Diff and task scope
- Planned NEW `tests/cii-workspace-method-c-nodename-original-oracle.test.mjs` (<300 lines): independent original 15-row field +13:5 using existing test-only oracle, exact SHA guard, whole-ELEMENT-block permutation, known S1/S3/T sentinels and complete physical NODE-name census. Should **FAIL** against inherited production at PR138 HEAD.
- Planned NEW this WIP workreport, continuously maintained.
- Existing files changed: **NONE** during this phase. No workflow edits.
- Original production parser and prior benchmark remain preserved for a separate, backup-governed follow-up.

## A1–A5 takeover challenge and pre-edit qualification state
- **A1 Production trace:** Original S1 bytes -> `buildOriginalGraphFromBytes` -> `originalElements` -> `edges[*].pointer/fromName/toName` -> `nodes[*].nodeName` -> A-only display; compare raw original `ELEMENTS` and `NODENAME` physical fields. Verified in source/JS original data.
- **A2 Failure isolation:** +12:0 vs +13:5 with original pointer cardinalities 14/10/9/317 vs 49/42/40/1265; changing only pointer field predicts newly populated nodes, unchanged signed graph. Falsifier: authoritative V11/V14 layout contradicts +13:5 for relevant real files.
- **A3 Authority:** original CII byte/field evidence, test-only independent oracle; existing PR118 owns geometry module, separate PR107 owns Method A/B review and Writer2 integration; B certification and downstream mutators are out of scope.
- **A4 Independent validation:** cross-reference raw original 15-row fixed fields, existing independent CII parser, protected S1/S2/S3/T hashes, named sentinel examples and full counts; independent benchmark WP8 is NOT an independent oracle for this pointer and must not be silently adjusted.
- **A5 Smallest later patch:** two byte-identical `tabs/` and `docs/tabs/` geometry parser mirrors, one pointer index/comment correction only, separate explicitly supported legacy test adaptation, original regression green, full geometry A/firebreak suites and unrelated Writer2 unchanged. Backup both existing mirrors before edit.
- **Appendix A status:** production WRITE qualification **PENDING**; no self-certified >=92/100 claim for a future production commit. New-only test implementation does not grant production authority.

## Validation ledger
| Gate | Status | Observation | Oracle |
|---|---|---|---|
| Live GitHub main / PR refs and exact parser blobs | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE |
| Original 4-CII pointer cardinals and named-node recovery | PASS | EXECUTED_HERE independent connector JS on fetched original Git blobs | INDEPENDENT_REPRODUCTION |
| New Node original-file regression `node --test ...` | NOT_RUN | local complete repository checkout unavailable here; expected RED on inherited production | ORIGINAL_CII + TEST_ONLY_ORACLE |
| Native Chromium / Edge / Writer2 / WP8 full tests | NOT_RUN | no productive changes claimed | NONE |
| B physical certificates / Writer2 writes | NOT_APPLICABLE | none introduced | NONE |

## Multi-agent conflicts / open decisions
- `PR118` active draft directly owns both Method C geometry mirrors and its old same-error independent benchmark test: **COORDINATION_REQUIRED**, do not edit those files silently.
- `PR107` owns separate physical validation/Writer2 data flow; method-C semantics overlap, no shared file edit allowed.
- Existing red `I126_SCOPE_GRANT_REQUIRED_FOR_NEW_OR_PROTECTED_FILE` on the broad inherited #121 stack remains unrelated and must not be waived.
- **ISS-1:** unsupported production NodeName pointer `+12:0` produces missing/wrong node labels.
- **ISS-2:** existing WP8 independent benchmark duplicates the same field mistake; it is not a valid independent NodeName expected-value source.
- **ISS-3:** original bench row+10 branch owner/free-text not yet qualified as engineering Line Number or physical identity.

## EXACT_NEXT_ACTION
Create a draft branch/PR for the independent red regression, verify it against source originals in a real local or CI checkout, then coordinate original-parser owner and perform repository-mandated task-local pre-edit backups/Appendix-A qualification before the two-mirror minimal product fix. Do not grant BOUND or merge.
