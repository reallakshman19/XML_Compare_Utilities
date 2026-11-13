# U1 report
Base: XCU `8409590f36b641bfc755809e27f2e46d315300f2`; branch `proto/u1-psi116-uxml-20261113`.

## TESTS
Fresh `node --test` in card folder: 13 pass / 13 total; 0 fail. T1–T6 plus T7 (mapper parity), T8 (remaining fields), T9 (CLI), T10 (integer identity), T11 (NodeName hazards), T12 (plain decimals), T13 (exact-span parity). All invented data; no project/benchmark files read. Browser not required.

## MUTATIONS
Each mutation was applied temporarily, run by hand, and restored before the next.
| Mutation | Named test | Mutant | Restored |
|---|---|---|---|
| M1 rebuild whole document on no-edit path | U1 T1 | RED (exit 1) | GREEN |
| M2 skip before check | U1 T5 | RED (exit 1) | GREEN |
| M3 allow split branch values | U1 T5 | RED (exit 1) | GREEN |
| M4 skip re-read parity (re-run after review) | U1 T7 | RED (exit 1) | GREEN |
| M5 skip only exact-span xmlDiff check | U1 T13 | RED (exit 1) | GREEN |

## BENCH
`node bench/run.mjs`: invented 40 branches x 30 nodes, 646252 input bytes, 1200 Weight edits, 1200 exact changed spans. One warm-up, then median of five measured engine calls; gate < 2000 ms. Wall median 405.631 ms; process CPU median 690.464 ms (user+system, can exceed wall time). PASS, all five calls produced 1200 changes.

| Run | Wall ms | CPU user ms | CPU system ms | CPU total ms |
|---|---:|---:|---:|---:|
| 1 | 505.798 | 725.756 | 117.487 | 843.243 |
| 2 | 405.631 | 590.596 | 99.868 | 690.464 |
| 3 | 367.667 | 398.376 | 92.421 | 490.797 |
| 4 | 556.576 | 859.352 | 114.026 | 973.378 |
| 5 | 359.343 | 582.169 | 60.230 | 642.399 |

## DECISIONS
1. Use exact kit-decoded trimmed text for before; preserve surrounding whitespace and raw markup. Refuse self-closing targets as absent because changing them requires markup edits; refuse embedded comment/PI markup.
2. Accept finite plain decimal values only, strings or numbers: optional minus, digits, optional decimal fraction. No exponent, plus, trailing/leading decimal point or negative zero. NodeName rejects CR, leading/trailing Unicode whitespace (including NBSP) and U+FEFF anywhere before writing; invalid XML characters refused.
3. Identical duplicate writes collapse; no-op writes produce no change entry. Conflicting writes refuse before any output. Original byte offsets are returned.
4. CLI requires the explicit {fileSha256, edits} envelope; bare arrays refused. Exclusive output creation; no overwrite.
5. Use Code C InputXML engineering categories, including InsulationDensity in ProcessBlock and Weight in RigidBlock. Branch ownership follows PSI116, not InputXML.
6. Re-read all edited fields through kit; check the four currently mapped node fields against the precise UXML component identified by branch/node ordinals. Other fields have no semantic parity projection in the existing mapper; no invented UXML values. Whole mapper is invoked without changes.
7. Normalize integer node numbers for comparison only, using the mapper’s decimal integer grammar and BigInt (no precision loss); other ref fields retain exact comparison.
8. Preserve kit refusal codes `XML_TEXT_CDATA` (CDATA leaf), `XML_CHILD_MISSING` (e.g. missing NodeNumber), `XML_CHILD_NOT_UNIQUE` (duplicate child) and `XML_REF_NOT_FOUND` (missing ordinals), all fail-closed.
9. Export the pure parity verifier so the exact-span guard can be tested independently with an unplanned value change.

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
None. Benchmark gate passed on the review run.
