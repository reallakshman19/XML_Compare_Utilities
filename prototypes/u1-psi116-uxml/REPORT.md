# U1 report
Base: XCU `8409590f36b641bfc755809e27f2e46d315300f2`; branch `proto/u1-psi116-uxml-20261113`.

## TESTS
Fresh `node --test` in card folder: 9 pass / 9 total; 0 fail. T1–T6 plus T7 (mapper parity), T8 (remaining fields), T9 (CLI). All invented data; no project/benchmark files read. Browser not required.

## MUTATIONS
Each mutation was applied temporarily, run by hand, and restored before the next.
| Mutation | Named test | Mutant | Restored |
|---|---|---|---|
| M1 rebuild whole document on no-edit path | U1 T1 | RED (exit 1) | GREEN |
| M2 skip before check | U1 T5 | RED (exit 1) | GREEN |
| M3 allow split branch values | U1 T5 | RED (exit 1) | GREEN |
| M4 skip re-read parity | U1 T7 | RED (exit 1) | GREEN |

## BENCH
`node bench/run.mjs`: invented 40 branches x 30 nodes, 646252 input bytes, 1200 Weight edits, 1200 exact changed spans. Median of 3 engine calls; gate < 2000 ms. Initial run: 490.3 ms (374.5, 490.3, 532.4), PASS. Subsequent restored-engine runs: 4275.6, 3023.5, 2264.9 ms medians, FAIL; last run samples 1776.3, 2264.9, 8585.5 ms. All produced 1200 changes. Timing varied substantially between runs; repeatable sub-2 s not established. No performance waiver assumed.

## DECISIONS
1. Use exact kit-decoded trimmed text for before; preserve surrounding whitespace and raw markup. Refuse self-closing targets as absent because changing them requires markup edits; refuse embedded comment/PI markup.
2. Accept decimal/exponent finite numeric values only, strings or numbers; no hexadecimal, blank numeric or non-finite values. NodeName is escaped and must round-trip exactly, including through mapper normalization; invalid XML characters refused.
3. Identical duplicate writes collapse; no-op writes produce no change entry. Conflicting writes refuse before any output. Original byte offsets are returned.
4. CLI accepts raw edit array (hash measured from input) or an explicit hash envelope (recommended stale-file protection). Exclusive output creation; no overwrite.
5. Use Code C InputXML engineering categories, including InsulationDensity in ProcessBlock and Weight in RigidBlock. Branch ownership follows PSI116, not InputXML.
6. Re-read all edited fields through kit; check the four currently mapped node fields against the precise UXML component identified by branch/node ordinals. Other fields have no semantic parity projection in the existing mapper; no invented UXML values. Whole mapper is invoked without changes.

### U1_FIELDS
| Field | Code C category |
|---|---|
| Node/NodeName | NameBlock |
| Node/Weight | RigidBlock |
| Node/OutsideDiameter | SectionDimensionBlock |
| Node/WallThickness | SectionDimensionBlock |
| Node/CorrosionAllowance | MaterialBlock |
| Node/InsulationThickness | SectionDimensionBlock |
| Branch/Temperature | ProcessBlock |
| Branch/Pressure | ProcessBlock |
| Branch/FluidDensity | ProcessBlock |
| Branch/MaterialNumber | MaterialBlock |
| Branch/InsulationDensity | ProcessBlock |

Unsupported PSI116 fields: Branchname, NodeNumber, Endpoint, Rigid, ComponentType, ComponentRefNo, ConnectionType, Position, BendRadius, SIF, Restraint, BendType, AlphaAngle; all unlisted tags/attributes and structure edits. No unmapped category among supported fields.

## FAILING
No failing tests. BENCH: timing gate failed in the last three runs; first run passed. Oracle must repeat on its checkout before qualifying performance.
