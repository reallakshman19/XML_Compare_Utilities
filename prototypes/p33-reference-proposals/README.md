# Reference CII to proposals (P3.3)

Compare rigid weights from a reference CAESAR II version 14 CII to a target CII, using a TopoFix Map v1 file. Only approved element pairs with matching file checksums and FROM/TO identities are eligible. The target's exact trimmed token is retained. Every proposed weight is unapproved; the engine never edits CII or XML.

## Run

Node 20+; no packages. From this folder:

```sh
node cli.mjs propose reference.cii target.cii map.json proposals.json
node --test
node bench/run.mjs --repo-root ../..
```

The command creates a **new** JSON file only (exit 0); an existing output is refused. On refusal it prints JSON and exits 1. Bad usage exits 2. The browser page uses the same engine: run `python -m http.server 8000` in this folder, open `http://localhost:8000`, load both CII files and the Map file, then Review weights and Export proposals. No browser check was requested.

The result contains `changeset`, `unchanged`, `notComparable`, `review`, and `rows`. The exported file contains only the Change set. Candidate, rejected and node pairs are review rows. Both sides without rigids are skipped. One-sided rigids are not comparable. Zero reference weights need human confirmation under R9 and are shown for review, never exported with invented confirmation. If the UNITS sections are absent or differ, the pair is not comparable; no conversion is attempted. Difference % uses the absolute target weight as denominator; a zero target has no percentage. The Change set uses the Map file's timestamp for deterministic output. The optional map-file hash is omitted because the engine receives a parsed object rather than original JSON bytes.

## Refusal codes

| Code | Meaning |
|---|---|
| `PROPOSE_MAP_INVALID` | The Map file is invalid or not CII-to-CII. |
| `PROPOSE_MAP_FILE_MISMATCH` | The reference or target checksum does not match the Map file. |
| `PROPOSE_REF_MISMATCH` | An approved element index or FROM/TO does not match the CII. |
| `PROPOSE_FIELD_NOT_ENABLED` | Only rigid weight can be proposed. |
| `PROPOSE_CHANGESET_INVALID` | The resulting Change set fails validation. |
| `PROPOSE_OUTPUT_NOT_JSON` | The requested output is not a JSON file. |
| `PROPOSE_OUTPUT_FAILED` | The new JSON file cannot be published without overwriting a file. |
| `INPUT_SHA256_MISMATCH` | A benchmark does not match its pinned checksum. |
| `CII_VERSION_UNSUPPORTED` | The supplied CII is not version 14. |

Other malformed-CII refusals are passed through unchanged from the kit reader, not translated. The original kit tests cover reader-specific codes.

## Owner demo

From this folder run `node tests/demo.mjs <new-directory>`. This test-only helper creates X-S1M from the pinned public X-S1 and writes a hand-built Map. Then run the CLI with the paths printed by the helper. Expect one weight proposal and `approval.approved: false`. The helper writes a fixture CII, not a revised production CII; the application itself never writes CII.
