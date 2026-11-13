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

PASS = no `MISMATCH`, no CII value changed that the receipt does not explain, CONTROL and the other sections unchanged (or changed only as the transferred fields explain), and every rebuilt element block explained.

## How the converter treats each field (3D_Converters main f10fd42fa, run without staged JSON or line list)

| PSI116 field | CII place | Note |
|---|---|---|
| Node/NodeName | NODENAME of the elements at that node | 25 characters kept |
| Node/Weight | RIGID of the element the node ends | Only RIGID ends. A weight on a 0-kg RIGID makes the converter split the flange from the RIGID (one extra element), reported under `structureChanges`. Some Rigid=2 nodes make the converter withhold the CII (`CII_WEIGHT_OWNER_UNRESOLVED`): BM2 8 of 54, EF-05 1 of 14 tried. |
| Node/OutsideDiameter, WallThickness (from end), InsulationThickness, CorrosionAllowance (to end) | ELEMENTS rows 1–2 | Wall also feeds REDUCERS. |
| Branch/Temperature/Temperature1..9, Pressure/Pressure1..9 | ELEMENTS rows 2–5 | −100000 (unset) is written as 0. |
| Branch/FluidDensity | ELEMENTS row 6 | kg/m³ → kg/cm³ (×1e-6). |
| Branch/MaterialNumber | MISCEL_1 material per element | Carries forward to following elements. |
| Branch/InsulationDensity | — | **Never carried**: the converter always resets it (its default when insulation ≥ 50 mm, else 0). |
| Nodes numbered 0 or below | — | Skipped by the converter in this run (no staged-JSON renumbering). |

**In the full app run** (line list and masters loaded), the converter's process step also overwrites P1, T1–T3, fluid density and material from the line list and masters. U3b on the app's own output is the next step (needs the Owner's staged JSON).

## Identity

Element ends come from the converter's own element list (`u3b_dump.py` runs the converter unchanged and saves which XML node is at each element end). A PSI116 node is matched by ComponentRefNo + Position + NodeNumber. Base and revised elements are lined up by (from node, to node, branch).

## Refusals

`U3B_OUTPUT_EXISTS`, `U3B_CONVERTER_MISSING`, `U3B_RECEIPT_INVALID`, `U3B_SHA256_MISMATCH` (receipt hashes differ from the XML files), `U3B_CONVERT_FAILED` (the converter refused a file; its last message is shown), `U3B_CII_UNREADABLE`.
