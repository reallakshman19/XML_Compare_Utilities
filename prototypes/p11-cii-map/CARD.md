### P1.1 · CII reader and CII↔CII map (L1 Mapping)

**Repo / folder:** XCU, `prototypes/p11-cii-map/`
**Needs:** K2

**Goal.** Match the elements and nodes of two CII files by geometry, the way `prototypes/ciifr-map` already does for two XMLs. List the pairs and the differences, read-only.

**Build:**
1. `engine/cii-graph.mjs`: `readCiiGraph(bytes)` returns the **same graph shape** that `prototypes/ciifr-map/xml-graph.js` `buildXmlGraph` returns. Read that file first and copy the shape; do not invent a new one.
   - Node positions come from the ELEMENTS deltas (DX, DY, DZ, the 3rd to 5th numbers of the element's first line), walked from the `#$ COORDS` start points.
   - CII version 14 only: use `kit/cii14.mjs`.
   - It can reuse `vendor/` copies of `physical.js` and the P0.2 reader, if P0.2 is merged by then; otherwise write a small reader.
2. `engine/compare.mjs`: `compareCii(a, b, {anchors, toleranceMm=1})`. Reuse the Method C fit by copying `resolution-fit.js` and its imports into `vendor/` unchanged. It returns:
   - `pairs[]` (element pairs and node pairs, each with a `rule`: `same-number-same-position`, `same-position`, `nearest-within-tolerance`)
   - `unmatchedA[]`, `unmatchedB[]`
   - `fieldDiffs[]`: for each element pair, which named values differ (diameter, wall, insulation, T1, P1, rigid weight, restraint count, node name)
3. With no anchors, use automatic anchors: nodes with the same number and a position within tolerance, at least 3 of them, not all on one line. Fewer than 3 gives `MAP_ANCHORS_TOO_FEW`; then ask for manual anchors.
4. `cli.mjs`: `node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1]` prints JSON.
5. `index.html`: load two CII files and show the pair table and difference table. You may reuse the ciifr-map SVG overlay by copying it. Keep it simple.

**Tests:**
- T1: `readCiiGraph(X-S1)` gives 56 elements, and every element's TO position = FROM position + delta, within 1e-6 mm.
- T2: X-S1 against itself: 56/56 element pairs, 0 unmatched, 0 field differences.
- T3: X-S1 against X-S1M (a copy the test makes from X-S1: the rigid weight × 1.1, the T1 of elements 3 and 7 changed, and the FROM name of NODENAME entry 1 changed): 56/56 element pairs, and `fieldDiffs` lists exactly those 4 changes.
- T4: X-T against X-TEXP: 1614/1614 element pairs and 0 unmatched. Their geometry is identical; the differences are node names (TEXPECTED has 1 extra NODENAME entry and 53 changed rows), 1 restraint row and 7 allowable rows. Also: X-S1 against X-S1 with its last element removed from the graph in memory gives 55 pairs and 1 in `unmatchedA`.
- T5: X-S2 against itself: 46/46.
- T6: An invented 3-element fixture with all nodes on one straight line gives `MAP_ANCHORS_TOO_FEW` in automatic mode.
- T7: Moving one node by 0.5 mm in an invented fixture keeps the pair at tolerance 1. At tolerance 0.1 the pair is reported unmatched.
- T8: The graph from `readCiiGraph(X-S1)` and the graph from the existing ciifr-map XML reader on X-F05 (made from the same public S1 original) have the same node count and the same positions within 1 mm. This checks that the shapes really are the same.

**Mutation check:**
- M1: ignore DY (T1 red).
- M2: treat the tolerance as 0 (T7 red).
- M3: count unmatched as matched (T4 red).

**Benchmark:**
- B1: X-S1 vs X-S1M, under 300 ms.
- B2: X-S2 vs itself, under 300 ms.
- B3: X-T vs X-TEXP (2.87 MB each). Report the time, the pair count and the unmatched counts; pass if under 30 s.

**Owner demo.**
1. Open `index.html` and load X-T and X-TEXP. All 1614 elements are paired, and the differences table lists the node-name changes.
2. Load X-S1 and X-S1M (the test writes X-S1M to `tests/fixtures/`, listed in the manifest as cut from X-S1). The 4 planted changes are listed.

**Out of scope:** writing a Map file (that is P1.3); XML inputs (P1.2); any editing.


### P1.3 · Map file export (L1 Mapping)
**Repo / folder:** XCU, `prototypes/p11-cii-map/` (same folder; continue the P1.1 branch, or branch from it after P1.1 merges) **Needs:** P1.1 merged, K1

**Goal.** Turn P1.1's pairs into a `topofix.map` v1 file that a person approves, pair by pair or all at once.

**Build:**

1. `engine/to-map.mjs`: `toMapFile(compareResult, {sourceFile, targetFile, method:'geometry-pair'})` returns a Map file.
   - Every pair starts with `status: candidate`.
   - `evidence.rule` = the P1.1 rule, and `evidence.detail` = the residual in mm.
   - Element pairs use `cii` refs; node pairs use `cii-node` refs.
2. `engine/approve.mjs`:
   - `approvePairs(map, pairIds|'all-exact', {by, at})` sets the status to `approved`. `'all-exact'` approves only pairs whose rule is `same-number-same-position`.
   - `rejectPairs(map, pairIds, ...)` sets the status to `rejected`.
   - Approving a pair that would break 1:1 (rule R10) gives `MAP_NOT_ONE_TO_ONE` and changes nothing.
3. The UI gets a checkbox per pair, plus "Approve all exact", "Approve selected" and "Export Map file". The export shows JSON in a text box with a Copy button; downloads also work when the page runs locally.
4. Every exported file passes `shared/topofix-formats/validate.mjs`.

**Tests:**

- T1: X-S1 vs X-S1M, then `toMapFile`, passes the validator, with 56 element pairs, all candidates.
- T2: `'all-exact'` on X-T vs X-TEXP: every approved pair has the rule `same-number-same-position`. The test asserts the count is above 0 and prints it.
- T3: Forcing a second approved pair onto the same target gives `MAP_NOT_ONE_TO_ONE`, and the file is unchanged.
- T4: A round trip (export, parse, export) gives identical JSON.
- T5: Each header `sha256` equals the sha256 of its input file.

**Mutation check:**

- M1: write the wrong sha256 (T5 red).
- M2: let `'all-exact'` approve nearest pairs (T2 red).
- M3: skip the 1:1 check (T3 red).

**Benchmark:**

- B1: Map file for X-T vs X-TEXP. Report the pair count and the time; it must be under 1 s after the compare.

**Owner demo.** X-T vs X-TEXP, then "Approve all exact", then Export. Then run the validator; it prints OK.

**Out of scope:** XML↔CII (P1.2); applying anything.

## P1.2 — InputXML to CII matching (Oracle follow-up)

Base: XCU main `8409590f36b641bfc755809e27f2e46d315300f2` plus P1.3 patch `45b74e1212c7e47b92021379192e4bcbe8482e1272feeabae87f353cc793066c`. InputXML F05 only; PSI116 deferred. No fitting, editing, browser work, push or merge.

- `engine/xml-match.mjs`: same-run (default 0.01 mm) checks ordered elements, node identities, delta axes and both end positions; geometry (default 1 mm) matches unique positions, independent of numbers, then matches edges in either orientation. Refuse ambiguous matches or invalid tolerance.
- `engine/xml-to-map.mjs`: node pairs only, candidate Map v1, `source.kind=xml`, `target.kind=cii`, `method=geometry-pair`. Use measured input hashes, XML node ordinal, and distance in evidence. Element pairs remain in matching result.
- CLI: `node cli.mjs match-xml <file.xml> <file.cii> [--mode same-run|geometry] [--tol <mm>] [--map out.json]`.

Tests (titles start `P1.2 T1` through `P1.2 T8`):
- P1.2 T1: X-F05/X-S1 same-run 56 elements, 57 nodes.
- P1.2 T2: X-F05/X-S2 refuses.
- P1.2 T3: in-memory XML element 10 delta +5 mm refuses naming element 10.
- P1.2 T4: geometry matches the same refs as T1.
- P1.2 T5: invented renumbered CII (+1000) matches by geometry, not same-run.
- P1.2 T6: Map file validates using the shared validator CLI.
- P1.2 T7: invalid tolerances refuse.
- P1.2 T8: two CII nodes within tolerance refuse as ambiguous.

Mutations: M1 same-run tolerance 1e6 (T3 red), M2 omit branchOrdinal (T6 red), M3 pair by node numbers (T5 red). B1 both modes, median of three engine calls including graph reads, under 2000 ms each. Pinned input hashes in `kit/BENCHMARKS.json` and tests. Fresh `node --test` and final card-check required.
