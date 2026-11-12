# P2.1 — RIGID weights from a Change set

Load a CAESAR II version 14 CII (mm, kg). List its rigids, propose weight corrections from a CSV, approve the changes beyond a percentage limit, then write a new CII. Only the approved RIGID weight fields change. Every edit is read back and checked. A refusal leaves the original file untouched and produces no revised CII.

## Run

Use Node 20+ from this folder. Run the four commands in order (choose unused output paths):

```sh
node cli.mjs inventory ../../Benchmark/T.CII
node cli.mjs propose ../../Benchmark/T.CII tests/fixtures/demo-x-t-20.csv proposed.json
node cli.mjs approve proposed.json approved.json --limit 20 --by "Engineer"
node cli.mjs apply ../../Benchmark/T.CII approved.json revised.cii
```

The CSV header is `fromNode,toNode,newWeight[,note]` (the optional column is literally `note`). FROM and TO must match exactly one rigid in that order. Weights are kg. The proposal has no approvals. The approval command omits changes within or exactly at the limit; a nonzero change from zero is beyond any finite relative limit. CSV zero is refused because it cannot record explicit confirmation; a valid imported Change set may specify `approval.zeroConfirmed: true` instead. No output path is overwritten. A supplied approved Change set can be applied directly, but only to the matching CII hash.

For the page, serve this folder locally (e.g. `python -m http.server 8000`), then open `http://localhost:8000/index.html` in a modern browser. File URLs do not reliably support ES modules; localhost also enables Web Crypto and clipboard. The page loads no external libraries and sends no files to a server. Review all seven steps. Download the revised CII and Change set; the JSON can also be copied. The unchanged P0.2 validator imports Node CLI helpers, so the browser uses a local import map with throwing stubs for those unused functions. It executes the same validation code, not a second validator.

Tests: `node --test tests/engine.test.mjs`, `node --test tests/cli.test.mjs`, `node --test tests/kit.test.mjs`. Benchmark: `node bench/run.mjs --repo-root ../..`. All benchmark inputs are read from the checkout and checked against pinned hashes. Use a v14 CII for the owner demo; v11 is refused. Only the mm/kg profile is supported; no unit conversions are performed.

## Refusal codes

| Code | Meaning |
|---|---|
| `WEIGHTS_ROW_NOT_FOUND` | The FROM/TO pair does not identify a rigid. |
| `WEIGHTS_ROW_AMBIGUOUS` | More than one rigid matches the pair. |
| `WEIGHTS_CSV_INVALID` | CSV header, quoting, or fields are wrong. |
| `WEIGHTS_APPROVAL_INVALID` | Missing engineer or invalid percentage. |
| `WEIGHTS_FIELD_UNSUPPORTED` | Only RIGID/WEIGHT element edits are allowed. |
| `WEIGHTS_UNIT_MISMATCH` | The Change set gives a unit other than kg. |
| `WEIGHTS_UNITS_UNSUPPORTED` | CII length or mass units are not mm and kg. |
| `WEIGHTS_DIFF_MISMATCH` | The diff does not contain exactly the planned weight fields. |
| `WEIGHTS_READBACK_MISMATCH` | A re-read weight does not match its planned value. |
| `WEIGHTS_JSON_INVALID` | Change set file is not valid JSON. |
| `WEIGHTS_OUTPUT_IS_INPUT` | Output path is an input path. |
| `WEIGHTS_OUTPUT_FAILED` | Output could not be created (including existing output). |
| `INPUT_NOT_FOUND` | The input file cannot be read. |
| `INPUT_SHA256_MISMATCH` | A public benchmark does not match its pinned checksum. |
| `KERNEL_CHANGESET_INVALID` | Shared validator rejected the Change set. |
| `KERNEL_BASE_KIND` | XML Change sets belong to Lane 3. |
| `KERNEL_BASE_SHA256_MISMATCH` | Change set belongs to a different CII. |
| `KERNEL_OLD_TOKEN_MISMATCH` | A weight token differs from the plan. |
| `KERNEL_NOT_APPROVED` | A change lacks approval. |
| `KERNEL_NO_RIGID` | The named element has no rigid. |
| `KERNEL_ZERO_NOT_CONFIRMED` | Zero weight needs explicit confirmation. |
| `KERNEL_NEGATIVE_WEIGHT` | A negative weight is not allowed. |
| `KERNEL_VALUE_INVALID` | The new value is not a finite number. |
| `KERNEL_VALUE_DOES_NOT_FIT` | The number cannot fit in the old CII field. |
| `KERNEL_VALUE_PRECISION_LOST` | The value cannot be represented without losing precision. |
| `CII_VERSION_UNSUPPORTED` | Only version 14 is supported. |

Other kernel/reader refusals pass through unchanged. See P0.2's README for the remaining structural and kernel codes; the vendored engine has not been modified.
