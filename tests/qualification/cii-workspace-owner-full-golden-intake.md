# CIIW69 REC-04 — Full Owner lexical PS↔SL golden intake contract

**Status:** TEST-ONLY INTAKE IMPLEMENTED; **AUTHENTIC COMPLETE OWNER GOLDEN NOT RECEIVED**. This is a technical evidence protocol, never an Owner attestation, product identity rule, Writer1C/Writer2 scope, merge approval, or v3.6 TASK_EVIDENCE.

Parent: Issue #69. PR #68 was merged into `main` on 2026-10-14 at 05:00:29 UTC (merge commit `d58cabe0188fb9a4ebf3f3568b1584abb6824fc8`). **That merge does not supply or authenticate the complete Owner golden or constitute independently evidenced PH0–PH7 acceptance**, which remains 0/8 in this gate. New PH4 intake work is isolated on a subsequent branch. The 36 known-positive TEXPECTED changes and the frozen BM-001 329-row authority are partial benchmarks **not** the complete Owner PS↔SL list.

## Required genuine Owner submission

1. Preserve the **entire original raw UTF-8 relation text**, including exact order, duplicate relations, zero padding, unusual suffixes and punctuation. Do not silently “correct” `SL-263..5`, `SL-265..4` or `SL-275-A.8`, and do not deduplicate repeated `PS02687.1` relations. Keep the untouched original for independent archival/hash comparison.
2. Supply **independently attested SHA-256** and **total nonblank lexical relation count**. The checksum must be computed on the original bytes, not a normalized/rewritten string. Record its actual Owner GitHub issue/comment provenance and explicit original-completeness declaration; a checksum self-declared by a test file does not authenticate an Owner.
3. For physical reconciliation, each relation needs an explicit SOURCE member (S1/S2/S3). If the original text omits it, preserve that untouched text; the test classifies a missing member as **AMBIGUOUS**, never silently chooses one. A member-qualified representation may be accepted only after independently confirming line-by-line parity with the untouched original, without rewriting its labels. The strict test intake accepts either `S1<TAB>SOURCE_LABEL<TAB>TARGET_LABEL`, or `S1: SOURCE_LABEL → TARGET_LABEL` with `→`/`->`/`=>`. A raw `SOURCE_LABEL → TARGET_LABEL` is preserved but lacks member provenance. Any other formatting fails explicitly and requires parser adjudication, not silent dropping.
4. Manifest JSON (provided by the authentic Owner evidence source, separately verified):

```json
{
  "schema": "CiiOwnerLexicalRelationGolden.v1",
  "ownerEvidenceRef": "https://github.com/OWNER/REPOSITORY/issues/ISSUE#issuecomment-COMMENT",
  "rawSha256": "64-hex SHA-256 of the original text bytes",
  "relationCount": 0,
  "sourceSetSha256": "5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3",
  "targetOriginalSha256": "abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060"
}
```

The sample `relationCount: 0` and descriptive checksum are **placeholders** and intentionally invalid. Never turn this example into fixture evidence.

## Reproduce

With the authentic original golden and manifest available:

```sh
node tests/cii-workspace-owner-golden-retained-gate.mjs \
  --golden /path/to/owner-original-raw.txt \
  --manifest /path/to/owner-golden-manifest.json
```

The runner must also have the exact-head `test-results/cii-method-a-qualification/source-target-census.json` produced by the retained S1/S2/S3/T benchmark. It verifies the original S1/S2/S3/T file hashes, enumerates all 150 physical SOURCE node endpoints independently from neutral-file 15-row ELEMENTS, verifies exact raw name custody, and enumerates all physical TARGET nodes from original `Benchmark/T.CII`.

Without a supplied golden, running the command with **no arguments** exports `test-results/cii-method-a-qualification/owner-golden-readiness.json` containing `BLOCKED_AUTHENTIC_OWNER_GOLDEN_MISSING`. This negative readiness check is an intentionally passing CI **control**, **not** full-golden qualification. Supplying invalid bytes, declared hash, cardinality, reference, or target/source custody fails closed with a nonzero status.

## Per-row disposition

- **MATCHED:** unique physical SOURCE and TARGET candidates and an actual independently BOUND SOURCE→TARGET identity in the read-only census. This does **not** imply HIGH or Owner acceptance.
- **REVIEWABLE:** uniquely located lexical candidate pair, but no admitted physical identity (or a contradictory physical binding).
- **AMBIGUOUS:** repeated SOURCE/TARGET labels, missing SOURCE-member provenance, duplicate relation rows, or one SOURCE label with different expected TARGET labels; preserve every raw row and possible physical identity.
- **MISSING:** exact lexical SOURCE and/or TARGET name not present in original physical fixtures.
- **INVALID:** malformed, empty or untrimmed relation fields, invalid SOURCE member, or broken relation grammar.

Unusual punctuation and suffixes are separately flagged for Owner adjudication without correction, even when a physically BOUND relationship coincidentally exists. The row inventory, physical candidate IDs, observed identity/binding/confidence, raw line, original line number, source-member provenance, anomaly flags and independent input hashes are exported.

**Acceptance remains BLOCKED** even if every candidate classifies MATCHED: byte SHA and internal row count prove fidelity to a supplied file, not completeness of Owner intent or approval. The full original Owner text, authoritative source reference, attested cardinality and work-specific v3.6 authorization are separate Owner obligations. No production matcher or Writer2 imports these test-only files.

## Phase 2 independent original physical label inventory (preparation only)

After the default retained Writer2 SOURCE census is regenerated, run:

```sh
node tests/cii-workspace-owner-phase2-physical-label-inventory.test.mjs
```

This extra **test-only** source/target catalog independently reads the exact frozen
S1/S2/S3/T original byte files, verifies their SHA-256, parses original physical
NODE names without product matching or an assumed PS↔SL relation, checks every
one of the 150 SOURCE entries against the read-only census, and enumerates
1,619 physical TARGET nodes.

Outputs in `test-results/cii-method-a-qualification/`:
- `owner-phase2-physical-label-inventory.json`: complete raw-label physical
  inventory, member/node IDs, original digests, label collision groups and
  outstanding Owner inputs, with `ph4Accepted=false`.
- `owner-phase2-physical-label-catalog.csv`: one row for **every physical NODE**
  (150 SOURCE + 1,619 TARGET), including blank labels, to prevent accidental
  first-match or unnamed-node omission.
- `owner-phase2-physical-label-exceptions.csv`: exact physical label
  duplicates, member collisions, blanks and anomalous punctuation for independent
  Owner adjudication. It is a **collision worksheet, not a PS↔SL expected-pair list**.

The report does not create, infer, complete, normalize, or attest a single Owner
expected PS↔SL relation. It cannot close P401–P410, PH4, or the Owner merge gate.
The next actual required input remains the Owner's complete untouched relation
text and an independently attested manifest. Do **not** repurpose existing
SOURCE/TARGET label names as guessed relationships.

## Issue #102 — quantitative 70% acceptance guard (test-only)

New pure evaluator `tests/cii-workspace-owner-phase2-recall.js` and its
`tests/cii-workspace-owner-phase2-recall.test.mjs` negative controls
specifically protect the Owner's **≥70% complete Phase 2 benchmark**
requirement. This is not the same as the old 105/150 AUTO BOUND source census.

Once the authentic full Owner bytes/manifest are supplied, the existing
`tests/cii-workspace-owner-golden-retained-gate.mjs` emits a full
`owner-golden-readiness.json`. The new
`tests/cii-workspace-owner-phase2-recall-gate.mjs` consumes that existing
readiness output and records `owner-phase2-validated-recall.json`.
**Without the original Owner file, the numerator, denominator and percentage
are all null (NOT_EVALUABLE), not 0%, 70%, or PASS.**

The accepted original raw rows remain the denominator (including duplicates,
ambiguous, invalid, lexical anomalies and absent physical labels).
Independent global physical identity receipts, not legacy
`identityBound=true` or successful label equality, are the only possible
source of validated-recall credit. The evaluator requires exact
SOURCE-member/physical-NODE + original TARGET-NODE identity, original
S1/S2/S3/T custody, independent review link and proof digest, globally
complete assignment, zero ambiguous alternatives and unique cross-source
TARGET custody. It rejects wrong IDs, stale custody, duplicate claims,
reused TARGET custody, reused owner lexical rows, invalid labels and missing
expected physical identities. **Its validation of receipt structure does NOT
authenticate the human reviewer, prove physics by itself, or grant Writer
authority**; a reviewer must independently inspect source-level proof and
the Owner must accept the full golden provenance before reporting an achieved
70%. The code leaves `ownerAccepted=false`, `writerAuthority=false`
and `mergeAuthorized=false` even when a *synthetic test* crosses 70%.

Native regression:
```sh
node tests/cii-workspace-owner-phase2-recall.test.mjs
```
This test uses exclusively synthetic ten-row Owner-looking data:
zero provided receipts -> 0/10 physically validated despite 10/10
legacy BOUND; 7 receipts -> 7/10 (70%) numerical threshold only;
6 receipts -> 6/10; duplicates, missing labels, reused target names,
wrong pairs, incomplete physical proof and stale source SHA fail closed.
**These are not genuine Owner PS↔SL benchmark results**.

CI invokes the native controls, authentic physical inventory and the
missing-input gate from the existing PR #70 qualification workflow.
An actual complete Owner mapping is STILL required. When received, run
a separate independently reviewed physical evidence intake in read-only
mode; do not fabricate independent receipts from #101's current
`physicalIdentityCertified=false` shadow or import the golden into matching.
