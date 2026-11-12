# p11-cii-map report
Branch / head commit: `proto/p11-cii-map-20261112`. The head is the commit that adds this report, on top of 27b8c3ce (cut from main 1cba98a5). It is local only and not pushed.

Tests: 20 pass / 0 fail   (`node --test`: `# tests 20 / # pass 20 / # fail 0`). T1-T8 are present by name, with one test per refusal code.

Mutation check (each break was made in engine/, `node --test` was run, then the break was undone with `git checkout -- engine`):
- M1: ignore DY (`delta = [DX, 0, DZ]` in `ciiProfile`). **T1 red: yes.** T8, the MAP_GRAPH_INVALID loop test, MAP_FIT_FAILED and the manual-anchor test also went red.
- M2: treat the tolerance as 0 (`const tol = 0 * Number(toleranceMm)`). **T7 red: yes.** The MAP_TOLERANCE_INVALID test also went red.
- M3: count unmatched as matched (an element without a partner is pushed into the pairs instead of `unmatchedA`). **T4 red: yes.** T7 also went red.

Bench (`node bench/run.mjs`). Each time is the median of 3 runs of readCiiGraph(A) + readCiiGraph(B) + compareCii:

| bench | input | element pairs | node pairs | unmatched A / B (elements) | unmatched A / B (nodes) | field diffs | ms | limit ms | pass |
|---|---|---|---|---|---|---|---|---|---|
| B1 | X-S1 vs X-S1M | 56 | 57 | 0 / 0 | 0 / 0 | 4 | 21.9 | 300 | true |
| B2 | X-S2 vs X-S2 | 46 | 47 | 0 / 0 | 0 / 0 | 0 | 16.5 | 300 | true |
| B3 | X-T vs X-TEXP | 1614 | 1619 | 0 / 0 | 0 / 0 | 72 | 882 | 30000 | true |

card-check: `card-check: PASS (9 checks)` with `--final`.

Refusal codes added: MAP_EMPTY_INPUT, MAP_COORDS_INVALID, MAP_UNITS_NOT_MM, MAP_GRAPH_INVALID, MAP_ANCHORS_TOO_FEW, MAP_ANCHOR_INVALID, MAP_FIT_FAILED, MAP_TOLERANCE_INVALID. The kit's CII_* codes pass through unchanged; CII_VERSION_UNSUPPORTED has its own test on X-SRC.

Anything that did not fit the card (and what you did instead):
- **unmatchedA / unmatchedB list elements only.** T4 asks for "55 pairs and 1 in unmatchedA" once an element is cut. If nodes were in the same list, the orphaned end node would make it 2. Nodes without a partner are in `unmatchedNodesA` / `unmatchedNodesB`. `pairs[]` holds both kinds, each with `kind: 'element' | 'node'`.
- **Same graph shape, by construction.** `readCiiGraph` turns the CII into the profile that ciifr-map's XML reader makes, then calls the vendored, unchanged `buildXmlGraph`. Additive keys: graph `cii` and `ciiElements`, edge `ciiElementIndex`. The node key stays `xmlIdentity`, as in the XML graph. T8 checks that the keys are equal (except these additive ones) and that positions agree within 1 mm against X-F05.
- **T8 parser.** ciifr-map's own tests parse XML with the npm package @xmldom/xmldom, which a card may not use. `tests/fixture-tools.mjs` has a 10-line DOM adapter over the kit's `xmlspan.mjs` scanner, and the vendored `readXmlGraph` runs on it unchanged.
- **Vendoring.** The card says to copy resolution-fit.js and its imports unchanged. Their imports reach `../../tabs/cii-workspace/...`, so `vendor/` mirrors the repo tree (`vendor/prototypes/ciifr-map/*`, `vendor/tabs/cii-workspace/*`, 14 files). That way the relative imports resolve inside the card folder without edits.
- **The fit uses at most 12 anchors per piece.** The vendored rigid fit checks lines over every set of 3 anchors (n³), and with ≤64 anchors it also runs a leave-one-out fit for each anchor. With all 57 S1 anchors one comparison took about 0.9 s. With 12 well-spread anchors (the widest triangle is always kept) it takes 22 ms. Every anchor is still checked afterwards as a node pair.
- **Model pieces.** X-T has 5 connected pieces: 3 start at a COORDS node and 2 have no COORDS node, so they stay in a relative frame from 0,0,0. Each piece of A is fitted on its own. A piece with 1-2 anchors, or with anchors all on one line, gives MAP_ANCHORS_TOO_FEW (fail closed). A piece with no anchor at all is listed in `unfittedComponentsA` and its elements are unmatched.
- **Automatic mode fits on exact anchors first.** It uses the same-position anchors when there are at least 3 not on one line, so one moved node (T7) does not shift the others off "same position".
- **X-S1M element numbers.** "Elements 3 and 7" are taken as 0-based `elementIndex` (the format's ref), so 3830→3840 and 3910→3940. T1 is +25 °C on each. Rigid 1 goes from 1390 to 1529 (×1.1). NODENAME entry 1's FROM name becomes `P11-RENAMED`; that entry belongs to element 52.
- **T4 differences.** X-T vs X-TEXP gives 72 field differences: 36 FROM names and 36 TO names. The changed RESTRANT row does not change any element's restraint count, and allowables are not a compared field, so neither shows up. T4 asserts that every difference is a name or restraint count; it does not assert an exact number, because the card's "53 changed rows" counts NODENAME rows, not named values.
- **index.html** is a plain page with no SVG overlay; the overlay was optional. It was not opened in a browser in this session (the brief said no browser tools). It uses the same engine modules as the CLI and needs http://localhost (see README).

Owner demo:
1. In `prototypes/p11-cii-map`, run `python -m http.server 8011` and open http://localhost:8011/index.html. Choose `Benchmark/T.CII` as A and `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` as B, then press Compare. You should see 1614 element pairs, 0 unmatched elements and 0 unmatched nodes, and 72 rows in the Differences table, all `fromName` / `toName`.
2. Choose `Benchmark/S1.CII` and `prototypes/p11-cii-map/tests/fixtures/X-S1M.cii` and press Compare. You should see 56 pairs and 4 differences: rigidWeight 1390→1529, T1 on elements 3 and 7 (325→350), and fromName PS-013.3→P11-RENAMED.
3. The same from the command line: `node cli.mjs compare ../../Benchmark/S1.CII tests/fixtures/X-S1M.cii --summary`.
