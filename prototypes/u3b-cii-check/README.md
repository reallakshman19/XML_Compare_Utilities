# U3b — Does the CII carry the transferred values?

Last step of the UXML route: PSI116 pairing (P1.2c) → transfer plan (U2a) → write-back (U1) → revised PSI116 + receipt (U2b) → review page (U3a) → **CII check (U3b)**.

U3b converts the base PSI116 and the revised PSI116 with the unchanged 3D_Converters app converter (`converters/scripts/xml_to_cii2019_runtime_custody.py`, the script the XML→CII 2019 standalone tab runs). It then reads both CII files and reports, for every change in the U2b receipt, whether its value is in the CII. It also proves that no other CII value changed. Read-only on all inputs; writes one new report file (and the CII files with `--cii-dir`).

```
python -E -s u3b_check.py --converter <3D_Converters>/converters/scripts \
  --base target.xml --revised revised.xml --receipt changes.json --out u3b.json [--cii-dir dir]
python -E -s -m unittest discover -s tests -v      # needs a 3D_Converters checkout: U3B_3DC=<root>
```

(`-E -s`, not `-I`: the converter imports its sibling scripts.) Exit 0 = PASS, 3 = FAIL (report written), 1 = refusal (no report), 2 = usage.

## What each row says

| Status | Meaning |
|---|---|
| `CARRIED` | The CII holds the transferred value at every element that takes it from this node or branch. |
| `CARRIED_TRUNCATED` | Name carried; CII NODENAME keeps 25 characters. |
| `NOT_CARRIED` | The value cannot reach the CII; `reason` says why (below). Not a failure, but the user must see it. |
| `MISMATCH` | The CII holds a different value. Fails the check. |
| `BRANCH_NAME_SHARED` | Several branches share the branch name; the converter applies branch values by name, so the change would reach other branches. Fails the check. |

**Rule:** every CII value that differs between base and revised must be claimed by one receipt change **and** hold the value that change predicts. That covers every ELEMENTS cell, the pointer rows (bend, rigid, restraint, SIF, name, reducer), every RIGID cell, NODENAME lines and MISCEL_1 materials. CONTROL may change only in the element count (elements the converter added) and the NODENAME count. BEND, SIF&TEES and REDUCERS rows may change only to a transferred OD (or wall, for REDUCERS). A block the converter rebuilt is accepted only as the weighted-RIGID split (one base element, same end nodes and length, one RIGID record, the same bend/restraint/SIF/reducer records), and its values are compared with the base element like any other change. PASS = all of that holds and no row is `MISMATCH`, `UNKNOWN_FIELD` or `BRANCH_NAME_SHARED`.

## How the converter treats each field (3D_Converters main 17fde0c46; converter scripts identical at d89de7e10, f10fd42fa; run without staged JSON or line list)

| PSI116 field | CII place | Note |
|---|---|---|
| Node/NodeName | NODENAME of the elements at that node | 25 characters kept |
| Node/Weight | RIGID of the element the node ends | Only RIGID ends. A weight on a 0-kg RIGID makes the converter split the flange from the RIGID (one extra element), reported under `structureChanges`. Some Rigid=2 nodes make the converter withhold the CII (`CII_WEIGHT_OWNER_UNRESOLVED`): BM2 8 of 54, EF-05 1 of 14 tried. |
| Node/OutsideDiameter | ELEMENTS row 1 | Only elements whose OD the converter takes from this node (from end, or to end of a BRAN endpoint 2). Where it takes the connected port OD, the row is `NOT_CARRIED`. |
| WallThickness (from end), InsulationThickness, CorrosionAllowance (to end) | ELEMENTS row 2 | Wall 0 or below is written as 0.01. Wall also feeds REDUCERS. |
| Branch/Temperature/Temperature1..9, Pressure/Pressure1..9 | ELEMENTS rows 2–5 | −100000 (unset) is written as 0 for every case. |
| Branch/FluidDensity | ELEMENTS row 6 | kg/m³ → kg/cm³ (×1e-6, the converter default `convertDensityKgM3ToKgCm3`). |
| Branch/MaterialNumber | MISCEL_1 material per element | Carries forward to following elements. |
| Branch/InsulationDensity | — | **Never carried**: the converter always resets it (its default when insulation ≥ 50 mm, else 0). |
| Nodes numbered 0 or below | — | Skipped by the converter in this run. If a converter run renumbers them, they are matched by ComponentRefNo + Position to an end no positive XML node claims. |

**In the full app run** (line list and masters loaded), the converter's process step also overwrites P1, T1–T3, fluid density and material from the line list and masters. U3b on the app's own output is the next step (needs the Owner's staged JSON).

## Identity

Element ends come from the converter's own element list (`u3b_dump.py` runs the converter unchanged and saves which XML node is at each element end). A PSI116 node is matched by ComponentRefNo + Position + NodeNumber. Base and revised elements are lined up by (from node, to node, branch).

## Refusals

`U3B_OUTPUT_EXISTS`, `U3B_CONVERTER_MISSING`, `U3B_RECEIPT_INVALID`, `U3B_SHA256_MISMATCH` (receipt hashes differ from the XML files), `U3B_CONVERT_FAILED` (the converter refused a file; its last message is shown), `U3B_CII_UNREADABLE`.
