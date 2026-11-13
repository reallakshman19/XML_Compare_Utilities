# U3a report

Base: XCU 78623ca70ff182cd5df67f4ed4319ff177100e98; branch proto/u3a-psi116-review-20261113. Only prototypes/u3-psi116-review/ added. Read-only kit files from supplied ZIP verified against exact base Git blob hashes (xmlspan ce7cf72c9fc236b67be2be492319f8422bb92c8b; core eb57df5faea47589c663a02c04f96068b86a9cb0).

## TESTS

Fresh Node 22.16.0 `node --test` in the card folder after mutation restoration: 9 pass / 9 total, 0 fail, 0 skipped, 0 cancelled, 0 todo. T1 two rows and approval; T2 markup/structure refusal; T3 optional SHA mismatch, alias conflicts and invalid envelope; T4 identical bytes allow zero-change approval. Supplemental cases: repeated node numbers across branches, raw entity-only change, nested field, attribute value, leaf-comment markup refusal and CLI output/refusal. T5 exact raw receipt hashing and both bound/unbound approval; T6 receipt count, nested hashes, invalid receipt and alias conflicts; T7 CLI receipt acceptance and count refusal. All inputs invented strings. Browser check delegated to Oracle; no page opened.

## MUTATIONS

| Mutation | Test | Mutant | Restored |
|---|---|---|---|
| M1 replace xmlDiff call with empty array | U3a T2 | RED (exit 1, 0/1 pass) | GREEN |
| M2 skip checkHashes | U3a T3 | RED (exit 1, 0/1 pass) | GREEN |
| M3 skip only receipt count equality | U3a T6 | RED (exit 1, 0/1 pass) | GREEN |

## BENCH

No benchmark gate specified. Supplemental invented 40 branches x 30 nodes (118,340 bytes per file; all 1,200 weights changed), one warm-up and five engine calls, median 67.9 ms (62.3, 66.9, 67.9, 83.0, 126.5 ms). All calls returned 1,200 rows. Not a browser or private-project timing.

## DECISIONS

1. Use the exact XML kit diff as source of truth, including raw-only differences (e.g. changed entity encoding); decoded values and raw spellings are retained, so no byte-value change is hidden.
2. Use original structural branch and direct-node ordinals with names/numbers and component reference; repeated node numbers do not collapse. Nested and attribute field paths are shown, including values outside branches. Changed branch/node identities appear as their own rows.
3. Reject changed namespace declarations and changed leaf interiors containing raw markup, because the kit otherwise treats these as values. This conservative restriction may also refuse a value edit in a leaf containing an unchanged comment. No structure or markup approval.
4. Read U2b engine/apply.mjs at ff213998 via connector. Test uses an invented receipt of that exact format and shape (not a live U2b invocation); U2b is not in the supplied checkout. Require format u2.transfer-receipt version 1, revised.sha256, base.sha256, changes array and exact count equality. Retain legacy top-level hash aliases; all supplied aliases must agree. Counts and rows remain XML-derived.
5. Approval recomputes review/hash checks, not a mutable display summary. File changes clear old results, disable approval and invalidate in-flight review/download. Input text is rendered via textContent; no HTML injection. Static localhost module serving and secure-context SHA-256 required; README has a command. Browser checks remain Oracle-owned.
6. CLI has no approval or write command; only the explicit browser Approve button downloads the small hash-bound approval JSON. No network service or converter invoked.
7. Browser and CLI pass exact changes-file bytes; hash includes whitespace, BOM, and line endings. Approval contains changesSha256 and boundToChanges; no file gives null and false. In-memory engine objects use JSON.stringify encoding, not a disk-file claim.

## FAILING

None in Node tests or mutations. Browser runtime remains Oracle-owned. The U2b receipt fixture matches the connector-read schema; a live U2b apply was not run in this checkout.
