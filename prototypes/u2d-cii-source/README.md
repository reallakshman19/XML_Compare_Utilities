# U2d — Transfer values from a CII 2019 file into its PSI116

Owner, 13 Nov 2026: the engineer values live in the standalone CII that the 3D_Converters XML→CII 2019 tab wrote (names, rigid weights, process data, material). U2d writes them back into the PSI116, so the PSI116 carries them through the UXML route (D3 items: Node Name, Weight, Element block).

```
node ../p11-cii-map/cli.mjs match-psi116 target.xml standalone-v14.cii --tol 1 --frame cii2019 > match.json
python -E -s u2d.py --target target.xml --cii standalone.cii --match match.json --out revised.xml --changes changes.json
node ../u3-psi116-review/cli.mjs diff target.xml revised.xml --changes changes.json     # review page / diff
python -E -s ../u3b-cii-check/u3b_check.py --converter <3DC>/converters/scripts --base target.xml --revised revised.xml --receipt changes.json --out u3b.json --cii-dir cii
python -E -s compare_cii.py standalone.cii cii/revised.cii --weight-scale 10           # benchmark: values reproduced
python -E -s -m unittest discover -s tests -v                                            # public RMS-BLOW-1 only
```

`standalone-v14.cii` = `python cii_v11_v14.py standalone.cii standalone-v14.cii` (3D_Converters); the matcher reads v14 only. Values are read from the original v11 file with the converter's own layout (`../u3b-cii-check/u3b_core.py`). Node numbers are the same in both files.

## What is transferred

| CII value | PSI116 field | Rule |
|---|---|---|
| NODENAME (from / to) | Node/NodeName of that end | |
| RIGID weight of an element | Node/Weight of its to-node | ÷ 10 (the tab writes kg × 10 = N) |
| Wall (row 2, from end) | Node/WallThickness | 0.01 (= missing) is skipped |
| Insulation, corrosion (row 2, to end) | Node/InsulationThickness, CorrosionAllowance | |
| T1–T9, P1–P9 | Branch/Temperature/TemperatureN, Pressure/PressureN | CII 0 does not overwrite a PSI116 −100000 (unset) |
| Fluid density (row 6) | Branch/FluidDensity | × 1e6 (kg/cm³ → kg/m³) |
| MISCEL_1 material | Branch/MaterialNumber | |

Branch values are taken from every element whose to-node maps into the branch; if they disagree the field is refused (`U2D_BRANCH_FIELD_SPLIT`). A CII node maps to the PSI116 record with the same NodeNumber at that point, else to the single positive-numbered record there; otherwise `U2D_NODE_AMBIGUOUS` (nothing written for that end). Only values that differ are edited. Repeated names need no popup here: pairing is by position, not by name (D2 applies to name-based pairing).

Writing is done by the unchanged U1 (`../u1-psi116-uxml/cli.mjs apply`). The receipt is a `u2.transfer-receipt` (`kind: cii-source`), accepted by U3a and U3b. No revised file is left without its receipt.

Refusals: `U2D_OUTPUT_EXISTS`, `U2D_MATCH_INVALID`, `U2D_MATCH_FILE_MISMATCH`, `U2D_MATCH_FRAME`, `U2D_ROUNDTRIP_MISMATCH`, and any U1 refusal.

## Results on the Owner's files (Oracle, local, counts only, 13 Nov)

Standalone CII vs the CII converted from the PSI116, elements matched by node numbers:

| | BM2 before → after | EF-05 before → after |
|---|---|---|
| Matched elements | 284 | 486 |
| T1, T2, T3, P1 | 0 → 282 | 0 → 486 |
| Fluid density | 36 → 282 | 0 → 486 |
| Material | 20 → 284 | 486 → 486 |
| Wall | 0 → 209 | 4 → 437 |
| Corrosion | 284 → 284 | 4 → 427 |
| Names | 284 → 284 | 486 → 486 |
| U3b | PASS (483 carried, 2 not) | PASS (1,212 carried, 12 not) |

Open: BM2 rigid weights (44 transferred) cannot be compared yet — the tab renumbers component nodes, so most weighted elements have no number match (2 of 144). Ends at points with several PSI116 records are refused (BM2 306, EF-05 210 element ends).
