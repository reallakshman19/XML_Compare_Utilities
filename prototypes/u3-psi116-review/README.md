# U3a — Review revised PSI116

Open `index.html` from the repository's local static server (localhost/secure context for browser modules and SHA-256). The page has no external dependencies, uploads, fetch calls or build step. Select original and revised PSI116 files; optionally select the U2b changes JSON. Inspect changed values grouped by original branch and node ordinals, plus field counts. Changes outside a branch are shown separately. Old/new text is highlighted, with raw text shown when entity encoding differs. A red refusal disables approval. Approve downloads `approval.json` only; it does not write or convert PSI116.

The optional changes file must contain `revisedSha256` or `sha256After` (both must match if supplied). `originalSha256` and `sha256Before`, if supplied, must also match. The XML diff, not the changes JSON, supplies all displayed counts and rows. An absent changes file is allowed; a supplied invalid file is not.

From this folder:

```sh
node --test
node cli.mjs diff original.xml revised.xml [--changes c.json]
```

CLI success prints JSON (hashes, changeCount, fields, rows); refusal prints a reason to stderr, exits 1 and emits no output. Bad usage exits 2. Engine exports `comparePsi116` and `approvePsi116` from `review.mjs`; approval recomputes the entire review. No edits to the XML files or existing kit.

Refusals: `U3_BYTES_REQUIRED` (non-byte input), `U3_CHANGES_INVALID` (missing revised hash/invalid envelope), `U3_SHA256_MISMATCH` (hash differs or invalid), and the kit XML refusals including `XML_MARKUP_CHANGED`, `XML_STRUCTURE_CHANGED` and `XML_PROFILE_UNEXPECTED`. Changes to leaf-contained markup and namespace declarations also refuse conservatively as markup.
