# UXML v2: kernel, PS116 reader and PS116 writer (UXML revamp step 1)

The Owner's direction (14 Nov 2026): XML -> UXML; staged JSON + UXML -> E1; E1 + 4 previews + weights -> E2; then UXML -> PS116 -> CII. The UXML format adds traceability and revision control, which UXML transfers need.

Step 1 builds the base that every later stage plugs into. The v1 reader (`../UxmlPsi116SchemaMapper.js`) is unchanged; it only gains the `parsePsi116Structure` export.

| File | What it does |
|---|---|
| `UxmlV2Kernel.js` | Pure-JS SHA-256, canonical JSON, entity hashes `h`, revision id, uids, `applyDelta`, `undoDelta`, `runStage` (locks, declared layers, provenance, determinism), `verifyDocument` |
| `UxmlV2Psi116Reader.js` | PSI116 text -> sealed revision 0. One pipeline per Branch, one component per Node, one restraint per Restraint. Every leaf element is a value `{v, text, src, rev}`. |
| `UxmlV2Psi116Writer.js` | UXML v2 -> PS116. Unchanged records are copied byte for byte, changed values are patched, and stage-made nodes are written from modelled values only. |
| `UxmlV2Stages.js` | Stage registry. It holds the `repair` placeholder (TOPOFIX_NOT_INTEGRATED) and two test-only stages: set one value, and split one node. |

Check: `node --test tests/uxml-v2-kernel-roundtrip.test.mjs` (GOLDEN-30 fixture).
Benchmarks (counts only): `node scripts/uxml-v2-roundtrip.mjs <label>=<file.xml> ...`

## Decisions taken in step 1 (where the schema note left a choice)
- **`rev` is a revision sequence number** (`revision.seq`: 0 for the read, +1 per stage), not the revision id. The id is the hash of a document that contains every `rev`, so using the id would be circular.
- **No `createdAt`.** Stages are pure and the revision carries no clock. The same inputs, settings and rules always give the same id.
- **`custody` holds the source text and byte spans.** It keeps the text around and inside every record, and the value spans. Entities keep only `xref.psi116.recordKey`. So a stage-made node can still use its source node as a template after that node is removed.
- **Every leaf inside a Branch is modelled.** Nested groups become dotted keys, such as `Temperature.Temperature1`, and repeats get `#2`. So there is no raw-only value that could conflict with a modelled one, and `PS116_WRITE_UNMODELLED_CONFLICT` is not needed. The header (Units, project fields) stays as passthrough text.
- **Layers come from the tag name** (`layerOf`). Restraint values are `supports`. Add, remove and split count as `topology`.
- **Ops supported:** set, add, split, remove, lock, unlock. `merge` is refused (`UXML_DELTA_OP_UNSUPPORTED`) until a stage needs it. Adding or removing whole pipelines is refused too.
- **Undo is a new revision** (stage `undo`, parent = the undone revision) whose content equals the base again. A uid removed and then restored by undo is the only allowed re-use.
- **Only `uxml-topology-v2` documents are accepted here.** The v1 gate (`UxmlValidationGate.js`) is unchanged; the two are joined when a v2 document must pass through v1 tools.
- **Writer placement:** a new value goes just before the record's close tag, and new restraints are appended after the existing ones. The CII route reads by tag name, so order inside a record does not change it.

## Step 1 results (15 Nov 2026)
PSI116 -> UXML v2 -> PS116 on GOLDEN-30, RMS-BLOW-1 and two private benchmarks (run locally, counts only):
- byte-identical output;
- the same revision id when the file is read twice;
- a T1 edit changes exactly 1 field after re-reading;
- a node split adds exactly 1 node and keeps every other uid.

Three writer mutants are caught by the tests: ignoring changed values, ignoring the template, and keeping removed restraints.
