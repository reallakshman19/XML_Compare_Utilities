# U1 — PSI116 → UXML → PSI116 value write-back

`applyPsi116Edits(bytes, edits, {fileSha256})` in `engine/psi116-patchback.mjs` returns new bytes, the two SHA-256 hashes and exact original-byte spans. Original bytes are never modified. Refusals throw before any output is written. This prototype imports the base XML span kit and read-only PSI116 mapper; it does not change either.

Run inside this folder:

```
node --test
node bench/run.mjs
node cli.mjs fields
node cli.mjs apply in.psi116.xml edits.json out.xml
```

The CLI accepts a JSON array of edits (measures the input hash) or `{ "fileSha256": "<64 lowercase hex digits>", "edits": [...] }` (recommended for a saved edit plan). A ref contains `branchOrdinal`, `branchName`, `nodeOrdinal`, `nodeNumber`, `componentRefNo`; ordinals are zero-based, and `before` is the exact decoded, whitespace-trimmed kit text. `after` is a string or, for numeric fields, a finite number. Output is created exclusively; existing output is never replaced.

## U1_FIELDS

| PSI116 field | Code C category |
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

Code C uses `INSUL_DENSITY` in ProcessBlock even though PSI116 stores it on a branch. Categories describe the engineering family; they are not permission to use Code C's InputXML patcher. No fields here are unmapped.

## Refusals

- `U1_FILE_SHA256_MISMATCH`: supplied hash does not match the input.
- `U1_FIELD_NOT_SUPPORTED`: field outside the table or a text leaf contains markup.
- `U1_FIELD_ABSENT`: required tag absent or self-closing (cannot insert text without a structure change).
- `U1_STALE_BEFORE`: decoded current text differs from before.
- `U1_VALUE_INVALID`: invalid edit input, XML characters or non-finite/non-decimal numeric value.
- `U1_BRANCH_FIELD_SPLIT`: different after values for one branch field.
- `U1_CONFLICTING_EDITS`: different after values for one node field or overlapping spans.
- `U1_PARITY_FAILED`: exact XML value diff or UXML re-read failed.
- `U1_OUTPUT_EXISTS`: CLI output already exists (exclusive creation also guards races).
- `XML_REF_MISMATCH`, `XML_REF_NOT_FOUND` and other kit XML codes: missing/stale reference or unsafe input structure.

Unsupported: Branchname, NodeNumber, Endpoint, Rigid, ComponentType, ComponentRefNo, ConnectionType, Position, BendRadius, SIF, Restraint, BendType, AlphaAngle; all other tags, attributes, topology/structure, and inherited-value overrides. Branch edits affect the whole branch. Only NodeName, Weight, OutsideDiameter and WallThickness currently have semantic UXML parity fields; all eleven get exact XML-span and decoded re-read checks.
