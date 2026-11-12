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
- `#$ UNITS` must say native mm (the same check ciifr-map makes for F05 XML).
- The graph is built by ciifr-map's own `buildXmlGraph` (vendored unchanged), so it has exactly the same shape as the XML graph. We fill in the node names from `#$ NODENAME` and add two keys: `cii` (the kit read) and `ciiElements`. Each edge also carries `ciiElementIndex`. T8 checks the shape and positions against ciifr-map's reader on X-F05.

## How two graphs are matched (`engine/compare.mjs`)
1. **Anchors.** Without `--anchors`: every node with the same number in A and B whose positions are within the tolerance. With `--anchors 10:10,20:25,...`: exactly those.
2. **Fit, per connected piece of A.** The anchors of the piece go through ciifr-map's Method C rigid fit (vendored `resolution-fit.js` → `registerMethodC`). It needs at least 3 anchors that are not all on one line. In automatic mode it first fits on the anchors at exactly the same position, so one moved node does not pull the fit. The fit uses at most 12 well-spread anchors: the vendored line check tests every set of 3 anchors, which was too slow with 96. A piece with no anchor at all is listed in `unfittedComponentsA`, and its elements are unmatched.
3. **Nodes.** Each A node is moved by the fit. ciifr-map's `findMethodCCandidates` then finds the B nodes within the tolerance. Pairs are made one-to-one: nearest first, and the same node number first on a tie. The rule is `same-number-same-position` or `same-position` when the nodes are within 0.001 mm, otherwise `nearest-within-tolerance`.
4. **Elements.** An A element pairs with the B element that joins the two paired nodes, in either direction (`reversed`). Its rule is the weaker of its two node rules. `unmatchedA` / `unmatchedB` list elements only; nodes without a partner are in `unmatchedNodesA` / `unmatchedNodesB`.
5. **Differences.** For each element pair: diameter, wall, insulation, T1, P1, rigid weight (the element's RIGID record), restraint count (used slots of its RESTRANT record), and the FROM and TO names of its NODENAME entry.

## Refusal codes
| code | meaning |
|---|---|
| `INPUT_SHA256_MISMATCH` | A benchmark file is not the pinned file (from the kit). |
| `CII_VERSION_UNSUPPORTED` | The file is not CAESAR II version 14 (from the kit reader; its other `CII_*` codes pass through unchanged). |
| `MAP_EMPTY_INPUT` | A file is empty, has no elements, or a graph is missing. |
| `MAP_COORDS_INVALID` | The `#$ COORDS` section is broken: its count does not match its rows, or a row is not a node and three numbers. |
| `MAP_UNITS_NOT_MM` | The `#$ UNITS` section is missing or does not say lengths are in native mm. |
| `MAP_GRAPH_INVALID` | The elements cannot form a geometry: for example, an element from a node to itself, or a loop of elements whose deltas do not close. The detail gives ciifr-map's reason. |
| `MAP_ANCHORS_TOO_FEW` | A piece of model A has fewer than 3 anchors, or all its anchors lie on one straight line. Give manual anchors (`--anchors 10:10,20:20,30:30`). |
| `MAP_ANCHOR_INVALID` | A manual anchor is badly written, names a node that is not in the file, or uses a node twice. |
| `MAP_FIT_FAILED` | The anchors disagree: after the best rigid fit they are further apart than the tolerance. |
| `MAP_TOLERANCE_INVALID` | The tolerance is not a number from 0 to 100000 mm. |
