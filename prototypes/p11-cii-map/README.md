# p11-cii-map · CII reader and CII-CII map

## What it does
It takes two CAESAR II version 14 files (A and B) and finds which element and which node of A is which in B, by geometry. It lists the element pairs, node pairs, the elements and nodes that have no partner, and, for every element pair, the named values that differ: diameter, wall, insulation, T1, P1, rigid weight, restraint count and the FROM/TO node names. It is read-only: it never writes a CII file and never writes a Map file (that is P1.3).

## Run
```
node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]   # JSON; exit 0 OK, 1 refused, 2 bad usage
node --test                          # all tests (run inside this folder)
node bench/run.mjs [--root XCU=<xcu checkout>]
node ../_kit/card-check.mjs . --final
node tests/fixture-tools.mjs         # rewrites the invented fixtures, X-S1M and the manifest
```
Page: serve this folder over http (for example `python -m http.server 8011` inside it), open `http://localhost:8011/index.html`, choose two files, press Compare. It must be http on localhost, not a `file://` path, because the browser only loads modules and computes sha256 there.

## How a CII becomes a geometry graph (`engine/cii-graph.mjs`)
- `kit/cii14.mjs` reads the file (version 14 only).
- Each element gives one edge FROM → TO with its DX, DY, DZ (the 3rd to 5th numbers of the element's first line), its diameter and its wall.
- **How COORDS is read.** `#$ COORDS` row 1 holds the number of start points N. Rows 2..N+1 hold a node number and its X, Y, Z (mm), each in the usual 13-character fields. Every connected piece of the model is walked from node to node by adding the element deltas (subtracting when walking an element backwards). A piece that holds a COORDS node is then shifted so that node sits at its COORDS position. A piece without a COORDS node stays in a relative frame that starts at 0,0,0. X-T has 5 pieces: 3 with a COORDS start point and 2 without.
- **Loops.** CII v14 writes 7 significant digits, so a loop of long elements may not close exactly, while ciifr-map's graph builder demands 1e-4 mm. Before calling it, `closeLoops` walks each piece. Where an element closes a loop, the miss may be up to 6 mm (fixed Owner limit, 12 Nov 2026). Within that, the element's delta is replaced by the difference of the positions first reached, and the closure is listed in the graph's `loopClosures`. Beyond it, `MAP_LOOP_NOT_CLOSED` names the node and the miss. The file's own tokens stay in each edge's `xmlWitness`.
- `#$ UNITS` must say native mm (the same check ciifr-map makes for F05 XML).
- The graph is built by ciifr-map's own `buildXmlGraph` (vendored unchanged), so it has exactly the same shape as the XML graph. We fill in the node names from `#$ NODENAME` and add two keys: `cii` (the kit read) and `ciiElements`. Each edge also carries `ciiElementIndex`. T8 checks the shape and positions against ciifr-map's reader on X-F05.

## How two graphs are matched (`engine/compare.mjs`)
1. **Anchors.** Without `--anchors`: every node with the same number in A and B whose positions are within the tolerance. With `--anchors 10:10,20:25,...`: exactly those.
2. **Fit, per connected piece of A.** The anchors of the piece go through ciifr-map's Method C rigid fit (vendored `resolution-fit.js` → `registerMethodC`). It needs at least 3 anchors that are not all on one line. In automatic mode it first fits on the anchors at exactly the same position, so one moved node does not pull the fit. The fit uses at most 12 well-spread anchors: the vendored line check tests every set of 3 anchors, which was too slow with 96.
   - A piece that cannot be fitted (no anchor, fewer than 3, or all on one line) is listed in `unfittedComponentsA` with the reason, and its elements are unmatched with that reason. The rest of the model is still compared.
   - Exception: if every anchor of such a piece is the same node number at exactly the same raw position, the piece gets the identity fit. This applies only once another piece has a real fit.
   - `MAP_ANCHORS_TOO_FEW` comes only when no piece of A can be fitted.
3. **Nodes.** Each A node is moved by its piece's fit. ciifr-map's `findMethodCCandidates` then finds the B nodes within the tolerance (a distance, after the fit). Pairs are made one-to-one: nearest first, and the same node number first on a tie. The rule is judged on the **raw** positions in the two files:
   - within 0.001 mm: `same-number-same-position` or `same-position`;
   - within 0.001 mm only after the fit: `same-number-after-fit` or `same-position-after-fit`;
   - otherwise: `nearest-within-tolerance`.

   Each pair carries `rawDistanceMm` and `distanceMm` (after the fit).
4. **Elements.** An A element pairs with the B element that joins the two paired nodes, in either direction (`reversed`). Its rule is the weaker of its two node rules. `unmatchedA` / `unmatchedB` list elements only; nodes without a partner are in `unmatchedNodesA` / `unmatchedNodesB`.
5. **Differences.** For each fitted piece that the fit moves by more than 0.001 mm anywhere, one `MODEL_OFFSET` entry gives the translation, the rotation and the largest move. Then, for each element pair: diameter, wall, insulation, T1, P1, rigid weight (the element's RIGID record), restraint count (used slots of its RESTRANT record), and the FROM and TO names of its NODENAME entry.

## Refusal codes
| code | meaning |
|---|---|
| `INPUT_SHA256_MISMATCH` | A benchmark file is not the pinned file (from the kit). |
| `CII_VERSION_UNSUPPORTED` | The file is not CAESAR II version 14 (from the kit reader; its other `CII_*` codes pass through unchanged). |
| `MAP_EMPTY_INPUT` | A file is empty, has no elements, or a graph is missing. |
| `MAP_COORDS_INVALID` | The `#$ COORDS` section is broken: its count does not match its rows, or a row is not a node and three numbers. |
| `MAP_UNITS_NOT_MM` | The `#$ UNITS` section is missing or does not say lengths are in native mm. |
| `MAP_GRAPH_INVALID` | The elements cannot form a geometry: for example, an element from a node to itself, or two COORDS start points that disagree. The detail gives ciifr-map's reason. |
| `MAP_ANCHORS_TOO_FEW` | No piece of model A can be fitted: every piece has fewer than 3 anchors, or its anchors all lie on one straight line. Give manual anchors (`--anchors 10:10,20:20,30:30`). |
| `MAP_LOOP_NOT_CLOSED` | A loop of elements does not close: the miss is more than 6 mm (Owner, 12 Nov). The refusal names the node and the miss. Closures within 6 mm are listed in `graph.loopClosures` and in the compare output (`loopClosures`, `summary.loopClosuresA/B`). |
| `MAP_ANCHOR_INVALID` | A manual anchor is badly written, names a node that is not in the file, or uses a node twice. |
| `MAP_FIT_FAILED` | The anchors disagree: after the best rigid fit they are further apart than the tolerance. |
| `MAP_TOLERANCE_INVALID` | The tolerance is not a number from 0 to 100000 mm. |
| `MAP_EXPORT_INVALID` | The comparison, input file identity, selection, approval details or Map file is invalid. No Map file is produced. |
| `MAP_NOT_ONE_TO_ONE` | Two approved pairs would share a source or target. No approval is changed. |
| `MATCH_SAME_RUN_BROKEN` | Element count, end nodes, delta or positions disagree in same-run mode. |
| `MATCH_TOLERANCE_INVALID` | Tolerance must be a finite positive number. |
| `MATCH_NODE_AMBIGUOUS` | Several CII nodes are close to one XML node, or a CII node would be reused. |
| `MATCH_ELEMENT_AMBIGUOUS` | More than one element pairing uses the matched endpoints. |
| `MATCH_GRAPH_INVALID` | Graph has invalid or repeated nodes, or invalid element data. |
| `MATCH_MODE_INVALID` | Choose same-run or geometry. |
| `MATCH_XML_INVALID` | XML could not be read as the supported F05 profile. |
| `MATCH_MAP_WRITE_FAILED` | CLI could not create a new output file; existing files are not overwritten. |

## P1.3: Review and export a Map file
Use the same page as P1.1 (`python -m http.server 8011` from this folder, then open `http://localhost:8011/index.html`). Compare two v14 CII files. Each element and node pair starts as a candidate. Enter your name, tick pairs and choose **Approve selected**, or choose **Approve all exact** to approve only same-number-same-position candidates. **Reject selected** clears approval and marks those pairs rejected. Changing an input clears the previous Map file. **Export Map file** validates and displays JSON; use Copy or Download Map file. Validate the downloaded file with `node shared/topofix-formats/validate.mjs <file>` from the repo root.

`toMapFile(compareResult, {sourceFile, targetFile, method, createdAt})` takes file descriptors `{fileName, sha256}` taken from the compared graphs. It checks both hashes against the comparison, preserves the pair rule and after-fit residual, and validates the result. `approvePairs(map, ids | 'all-exact', {by, at})` and `rejectPairs(map, ids)` return a new Map file or refuse; they never mutate the input. The shared validator is vendored unchanged. The page maps Node-only CLI imports to throwing browser stubs; the pure validator runs without filesystem calls.

Map v1 does not permit an extra review-notes property. All loop closure records, including unmatched closures, are preserved as a clearly labelled map-wide review note in the first pair's `evidence.detail`, after its residual. The comparison page also shows the closure table before approval. If there are closure notes but no pairs, export refuses rather than discarding them. No CII bytes are changed.

## P1.2: Match InputXML to CII (read-only)

Use F05 RichInputXML and CII v14 in the same coordinate frame. Same-run checks the element order, node numbers, deltas and end positions (default 0.01 mm). Geometry uses positions only (default 1 mm), refuses ambiguous matches, and can pair reversed elements. No rigid fit, rotation, translation, PSI116 or editing. The result includes paired and unmatched nodes and elements on both sides, plus CII loop closure notes. The optional Map is node-only and candidate-only; its XML ordinals are graph ordinals, not PSI116 editing addresses. The map cannot carry loop closure notes in its distance-only evidence, so export refuses when closures are present. Output names must not already exist.

From the card folder:

```sh
node cli.mjs match-xml ../ciifr-map/tests/fixtures/S1-F05.xml ../../Benchmark/S1.CII --mode same-run --map p12-map.json
node ../../shared/topofix-formats/validate.mjs p12-map.json
node cli.mjs match-xml ../ciifr-map/tests/fixtures/S1-F05.xml ../../Benchmark/S1.CII --mode geometry
node --test
node bench/run.mjs
```

Both comparisons should give 56 element pairs and 57 node pairs; the Map validator prints OK. The Node command uses the existing XML reader and the same XML scanner adapter as the earlier graph tests. The page is unchanged.
