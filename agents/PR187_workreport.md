# CIIFR Element Five-Field Inspector — PR #187 recovery-first workreport

**Native task:** [XCU #178](https://github.com/reallakshman19/XML_Compare_Utilities/issues/178). **Cycle:** Common `ciifr-element` ACTIVE revision 1, assignment `CIIFR-ELEMENT-FIELD-AUTHORITY-1` generation 1, intended builder routing label `6adedbc6` (unverified by GitHub principal). **Scope:** new, read-only source-evidence files only. No original source archive, customer bytes or private digests in GitHub.

## Baseline / source / custody
- Parent [draft PR #168](https://github.com/reallakshman19/XML_Compare_Utilities/pull/168), exact observed head `2aeaf7372de66eda3bc082b8d81bf8db43c34f4b`, head branch `codex/ciifr-wbs4-oracle-e0-e1-20261025`. Verified reader `tools/ciifr-wbs4/readonly-catalog.mjs` Git blob `32e24c684c687b11e68da6af5dd1abd3bbe6b818`; unchanged on this stacked branch.
- Repository main observed `c823f0c0edbeb315c07fa2911390dc781968146f`. Adjacent open draft candidates PR #174 Geometry and PR #176 NodeName Writer have distinct authority. PR168 owns existing catalog; this PR adds **no edits** to it or existing reader tests. Three requested target paths did not exist at the checked parent head. Overlap classification: **SAFE for additive new files; semantic reviews separate and required**.
- Prior specialist native #178 R2–R4 retains original physical field/pointer read evidence. **This builder session did not retrieve/re-hash the protected original**. The source job's effective Alpha/config, unit resolution, materials/expansion edition, basic static OPE/HYDRO case map and FDM are not proven. No native CAESAR II importer or real SOURCE/TARGET pairing.
- Work performed in isolated local reconstruction because local runtime cannot DNS-resolve GitHub. Its manually reconstructed reader copy is **NOT byte-exact upstream**; this reconstruction was used for focused author synthetic tests only. The published Git tree instead inherits exact PR168 reader bytes untouched. **Hosted exact-head CI must validate actual integration.**

## A1–A5 native takeover qualification (SELF_ASSESSED, not reviewer acceptance)
| Gate | Score | Grounded technical result |
|---|---:|---|
| A1 source trace | 19/20 | PR168 `readOnlyCatalog(bytes)` supplies selected zero-based physical element, 53 real ordinals, pointers #1–15, RIGID #2 section-local index, 13-byte lexemes/offsets and multi-owner RIGID mapping |
| A2 failure isolation | 19/20 | Counterexample pointer=0 absent vs pointer=1 -> explicitly stored zero weight; repeated FROM/TO; shared RIGID index; invalid pointer; R4 candidate units/ambient cannot supersede original embedded context |
| A3 authority/invariants | 20/20 | No input writes; public summary uses constant whitelist; private report only under temporary 0700 folder, 0600 files; no engineering-effective calculations/Writer/Target edits |
| A4 validation | 18/20 | 11/11 local synthetic checks with raw byte span oracle, mismatch negatives and source-unchanged assertions, but neither native original nor independent reviewer or hosted head run included |
| A5 minimal patch | 19/20 | 3 new `.mjs` files + this report, only isolated draft branch from PR168, no catalog edit; new-file patch ledger, exact branch/commit and rollback instructions |
**SELF score: 95/100**, each ≥17/20. This is not external Appendix A adjudication.

## New-file ledger / behavior
| Path | Purpose | Local preimage/backup |
|---|---|---|
| `tools/ciifr-wbs4/five-field-evidence.mjs` | `inspectFiveFieldEvidence(bytes,{elementIndex})` and `publicFiveFieldSummary`; original lexemes/spans and five explicit EFFECTIVE_UNKNOWN fields | NEW (no original file/backup) |
| `tools/ciifr-wbs4/five-field-cli.mjs` | CLI input CII path + 1-based physical ordinal; private `private-report.json` in temp dir mode 0600, separate public-summary.json; generic stdout path only | NEW |
| `tests/ciifr-wbs4-five-field-evidence.test.mjs` | 11 bounded synthetic positive/negative tests | NEW |
| `agents/PR187_workreport.md` | This recovery-first durable PR report | NEW |

Local ledger: `.agent-worklogs/20261026_1406_five-field-evidence/` stores no-index patches and module notes; it is deliberately not published. All new targets' rollback is **SHA-check current bytes, confirm no later agent edits, then delete only that exact path**, never reset/revert unrelated history. Native backup CLI is not applicable to newly created target paths. No existing tracked `.backups/` or reader files touched.

## Predicted vs observed (synthetic)
1. **Correct prediction:** pointer 1 -> RIGID record with `WEIGHT=-0.0000E+00` resolves PRESENT, numeric signed zero and exact lexeme. **Observed PASS**.
2. **Deliberately wrong case:** pointer 0 must not resolve `rigids[-1]` or fabricated zero-weight RIGID. **Observed PASS** (ABSENT association).
3. Sharing -> two original owner ordinals **PASS**; duplicate endpoints stay distinct occurrences **PASS**.
4. D exponent and signed zero lexemes, LF/CRLF exact 13-byte spans, out-of-range pointer/ordinal rejected, immutable input and privacy whitelist **PASS**.
5. Engineering-effective meaning has **NOT RUN / EFFECTIVE_UNKNOWN** for all five fields, with field-specific missing evidence, even when raw numbers are present.

## Executed validation
- `node --check tools/ciifr-wbs4/five-field-evidence.mjs` — PASS local.
- `node --check tools/ciifr-wbs4/five-field-cli.mjs` — PASS local.
- `node --check tests/ciifr-wbs4-five-field-evidence.test.mjs` — PASS local.
- `node --test tests/ciifr-wbs4-five-field-evidence.test.mjs` — **11 PASS / 0 FAIL / 0 SKIP** local author-synthetic environment.
- Original protected 353-ELEMENT CII, native CAESAR II, actual-config load-case/FDM, true SOURCE/TARGET correspondence, Windows served browser/GPU, non-author review: **NOT_RUN**. Existing PR168 tests against hosted exact tree: **PENDING CI**, not claimed from local reconstruction.

## Risks / authority
Highest risk: original-job binding/config/material/FDM unavailable; v14 CONTROL F3 semantics remain separate. Same stored number ≠ same effective engineering property. The 2019 converter RIGID.TYPE omission is not reclassified as source-v14 authority. All outputs from original source are private by design. No production Tab3, Geometry, NodeName, Writer, TARGET1, CII mutation, release or merge.

## Exact next action
At **the latest PR187 head**, run/inspect CI with the actual PR168 reader and have a **distinct non-author** review the physical field privacy/resolver negative cases. Separately, an authorized model custodian must supply original-job-bound configuration/material/basic-case FDM/native evidence before any effective-property interpretation.