# U3a — Review revised PSI116

Serve the repository from localhost (required for module scripts and secure-context SHA-256; do not open via `file://`). From the repository root run `python3 -m http.server 8000 --bind 127.0.0.1`, then open `http://localhost:8000/prototypes/u3-psi116-review/`. The page has no external dependencies, uploads, fetch calls or build step. Select original and revised PSI116 files; optionally select the U2b changes JSON. Inspect changed values grouped by original branch and node ordinals, plus field counts. Changes outside a branch are shown separately. Old/new text is highlighted, with raw text shown when entity encoding differs. A red refusal disables approval. Approve downloads `approval.json` only; it does not write or convert PSI116.

The optional U2b receipt (`format: "u2.transfer-receipt"`, version 1) must contain `revised.sha256`, `base.sha256` and a `changes` array. Both hashes must match and the array length must equal the XML diff count. Legacy JSON with `revisedSha256` or `sha256After` remains accepted; `originalSha256` and `sha256Before`, if supplied, must match. All supplied hash aliases must agree, and any supplied changes array must match the count. The XML diff, not the changes JSON, supplies all displayed counts and rows. Approval records `changesSha256` (SHA-256 of the exact file bytes) and `boundToChanges: true`; without a changes file these are `null` and `false`. An invalid supplied file refuses. The engine also accepts a JSON string or an in-memory object; in-memory objects are bound to their `JSON.stringify` encoding, not a disk file.

From this folder:

```sh
node --test
node cli.mjs diff original.xml revised.xml [--changes c.json]
```

CLI success prints JSON (hashes, changeCount, fields, rows); refusal prints a reason to stderr, exits 1 and emits no output. Bad usage exits 2. Engine exports `comparePsi116` and `approvePsi116` from `review.mjs`; approval recomputes the entire review. No edits to the XML files or existing kit.

Refusals: `U3_BYTES_REQUIRED` (non-byte input), `U3_CHANGES_INVALID` (missing revised hash/invalid envelope), `U3_SHA256_MISMATCH` (hash differs or invalid), `U3_CHANGES_COUNT_MISMATCH` (receipt count differs from actual XML diff), and the kit XML refusals including `XML_MARKUP_CHANGED`, `XML_STRUCTURE_CHANGED` and `XML_PROFILE_UNEXPECTED`. Changes to leaf-contained markup and namespace declarations also refuse conservatively as markup.
