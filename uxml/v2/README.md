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

## Step 2: revision diff and the review page (15 Nov 2026)
| File | What it does |
|---|---|
| `UxmlV2Diff.js` | `diffRevisions(before, after)`: every change between two revisions (value set, added or removed; lock and unlock; node added, split or removed) with its layer, stage, rule, source and lock. A `rev` stamp alone is not a change. `groupChanges` groups them by branch and node. |
| `UxmlV2Stages.js` | adds `runStages` (the registry in order, each result feeding the next) and an optional lock on the edit stage |
| `UxmlV2ReviewSession.js` | the page's revision list. Actions: repair, edit, split, undo, open a delta. Pure. |
| `review.html` + `UxmlV2ReviewPage.js` | the review page: open a PSI116 file or the GOLDEN-30 sample, make a change, compare any two revisions, and download the PSI116, the UXML or the delta. It runs in the browser and uploads nothing. |
| `UxmlV2SupportsReview.js` + `supports/SupportProvenanceRows.js` | section 4 of the review page: run the supports stage on a model (or the GOLDEN-30 sample) and list every support value and restraint with the step that set it, where it came from and the staged item it matched; staged supports that became no restraint and duplicate supports removed are shown; download as CSV. |

Check: `node --test tests/uxml-v2-review-diff.test.mjs` (8 tests). Four diff mutants are caught: ignoring locks, ignoring removals, calling a split an add, and dropping the source.

- **Undo is one level.** An undo is not undone again, because that would re-apply the step.
- **The CII check (run locally).** The edited PSI116 from step 1 was run through today's XML -> CII 2019 converter (3D_Converters `v045/converters/scripts/xml_to_cii2019_runtime_custody.py`). On GOLDEN-30, RMS-BLOW-1 and the two private benchmarks, the CII differs from the original only in the edited T1 tokens: 13, 40, 3 and 30 tokens. Line counts are unchanged.

## Step 3: the supports stage (in progress, 15 Nov 2026)
Goal: today's support rules (3D_Converters main f8622395, the live step-10 chain) as a pure UXML stage with no XML page. Oracle: `fixtures/uxml-v2-supports/` holds today's support table after each of its four sub-stages, on five public benchmarks.

| File | What it does |
|---|---|
| `supports/SupportTable.js` | `supportTableOf(doc)`: per node the support values and restraints, as text, in the oracle's shape |
| `supports/SupportView.js` | `viewOf(doc)`, `tableOfView`, `opsFromView(doc, view)`: the plain view the support rules work on, and the kernel ops that turn a document into it |
| `scripts/uxml-v2-supports-table.mjs` | the support table of a PSI116 file |
| `scripts/uxml-v2-supports-compare-tables.mjs`, `scripts/uxml-v2-supports-check-gate.mjs` | the gate: compare two tables node by node, then check the counts against `GATES.json` |

Check: `node --test tests/uxml-v2-supports.test.mjs`.
- The input tables equal today's on all 5 benchmarks.
- Today's whole final result goes through view -> ops -> kernel -> writer -> reader and passes the gate on all 5.
- The same holds on the two private benchmarks, run locally (counts only).

Decisions taken in step 3:
- **A restraint add or remove is on the `supports` layer** (step 1 counted it as topology). Node keys `DTXR_*` and `CMPSUPGAP*` are `supports` too. A supports stage still may not add, split or remove a node.
- **A restraint's direction frame can be set** with `{op: 'set', path: 'frame'}`, so a restraint that gains direction cosines states their frame (`CII_XYZ`, the frame of XML cosines).
- **The writer re-renders a file restraint whose field set changed** (a field added or removed) from its modelled values, with the record's own indentation. A restraint whose values only changed is still patched in place, and every other record stays byte for byte.
- **Inserts at one position keep their order** (several new restraints or values on one node). Step 1's writer reversed them.
- **Topology is not the supports stage's job.** Today's step-10 chain also drops gaskets, removes duplicate ATTA nodes and splits condensed valve/flange nodes. The gate sets those nodes aside, with exact counts per benchmark.
