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

---

## REVISION 3 / GENERATION 2 — independent-review F1/F2 repair · 26 October 2026

**This section supersedes previous “next action” and validation-status statements above; historic revision 1 evidence remains preserved.**

Assignment: CIIFR-ELEMENT-E1-PR187-F1F2-REPAIR, canonical Element Cycle ACTIVE revision 3, generation 2, intended builder routing label 6adedbc6. Review FAIL: https://github.com/reallakshman19/XML_Compare_Utilities/issues/188#issuecomment-6415464730 . Exact native scoped instruction: https://github.com/reallakshman19/XML_Compare_Utilities/issues/178#issuecomment-6415590149 . Reviewer method distinct; separate GitHub authenticated principal independence UNKNOWN; no retrospective review Cycle receipt.

### Source, parent and takeover

Pre-repair draft PR187 head: 3b9056fb44daa442e96afa70585113578ac9a778. Parent PR168 head: 2aeaf7372de66eda3bc082b8d81bf8db43c34f4b. Inherited catalog immutable Git blob: 32e24c684c687b11e68da6af5dd1abd3bbe6b818. The initial author ran tests using reconstructed reader; **this repair's local execution used four Git-blob-identical fetched files, including the real PR168 catalog**, confirmed individually with git hash-object. The actual full Git repository checkout is NOT available: git ls-remote exits 128 with DNS host failure. Therefore local four-file execution cannot be called full-repo CI.

Appendix A (SELF_ASSESSED): A1 19/20 (physical V14 source trace); A2 20/20 (independently observed F1+F2 and contrary test); A3 20/20 (private data and E1/Writer separation); A4 19/20 (old/new/seeded exact-source local subtree; full checkout NOT_RUN); A5 19/20 (bounded same-PR patch and recovery); total 97/100. This is not independent engineering approval.

Existing PR187 files changed in this repair: five-field-evidence.mjs, five-field-cli.mjs, ciifr-wbs4-five-field-evidence.test.mjs, and this PR187_workreport.md. PR168 readonly-catalog.mjs is NOT MODIFIED. No Geometry, NodeName, production Tab3, Writer, TARGET1, CII-model writes or merge.

### F1 — CLI rejection privacy, fixed locally

The standalone CLI catch now emits only a constant source-neutral failure string, FIVE_FIELD_INSPECTOR_ERROR=SOURCE_REJECTED, and exits nonzero. It no longer interpolates upstream errors containing a private basename, element ordinal, pointer, token or byteStart. Tested rejected missing-path, corrupt catalog, out-of-range pointer, malformed I13, invalid ordinal and bad argument. Private successful evidence remains in local temporary output files (0700 directory, 0600 files); publicFiveFieldSummary remains whitelisted. The successful LOCAL_ONLY_DIRECTORY stdout path is a local-only diagnostic, NOT approved for public CI logs. Trusted in-process JavaScript callers can still catch original errors; they must not publicly echo them.

### F2 — strict RIGID I13 containment, fixed locally

PR187 inspector boundary now inspects every physical ELEMENT's actual thirteen-byte RIGID auxiliary pointer #2 span before using ownerMap; a strict signed-integer I13 lexeme is mandatory even for unselected RIGID owners. Rejects 1.0, 1E0, +1.000 and 01E+0; still accepts signed +1 and 0 with correct present/absent RIGID semantics. Selected pointer also uses integer-only grammar and BigInt exact equivalence to catalog's bounded numeric pointer, not permissive exponent coercion. This is **consumer containment**, not repair of inherited catalog reader. The PR168 owner has its separate #173 all-15-pointer I13 correction assignment.

### Executed test observations

Host: Linux, Node v22.16.0, synthetic publicly safe V14 fixtures, real Git-blob-identical inherited reader. Syntax checks on three JS files PASS. Original eleven tests PASS at the original PR187 head. Six new synthetic adversarial test cases added (17 total), including subprocess redaction, selected and unselected shared-owner I13 contrasts, valid pointer-zero versus explicit stored zero, independently computed endpoint/occurrence oracle, space-containing path and custom TMPDIR. Full revised test suite: **17 PASS / 0 FAIL / 0 SKIP**, exit 0. Original old-head source plus new tests: **14 PASS / 3 FAIL**, exit 1, demonstrating fail-before. Separate wrong FROM +1 seeded implementation with new tests: **16 PASS / 1 FAIL**, exit 1, proving the endpoint oracle can detect the reviewer’s surviving error. Copied subtree at path containing spaces also 17/17 PASS. Full native checkout, Windows, original protected model, CAESAR II, active original-job config/material/units/cases/FDM and SOURCE→TARGET verification are NOT_RUN.

Local pre-edit files were backed up with task-local utils/backup.cjs save, backup IDs 1–4, checksum-verified. Module-wise snapshot-to-final no-index patches and manifest under .agent-worklogs/20261026_1630_pr187-f1f2 were retained locally and **not committed**. The local backup tool copy was operational but did not independently match the upstream tool blob checksum; do not claim a full native checkout or inherited tracked backup state. GitHub old preimage blobs, branch-head compare and immutable proposed new Git blobs are the remote recovery authorities; do not overwrite another agent's edits. No force push.

### Remaining boundaries and exact next action

All five engineering-effective fields still report EFFECTIVE_UNKNOWN; protected R2 original not received in this builder workspace. R4 candidate configuration does NOT establish the actual native job config, material/units, operating/hydro cases or case FDM. The latest hosted GitHub workflow must be inspected separately: older green runs do NOT execute the new 17 tests. No native CAESAR/source-target acceptance or Writer/TARGET1 authority.

**EXACT_NEXT_ACTION:** Element Oracle assigns reviewer 6adf3dbf to independently retrieve the NEW PR187 head, run the seventeen tests plus own privacy/I13/endpoint falsifier, and return its evidence-backed verdict on XCU #188. Preserve PR168 parent #173 separate owner action. Owner remains the only party authorized for eventual merge/release.
